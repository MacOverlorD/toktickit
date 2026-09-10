import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient, TicketStatus, UserRole } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'
import { provisionInitialPasswords } from '../../prisma/provision-initial-passwords-data.js'
import {
  requesterSeeds,
  seedDatabase,
  staffSeeds,
} from '../../prisma/seed-data.js'
import prisma from '../../src/prisma.js'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migrationFiles = [
  '20260811033003_add_category',
  '20260901111953_lab2_data_foundation',
  '20260901122500_normalize_requester_email',
  '20260911000100_lab3_user_data_foundation',
  '20260911000200_lab3_stable_seed_identity',
].map((name) => path.join(serverRoot, 'prisma', 'migrations', name, 'migration.sql'))

function schemaUrl(schema: string) {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) throw new Error('DATABASE_URL is required for migration tests.')
  const url = new URL(baseUrl)
  url.searchParams.set('schema', schema)
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
      `Migration ${path.basename(path.dirname(migrationFile))} failed:\n${result.stdout}\n${result.stderr}`,
    )
  }
}

async function withTemporarySchema(
  prefix: string,
  callback: (client: PrismaClient, databaseUrl: string, schema: string) => Promise<void>,
) {
  const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  const databaseUrl = schemaUrl(schema)
  const client = new PrismaClient({ datasourceUrl: databaseUrl })

  try {
    await callback(client, databaseUrl, schema)
  } finally {
    await client.$disconnect()
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  }
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Lab 3 migration and repeatable data setup', () => {
  it('migrates a populated Lab 2 schema without changing identities or relationships', async () => {
    await withTemporarySchema('lab3_populated', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles.slice(0, 3)) {
        executeMigration(databaseUrl, migration)
      }

      await client.$executeRawUnsafe(
        `INSERT INTO "Category" ("id", "name", "displayOrder") VALUES (11, 'Hardware', 2)`,
      )
      await client.$executeRawUnsafe(
        `INSERT INTO "RelatedSystem" ("id", "name", "displayOrder") VALUES (21, 'Corporate Laptop', 7)`,
      )
      await client.$executeRawUnsafe(
        `INSERT INTO "Requester" ("id", "name", "email") VALUES (101, 'Legacy Requester', 'anan.wong@example.test')`,
      )
      await client.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"Requester"', 'id'), 101, true)`,
      )
      await client.$executeRawUnsafe(`
        INSERT INTO "Ticket" (
          "id", "ticketNumber", "submissionKey", "requesterId", "categoryId",
          "relatedSystemId", "summary", "requestedPriority", "description"
        ) VALUES (
          201, 'TKT-20260910-00000001', '40000000-0000-4000-8000-000000000001',
          101, 11, 21, 'Legacy laptop cannot start', 'HIGH',
          'The existing laptop does not start after charging overnight.'
        )
      `)
      await client.$executeRawUnsafe(`
        INSERT INTO "Attachment" (
          "id", "ticketId", "originalName", "storedName", "mimeType", "sizeBytes",
          "uploadedByRequesterId", "removedAt", "removalReason", "removedByRequesterId"
        ) VALUES
          (301, 201, 'boot-error.png', 'legacy-active.png', 'image/png', 128, 101, NULL, NULL, NULL),
          (302, 201, 'old-log.pdf', 'legacy-removed.pdf', 'application/pdf', 256, 101,
           '2026-09-10T02:00:00Z', 'Superseded by a newer diagnostic log', 101)
      `)

      for (const migration of migrationFiles.slice(3)) executeMigration(databaseUrl, migration)

      const users = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT id, name, email, role, "passwordHash", "mustChangePassword", version FROM "User" WHERE id = 101',
      )
      const tickets = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT id, "requesterId", "ownerId", "categoryId", "relatedSystemId", "requestedPriority", "itPriority", status, version FROM "Ticket" WHERE id = 201',
      )
      const attachments = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT id, "ticketId", "storedName", "uploadedByUserId", "removedByUserId", "removalReason" FROM "Attachment" ORDER BY id',
      )
      const oldTable = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'Requester'`,
      )
      const nextUser = await client.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO "User" (name, email) VALUES ('Next User', 'next.user@example.test') RETURNING id`,
      )

      expect(users).toEqual([
        expect.objectContaining({
          id: 101,
          name: 'Legacy Requester',
          email: 'anan.wong@example.test',
          role: 'REQUESTER',
          passwordHash: null,
          mustChangePassword: true,
          version: 1,
        }),
      ])
      expect(tickets).toEqual([
        expect.objectContaining({
          id: 201,
          requesterId: 101,
          ownerId: null,
          categoryId: 11,
          relatedSystemId: 21,
          requestedPriority: 'HIGH',
          itPriority: 'HIGH',
          status: 'NEW',
          version: 1,
        }),
      ])
      expect(attachments).toEqual([
        expect.objectContaining({
          id: 301,
          ticketId: 201,
          storedName: 'legacy-active.png',
          uploadedByUserId: 101,
          removedByUserId: null,
        }),
        expect.objectContaining({
          id: 302,
          ticketId: 201,
          storedName: 'legacy-removed.pdf',
          uploadedByUserId: 101,
          removedByUserId: 101,
          removalReason: 'Superseded by a newer diagnostic log',
        }),
      ])
      expect(oldTable[0]?.count).toBe(0n)
      expect(nextUser[0]?.id).toBe(102)

      await seedDatabase(client)
      await seedDatabase(client)
      const migratedFixture = await client.user.findUniqueOrThrow({
        where: { fixtureKey: requesterSeeds[0].fixtureKey },
      })
      const populatedSeedTickets = await client.ticket.count({
        where: { ticketNumber: { startsWith: 'TKT-20260911-' } },
      })
      expect(migratedFixture.id).toBe(101)
      expect(migratedFixture.name).toBe('Legacy Requester')
      expect(populatedSeedTickets).toBe(8)
    })
  }, 60_000)

  it('migrates a clean schema, seeds every workflow state, and remains repeatable', async () => {
    await withTemporarySchema('lab3_clean', async (client, databaseUrl) => {
      for (const migration of migrationFiles) executeMigration(databaseUrl, migration)

      await seedDatabase(client)
      const managedUser = await client.user.findUniqueOrThrow({
        where: { fixtureKey: requesterSeeds[0].fixtureKey },
      })
      await client.user.update({
        where: { id: managedUser.id },
        data: {
          name: 'Locally Edited Requester',
          email: 'locally.edited.requester@example.test',
          version: 7,
        },
      })
      await client.user.create({
        data: {
          name: 'Locally Managed Account',
          email: 'locally.managed@example.test',
          role: UserRole.REQUESTER,
        },
      })
      await client.user.update({
        where: { email: 'locally.managed@example.test' },
        data: { role: UserRole.IT_STAFF },
      })

      await seedDatabase(client)

      const [editedUser, originalEmailUser, localUser, users, tickets, comments, notes] =
        await Promise.all([
          client.user.findUniqueOrThrow({ where: { id: managedUser.id } }),
          client.user.findUnique({ where: { email: requesterSeeds[0].email } }),
          client.user.findUniqueOrThrow({ where: { email: 'locally.managed@example.test' } }),
          client.user.findMany(),
          client.ticket.findMany({
            where: { ticketNumber: { startsWith: 'TKT-20260911-' } },
          }),
          client.publicComment.count(),
          client.internalNote.count(),
        ])

      expect(editedUser).toMatchObject({
        id: managedUser.id,
        fixtureKey: requesterSeeds[0].fixtureKey,
        name: 'Locally Edited Requester',
        email: 'locally.edited.requester@example.test',
        version: 7,
      })
      expect(originalEmailUser).toBeNull()
      expect(
        users.filter(({ fixtureKey }) => fixtureKey === requesterSeeds[0].fixtureKey),
      ).toHaveLength(1)
      expect(localUser.role).toBe(UserRole.IT_STAFF)
      expect(tickets).toHaveLength(8)
      expect(new Set(tickets.map(({ status }) => status))).toEqual(
        new Set(Object.values(TicketStatus)),
      )
      expect(tickets.every((ticket) => ticket.itPriority === ticket.requestedPriority)).toBe(true)
      expect(comments).toBe(2)
      expect(notes).toBe(1)

      const activeRequesters = users.filter(
        (user) => user.role === UserRole.REQUESTER && user.isActive,
      )
      const inactiveRequesters = users.filter(
        (user) => user.role === UserRole.REQUESTER && !user.isActive,
      )
      const activeStaff = users.filter(
        (user) => user.role === UserRole.IT_STAFF && user.isActive,
      )
      const inactiveStaff = users.filter(
        (user) => user.role === UserRole.IT_STAFF && !user.isActive,
      )
      const activeAdmins = users.filter(
        (user) => user.role === UserRole.ADMINISTRATOR && user.isActive,
      )
      expect(activeRequesters.length).toBeGreaterThanOrEqual(4)
      expect(inactiveRequesters.length).toBeGreaterThanOrEqual(1)
      expect(activeStaff.length).toBeGreaterThanOrEqual(3)
      expect(inactiveStaff.length).toBeGreaterThanOrEqual(1)
      expect(activeAdmins.length).toBeGreaterThanOrEqual(1)

      const existingHash = 'existing-local-hash'
      await client.user.update({
        where: { fixtureKey: requesterSeeds[0].fixtureKey },
        data: { passwordHash: existingHash, mustChangePassword: false, version: 9 },
      })
      const firstProvisioned = await provisionInitialPasswords(
        client,
        'temporary-test-password',
        async (password) => `test-hash:${password}`,
      )
      const secondProvisioned = await provisionInitialPasswords(
        client,
        'temporary-test-password',
        async (password) => `test-hash:${password}`,
      )
      const preserved = await client.user.findUniqueOrThrow({
        where: { fixtureKey: requesterSeeds[0].fixtureKey },
      })
      const provisionedStaff = await client.user.findUniqueOrThrow({
        where: { fixtureKey: staffSeeds[0].fixtureKey },
      })

      expect(firstProvisioned).toBe(users.length - 1)
      expect(secondProvisioned).toBe(0)
      expect(preserved).toMatchObject({
        passwordHash: existingHash,
        mustChangePassword: false,
        version: 9,
      })
      expect(provisionedStaff).toMatchObject({
        passwordHash: 'test-hash:temporary-test-password',
        mustChangePassword: true,
      })
    })
  }, 60_000)

  it('rolls back every structural change when DDL fails after the table rename', async () => {
    await withTemporarySchema('lab3_atomic', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles.slice(0, 3)) {
        executeMigration(databaseUrl, migration)
      }
      await client.$executeRawUnsafe('CREATE SEQUENCE "User_id_seq"')

      expect(() => executeMigration(databaseUrl, migrationFiles[3])).toThrow(
        /User_id_seq.*already exists/,
      )

      const [tables, userRoleTypes, ticketStatuses] = await Promise.all([
        client.$queryRawUnsafe<Array<{ table_name: string }>>(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name IN ('Requester', 'User') ORDER BY table_name`,
        ),
        client.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM pg_type type JOIN pg_namespace namespace ON namespace.oid = type.typnamespace WHERE namespace.nspname = '${schema}' AND type.typname = 'UserRole'`,
        ),
        client.$queryRawUnsafe<Array<{ enumlabel: string }>>(
          `SELECT enumlabel FROM pg_enum value JOIN pg_type type ON type.oid = value.enumtypid JOIN pg_namespace namespace ON namespace.oid = type.typnamespace WHERE namespace.nspname = '${schema}' AND type.typname = 'TicketStatus' ORDER BY value.enumsortorder`,
        ),
      ])
      expect(tables).toEqual([{ table_name: 'Requester' }])
      expect(userRoleTypes[0]?.count).toBe(0n)
      expect(ticketStatuses.map(({ enumlabel }) => enumlabel)).toEqual(['NEW'])
    })
  }, 60_000)

  it('rejects a canonical legacy email that violates the complete Lab 3 policy', async () => {
    await withTemporarySchema('lab3_email_policy', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles.slice(0, 3)) {
        executeMigration(databaseUrl, migration)
      }
      await client.$executeRawUnsafe(
        `INSERT INTO "Requester" (name, email) VALUES ('Invalid Legacy Email', 'user@localhost')`,
      )

      expect(() => executeMigration(databaseUrl, migrationFiles[3])).toThrow(
        /email violates the Lab 3 policy/,
      )

      const tables = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name IN ('Requester', 'User') ORDER BY table_name`,
      )
      expect(tables).toEqual([{ table_name: 'Requester' }])
    })
  }, 60_000)

  it('stops before structural changes when legacy identity preflight fails', async () => {
    await withTemporarySchema('lab3_preflight', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles.slice(0, 3)) {
        executeMigration(databaseUrl, migration)
      }

      await client.$executeRawUnsafe(
        'ALTER TABLE "Requester" DROP CONSTRAINT "Requester_email_canonical_check"',
      )
      await client.$executeRawUnsafe(
        `INSERT INTO "Requester" (name, email) VALUES ('Unsafe Legacy User', 'Not.Canonical@Example.Test')`,
      )

      expect(() => executeMigration(databaseUrl, migrationFiles[3])).toThrow(
        /email preflight failed: non-canonical email exists/,
      )

      const tables = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name IN ('Requester', 'User') ORDER BY table_name`,
      )
      expect(tables).toEqual([{ table_name: 'Requester' }])
    })
  }, 60_000)
})
