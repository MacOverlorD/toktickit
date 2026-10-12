import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Express } from 'express'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { seedDatabase } from '../../prisma/seed-data.js'
import { hashPassword } from '../../src/auth/password-hash.js'

const origin = 'http://localhost:5173'
const initialPassword = 'Initial password 2026!'
const replacementPassword = 'Private replacement 2026!'
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migrationFiles = [
  '20260811033003_add_category',
  '20260901111953_lab2_data_foundation',
  '20260901122500_normalize_requester_email',
  '20260911000100_lab3_user_data_foundation',
  '20260911000200_lab3_stable_seed_identity',
  '20260924090000_lab4_actions_data_foundation',
].map((name) => path.join(serverRoot, 'prisma', 'migrations', name, 'migration.sql'))

let app: Express
let database: PrismaClient
let adminDatabase: PrismaClient
let appDatabase: PrismaClient
let schema: string
let originalDatabaseUrl: string | undefined
let resetRateLimiter: () => void

function schemaUrl(databaseUrl: string, schemaName: string) {
  const url = new URL(databaseUrl)
  url.searchParams.set('schema', schemaName)
  return url.toString()
}

function executeMigration(databaseUrl: string, migrationFile: string) {
  const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js')
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'execute', '--file', migrationFile, '--schema', 'prisma/schema.prisma'],
    {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    },
  )
  if (result.status !== 0) {
    throw new Error(
      'Migration failed: ' + path.basename(migrationFile) + '\n' +
      result.stdout + '\n' + result.stderr,
    )
  }
}

async function signIn(
  agent: ReturnType<typeof request.agent>,
  email: string,
  password = initialPassword,
) {
  return agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('Content-Type', 'application/json')
    .send({ email, password })
}

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL
  if (!originalDatabaseUrl) throw new Error('DATABASE_URL is required.')

  schema = 'lab3_auth_' + randomUUID().replaceAll('-', '')
  adminDatabase = new PrismaClient({ datasourceUrl: originalDatabaseUrl })
  await adminDatabase.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"')
  const isolatedUrl = schemaUrl(originalDatabaseUrl, schema)
  for (const migration of migrationFiles) executeMigration(isolatedUrl, migration)

  database = new PrismaClient({ datasourceUrl: isolatedUrl })
  await seedDatabase(database)
  const encoded = await hashPassword(initialPassword)
  await database.user.updateMany({
    where: {
      email: {
        in: [
          'anan.wong@example.test',
          'mali.chaiyasit@example.test',
          'kanya.support@example.test',
          'admin@example.test',
          'former.requester@example.test',
        ],
      },
    },
    data: { passwordHash: encoded, mustChangePassword: true },
  })

  process.env.DATABASE_URL = isolatedUrl
  process.env.CLIENT_URL = origin
  process.env.NODE_ENV = 'test'
  const appModule = await import('../../src/app.js')
  const prismaModule = await import('../../src/prisma.js')
  const limiterModule = await import('../../src/auth/login-rate-limit.js')
  app = appModule.default
  appDatabase = prismaModule.default
  resetRateLimiter = () => limiterModule.loginRateLimiter.reset()
}, 60_000)

beforeEach(() => {
  resetRateLimiter()
})

afterAll(async () => {
  await appDatabase?.$disconnect()
  await database?.$disconnect()
  if (adminDatabase && schema) {
    await adminDatabase.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE')
  }
  await adminDatabase?.$disconnect()
  process.env.DATABASE_URL = originalDatabaseUrl
}, 60_000)

describe('Lab 3 authentication and authorization API', () => {
  it('creates a safe browser session and restores current user data', async () => {
    const agent = request.agent(app)
    const response = await signIn(agent, '  ANAN.WONG@EXAMPLE.TEST  ')

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['set-cookie']?.[0]).toMatch(
      /^toktickit\.sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax$/,
    )
    expect(response.body).toEqual({
      user: {
        id: expect.any(Number),
        name: 'Anan Wong',
        email: 'anan.wong@example.test',
        role: 'REQUESTER',
        isActive: true,
        mustChangePassword: true,
        version: expect.any(Number),
      },
      csrfToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: expect.any(String),
    })
    expect(JSON.stringify(response.body)).not.toMatch(
      /passwordHash|tokenHash|fixtureKey/,
    )

    const [current, parallel] = await Promise.all([
      agent.get('/api/auth/me'),
      agent.get('/api/auth/me'),
    ])
    expect(current.status).toBe(200)
    expect(parallel.status).toBe(200)
    expect(current.body.user.email).toBe('anan.wong@example.test')
  })

  it('uses a generic credential failure and rate-limits canonical email attempts', async () => {
    const inactive = await signIn(
      request.agent(app),
      'former.requester@example.test',
    )
    const unknown = await signIn(request.agent(app), 'unknown@example.test')
    const unprovisioned = await signIn(
      request.agent(app),
      'narin.suksan@example.test',
    )
    const wrong = await signIn(
      request.agent(app),
      'mali.chaiyasit@example.test',
      'Wrong password value 2026!',
    )

    expect(inactive.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(unprovisioned.status).toBe(401)
    expect(inactive.body).toEqual(unknown.body)
    expect(unknown.body).toEqual(unprovisioned.body)
    expect(unprovisioned.body).toEqual(wrong.body)

    const concurrentFailures = await Promise.all(
      Array.from({ length: 9 }, () =>
        signIn(
          request.agent(app),
          'unknown@example.test',
          'Wrong password value 2026!',
        ),
      ),
    )
    expect(concurrentFailures.every((response) => response.status === 401))
      .toBe(true)
    const limited = await signIn(
      request.agent(app),
      'UNKNOWN@example.test',
      'Wrong password value 2026!',
    )
    expect(limited.status).toBe(429)
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('requires a trusted Origin and JSON login body', async () => {
    const body = {
      email: 'anan.wong@example.test',
      password: initialPassword,
    }
    const missingOrigin = await request(app).post('/api/auth/login').send(body)
    const hostileOrigin = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send(body)
    const nonJson = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .type('form')
      .send(body)

    expect(missingOrigin.status).toBe(403)
    expect(hostileOrigin.status).toBe(403)
    expect(nonJson.status).toBe(415)
  })

  it('blocks anonymous and restricted sessions until password change rotates all sessions', async () => {
    expect((await request(app).get('/api/categories')).status).toBe(401)

    const first = request.agent(app)
    const second = request.agent(app)
    const firstLogin = await signIn(first, 'mali.chaiyasit@example.test')
    await signIn(second, 'mali.chaiyasit@example.test')

    const restricted = await first.get('/api/categories')
    expect(restricted.status).toBe(403)
    expect(restricted.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED')

    const noCsrf = await first
      .post('/api/auth/change-password')
      .set('Origin', origin)
      .send({
        currentPassword: initialPassword,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      })
    expect(noCsrf.status).toBe(403)

    const changed = await first
      .post('/api/auth/change-password')
      .set('Origin', origin)
      .set('X-CSRF-Token', firstLogin.body.csrfToken)
      .send({
        currentPassword: initialPassword,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      })
    expect(changed.status).toBe(200)
    expect(changed.body.user.mustChangePassword).toBe(false)
    expect((await first.get('/api/categories')).status).toBe(200)
    expect((await second.get('/api/auth/me')).status).toBe(401)
  })

  it('uses session identity and rejects role or development-header spoofing', async () => {
    const requester = request.agent(app)
    const loginResponse = await signIn(requester, 'anan.wong@example.test')
    const changed = await requester
      .post('/api/auth/change-password')
      .set('Origin', origin)
      .set('X-CSRF-Token', loginResponse.body.csrfToken)
      .send({
        currentPassword: initialPassword,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      })
    const other = await database.user.findUniqueOrThrow({
      where: { email: 'mali.chaiyasit@example.test' },
      select: { id: true },
    })
    const category = await database.category.findFirstOrThrow({
      where: { isActive: true },
      select: { id: true },
    })
    const system = await database.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      select: { id: true },
    })

    const created = await requester
      .post('/api/tickets')
      .set('Origin', origin)
      .set('X-CSRF-Token', changed.body.csrfToken)
      .set('X-Development-Requester-Id', String(other.id))
      .set('Idempotency-Key', randomUUID())
      .send({
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: 'Authenticated identity check',
        requestedPriority: 'MEDIUM',
        description: 'The server must ignore every client-selected identity value.',
      })
    expect(created.status).toBe(201)
    expect(created.body.data.requesterId).toBe(changed.body.user.id)

    const staff = request.agent(app)
    const staffLogin = await signIn(staff, 'kanya.support@example.test')
    const staffChanged = await staff
      .post('/api/auth/change-password')
      .set('Origin', origin)
      .set('X-CSRF-Token', staffLogin.body.csrfToken)
      .send({
        currentPassword: initialPassword,
        newPassword: 'Staff private password 2026!',
        confirmPassword: 'Staff private password 2026!',
      })
    expect(staffChanged.status).toBe(200)
    expect((await staff.get('/api/tickets')).status).toBe(403)
    expect((await staff.get('/api/categories')).status).toBe(200)
  })

  it('rejects existing sessions after requester active state or role changes', async () => {
    const encoded = await hashPassword(initialPassword)
    const inactiveUser = await database.user.create({
      data: {
        name: 'Deactivate During Session',
        email: `inactive-${randomUUID()}@example.test`,
        passwordHash: encoded,
        mustChangePassword: false,
      },
    })
    const changedRoleUser = await database.user.create({
      data: {
        name: 'Role Changes During Session',
        email: `role-${randomUUID()}@example.test`,
        passwordHash: encoded,
        mustChangePassword: false,
      },
    })

    try {
      const inactiveAgent = request.agent(app)
      const roleAgent = request.agent(app)
      const inactiveLogin = await signIn(inactiveAgent, inactiveUser.email)
      const roleLogin = await signIn(roleAgent, changedRoleUser.email)

      await database.user.update({
        where: { id: inactiveUser.id },
        data: { isActive: false },
      })
      await database.user.update({
        where: { id: changedRoleUser.id },
        data: { role: 'IT_STAFF' },
      })

      const inactiveMutation = await inactiveAgent
        .post('/api/tickets')
        .set('Origin', origin)
        .set('X-CSRF-Token', inactiveLogin.body.csrfToken)
      const changedRoleMutation = await roleAgent
        .post('/api/tickets')
        .set('Origin', origin)
        .set('X-CSRF-Token', roleLogin.body.csrfToken)

      expect(inactiveMutation.status).toBe(401)
      expect(inactiveMutation.body.error.code).toBe('UNAUTHENTICATED')
      expect(changedRoleMutation.status).toBe(403)
      expect(changedRoleMutation.body.error.code).toBe('FORBIDDEN')
    } finally {
      await database.session.deleteMany({
        where: { userId: { in: [inactiveUser.id, changedRoleUser.id] } },
      })
      await database.user.deleteMany({
        where: { id: { in: [inactiveUser.id, changedRoleUser.id] } },
      })
    }
  })

  it('returns only documented outcomes for concurrent password changes', async () => {
    const user = await database.user.create({
      data: {
        name: 'Concurrent Password User',
        email: `password-race-${randomUUID()}@example.test`,
        passwordHash: await hashPassword(initialPassword),
        mustChangePassword: true,
      },
    })

    try {
      const agent = request.agent(app)
      const loginResponse = await signIn(agent, user.email)
      const cookie = loginResponse.headers['set-cookie']?.[0].split(';')[0]
      const requestBody = {
        currentPassword: initialPassword,
        newPassword: 'Concurrent replacement password 2026!',
        confirmPassword: 'Concurrent replacement password 2026!',
      }
      const change = () =>
        request(app)
          .post('/api/auth/change-password')
          .set('Cookie', cookie)
          .set('Origin', origin)
          .set('X-CSRF-Token', loginResponse.body.csrfToken)
          .send(requestBody)

      const responses = await Promise.all([change(), change()])
      const statuses = responses.map((response) => response.status).sort()

      expect(statuses[0]).toBe(200)
      expect([401, 409]).toContain(statuses[1])
      expect(responses.every((response) => response.status !== 500)).toBe(true)
      expect(await database.session.count({ where: { userId: user.id } })).toBe(1)
    } finally {
      await database.session.deleteMany({ where: { userId: user.id } })
      await database.user.delete({ where: { id: user.id } })
    }
  })

  it('expires idle/absolute sessions and logout invalidates the server row', async () => {
    const idleAgent = request.agent(app)
    const idleLogin = await signIn(idleAgent, 'admin@example.test')
    const adminId = idleLogin.body.user.id as number
    await database.session.updateMany({
      where: { userId: adminId },
      data: { lastSeenAt: new Date(Date.now() - 31 * 60 * 1000) },
    })
    expect((await idleAgent.get('/api/auth/me')).status).toBe(401)

    const absoluteAgent = request.agent(app)
    await signIn(absoluteAgent, 'admin@example.test')
    await database.session.updateMany({
      where: { userId: adminId },
      data: { expiresAt: new Date(Date.now() - 1) },
    })
    expect((await absoluteAgent.get('/api/auth/me')).status).toBe(401)

    const agent = request.agent(app)
    const loginResponse = await signIn(agent, 'admin@example.test')
    const rejectedOrigin = await agent
      .post('/api/auth/logout')
      .set('Origin', 'https://attacker.example')
      .set('X-CSRF-Token', loginResponse.body.csrfToken)
    expect(rejectedOrigin.status).toBe(403)

    const logoutResponse = await agent
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('X-CSRF-Token', loginResponse.body.csrfToken)
    expect(logoutResponse.status).toBe(204)
    expect(logoutResponse.headers['set-cookie']?.[0]).toContain(
      'toktickit.sid=;',
    )
    expect((await agent.get('/api/auth/me')).status).toBe(401)

    const repeated = await agent
      .post('/api/auth/logout')
      .set('Origin', origin)
    expect(repeated.status).toBe(204)
  })
})
