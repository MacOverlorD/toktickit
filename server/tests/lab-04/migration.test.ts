import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ActionStatus, PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'
import { actionSeeds, seedDatabase } from '../../prisma/seed-data.js'
import prisma from '../../src/prisma.js'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migrationNames = [
  '20260811033003_add_category',
  '20260901111953_lab2_data_foundation',
  '20260901122500_normalize_requester_email',
  '20260911000100_lab3_user_data_foundation',
  '20260911000200_lab3_stable_seed_identity',
  '20260924090000_lab4_actions_data_foundation',
]
const migrationFiles = migrationNames.map((name) =>
  path.join(serverRoot, 'prisma', 'migrations', name, 'migration.sql'),
)

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
    { cwd: serverRoot, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`${path.basename(path.dirname(migrationFile))} failed:\n${result.stdout}\n${result.stderr}`)
  }
}

async function withTemporarySchema(
  prefix: string,
  callback: (client: PrismaClient, databaseUrl: string, schema: string) => Promise<void>,
) {
  const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`
  await prisma.$executeRawUnsafe(`CREATE SCHEMA ${schema}`)
  const databaseUrl = schemaUrl(schema)
  const client = new PrismaClient({ datasourceUrl: databaseUrl })
  try {
    await callback(client, databaseUrl, schema)
  } finally {
    await client.$disconnect()
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  }
}

afterAll(async () => prisma.$disconnect())

describe('Lab 4 Actions Taken data foundation', () => {
  it('migrates populated Lab 3 data without changing existing rows or inventing history', async () => {
    await withTemporarySchema('lab4_populated', async (client, databaseUrl) => {
      for (const migration of migrationFiles.slice(0, 5)) executeMigration(databaseUrl, migration)
      await client.$executeRawUnsafe(`INSERT INTO "Category" ("id","name","displayOrder") VALUES (1,'Hardware',1)`)
      await client.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("id","name","displayOrder") VALUES (1,'Laptop',1)`)
      await client.$executeRawUnsafe(`INSERT INTO "User" ("id","name","email","role","isActive") VALUES (1,'Legacy User','legacy@example.test','REQUESTER',true)`)
      await client.$executeRawUnsafe(`INSERT INTO "Ticket" ("id","ticketNumber","submissionKey","requesterId","categoryId","relatedSystemId","summary","requestedPriority","itPriority","description","status") VALUES (1,'TKT-20260924-ABCDEF01','50000000-0000-4000-8000-000000000001',1,1,1,'Preserve me','HIGH','HIGH','Existing Lab 3 ticket','RESOLVED')`)
      await client.$executeRawUnsafe(`INSERT INTO "PublicComment" ("ticketId","authorId","content") VALUES (1,1,'Preserve this comment')`)

      executeMigration(databaseUrl, migrationFiles[5]!)

      const [tickets, actions, comments] = await Promise.all([
        client.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT "id","requesterId","status","workCycle","resolvedAt" FROM "Ticket"'),
        client.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "ActionTaken"'),
        client.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "PublicComment"'),
      ])
      expect(tickets).toEqual([expect.objectContaining({ id: 1, requesterId: 1, status: 'RESOLVED', workCycle: 1, resolvedAt: null })])
      expect(actions[0]?.count).toBe(0n)
      expect(comments[0]?.count).toBe(1n)
    })
  }, 60_000)

  it('seeds zero, one, many, dashboard and prior-cycle fixtures idempotently', async () => {
    await withTemporarySchema('lab4_seed', async (client, databaseUrl) => {
      for (const migration of migrationFiles) executeMigration(databaseUrl, migration)
      await seedDatabase(client)
      const edited = await client.actionTaken.findUniqueOrThrow({ where: { fixtureKey: actionSeeds[0].fixtureKey } })
      await client.actionTaken.update({ where: { id: edited.id }, data: { description: 'Locally edited fixture description', version: 7 } })
      await seedDatabase(client)

      const [actions, zeroTicket, manyCount, reopened, dashboardTickets] = await Promise.all([
        client.actionTaken.findMany({ where: { fixtureKey: { not: null } } }),
        client.ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-20260911-00000001' }, include: { actions: true } }),
        client.actionTaken.count({ where: { ticket: { ticketNumber: 'TKT-20260911-00000003' } } }),
        client.ticket.findUniqueOrThrow({ where: { ticketNumber: 'TKT-20260924-00000012' }, include: { actions: true } }),
        client.ticket.count({ where: { ticketNumber: { startsWith: 'TKT-20260924-' } } }),
      ])
      expect(actions).toHaveLength(actionSeeds.length)
      expect(actions.find(({ id }) => id === edited.id)).toMatchObject({ description: 'Locally edited fixture description', version: 7 })
      expect(zeroTicket.actions).toHaveLength(0)
      expect(manyCount).toBe(2)
      expect(reopened.workCycle).toBe(2)
      expect(reopened.actions).toEqual([expect.objectContaining({ ticketWorkCycle: 1, status: ActionStatus.COMPLETED })])
      expect(dashboardTickets).toBe(4)
    })
  }, 60_000)

  it('rolls back all Lab 4 structural changes when its transaction fails', async () => {
    await withTemporarySchema('lab4_atomic', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles.slice(0, 5)) executeMigration(databaseUrl, migration)
      await client.$executeRawUnsafe(`CREATE TYPE "ActionStatus" AS ENUM ('BLOCKER')`)
      expect(() => executeMigration(databaseUrl, migrationFiles[5]!)).toThrow(/ActionStatus.*already exists/s)

      const [tables, columns, indexes] = await Promise.all([
        client.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='ActionTaken'`),
        client.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='Ticket' AND column_name IN ('workCycle','resolvedAt')`),
        client.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM pg_indexes WHERE schemaname='${schema}' AND indexname LIKE 'ActionTaken_%'`),
      ])
      expect(tables[0]?.count).toBe(0n)
      expect(columns[0]?.count).toBe(0n)
      expect(indexes[0]?.count).toBe(0n)
    })
  }, 60_000)

  it('creates the contracted indexes and rejects invalid or destructive data', async () => {
    await withTemporarySchema('lab4_constraints', async (client, databaseUrl, schema) => {
      for (const migration of migrationFiles) executeMigration(databaseUrl, migration)
      await seedDatabase(client)

      const indexes = await client.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(
        `SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='${schema}' AND (indexname LIKE 'ActionTaken_%' OR indexname IN ('Ticket_requesterId_status_resolvedAt_id_idx','Ticket_status_ownerId_updatedAt_id_idx')) ORDER BY indexname`,
      )
      expect(indexes.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
        'ActionTaken_ticketId_ticketWorkCycle_createdAt_id_idx',
        'ActionTaken_assignedToId_status_updatedAt_id_idx',
        'ActionTaken_performedById_completedAt_id_idx',
        'Ticket_requesterId_status_resolvedAt_id_idx',
        'Ticket_status_ownerId_updatedAt_id_idx',
      ]))

      const ticket = await client.ticket.findFirstOrThrow()
      const staff = await client.user.findFirstOrThrow({ where: { role: 'IT_STAFF', isActive: true } })
      await expect(client.$executeRawUnsafe(`INSERT INTO "ActionTaken" ("ticketId","ticketWorkCycle","description","createdById","followUpRequired","followUpNote","idempotencyKey","requestFingerprint") VALUES (${ticket.id},1,'Bad follow up',${staff.id},false,'must be null','60000000-0000-4000-8000-000000000001','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')`)).rejects.toThrow()
      await expect(client.user.delete({ where: { id: staff.id } })).rejects.toThrow()
    })
  }, 60_000)
})
