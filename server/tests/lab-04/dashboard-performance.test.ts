import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { createTestSession, type TestSession } from '../helpers/auth-session.js'
import { actionSeeds } from '../../prisma/seed-data.js'

const isolatedSchema = process.env.TOKTICKIT_ISOLATED_TEST_SCHEMA
const databaseSchema = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).searchParams.get('schema')
  : null
if (!isolatedSchema || isolatedSchema !== databaseSchema) {
  throw new Error('Run this performance smoke through npm run test:performance:lab4 so it uses a fresh migrated and seeded schema.')
}

const marker = randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase()
const emailMarker = marker.toLowerCase()
const userIds: number[] = []
const ticketIds: number[] = []
const sessions: TestSession[] = []
let requesterSession: TestSession
let staffSession: TestSession

function ticketNumber(index: number) {
  return `TKT-20991231-${marker}${index.toString(16).toUpperCase().padStart(4, '0')}`
}

beforeAll(async () => {
  // Verify the controlled seed baseline before adding performance fixtures.
  expect(await prisma.ticket.count()).toBe(12)
  expect(await prisma.actionTaken.count()).toBe(actionSeeds.length)
  const [category, system] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } }),
  ])
  const [requester, staff] = await Promise.all([
    prisma.user.create({ data: { name: 'Performance Requester', email: `perf-requester-${emailMarker}@example.test` } }),
    prisma.user.create({ data: { name: 'Performance Staff', email: `perf-staff-${emailMarker}@example.test`, role: 'IT_STAFF' } }),
  ])
  userIds.push(requester.id, staff.id)
  requesterSession = await createTestSession(requester.id)
  staffSession = await createTestSession(staff.id)
  sessions.push(requesterSession, staffSession)

  const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
  for (let start = 1; start <= 1000; start += 250) {
    await prisma.ticket.createMany({
      data: Array.from({ length: 250 }, (_, offset) => {
        const index = start + offset
        return {
          ticketNumber: ticketNumber(index),
          submissionKey: randomUUID(),
          requesterId: requester.id,
          ownerId: index % 3 === 0 ? staff.id : null,
          categoryId: category.id,
          relatedSystemId: system.id,
          summary: `Performance Ticket ${index}`,
          requestedPriority: priorities[index % priorities.length],
          itPriority: priorities[index % priorities.length],
          description: 'Bounded dashboard performance fixture.',
          status: statuses[index % statuses.length],
          resolvedAt: ['RESOLVED', 'CLOSED'].includes(statuses[index % statuses.length])
            ? new Date(Date.now() - 24 * 60 * 60 * 1000)
            : null,
        }
      }),
    })
  }
  const tickets = await prisma.ticket.findMany({
    where: { requesterId: requester.id },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
  ticketIds.push(...tickets.map((ticket) => ticket.id))
  for (let start = 0; start < 5000; start += 250) {
    await prisma.actionTaken.createMany({
      data: Array.from({ length: 250 }, (_, offset) => {
        const index = start + offset
        const completed = index % 5 === 0
        const completedAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return {
          fixtureKey: `perf-${marker}-${index}`,
          ticketId: ticketIds[index % ticketIds.length],
          ticketWorkCycle: 1,
          status: completed ? 'COMPLETED' as const : 'PLANNED' as const,
          actionAt: completed ? completedAt : null,
          description: `Performance Action ${index}`,
          result: completed ? 'Completed performance fixture' : null,
          createdById: staff.id,
          performedById: completed ? staff.id : null,
          assignedToId: staff.id,
          idempotencyKey: randomUUID(),
          requestFingerprint: index.toString(16).padStart(64, '0'),
          completedAt: completed ? completedAt : null,
        }
      }),
    })
  }
  expect(await prisma.ticket.count()).toBe(1012)
  expect(await prisma.actionTaken.count()).toBe(5000 + actionSeeds.length)
}, 120_000)

afterAll(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } })
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } })
  await Promise.all(sessions.map((session) => session.cleanup()))
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.$disconnect()
}, 120_000)

async function p95(path: string, session: TestSession) {
  for (let index = 0; index < 5; index += 1) {
    expect((await request(app).get(path).set(session.headers)).status).toBe(200)
  }
  const samples: number[] = []
  for (let index = 0; index < 30; index += 1) {
    const started = performance.now()
    expect((await request(app).get(path).set(session.headers)).status).toBe(200)
    samples.push(performance.now() - started)
  }
  samples.sort((left, right) => left - right)
  return samples[Math.ceil(samples.length * 0.95) - 1]
}

describe('Lab 4 dashboard and list performance smoke', () => {
  it('keeps bounded dashboard and key list endpoints below the documented local p95 budget', async () => {
    const requesterP95 = await p95('/api/dashboard/requester', requesterSession)
    const operationsP95 = await p95('/api/dashboard/operations', staffSession)
    const myTicketsP95 = await p95('/api/tickets?page=1&pageSize=50', requesterSession)
    const staffQueueP95 = await p95('/api/staff/tickets?scope=active&page=1&pageSize=50', staffSession)
    console.info(`L4-PERF-001 requester_p95_ms=${requesterP95.toFixed(2)} operations_p95_ms=${operationsP95.toFixed(2)} my_tickets_p95_ms=${myTicketsP95.toFixed(2)} staff_queue_p95_ms=${staffQueueP95.toFixed(2)} fixture_tickets=1000 fixture_actions=5000 baseline_tickets=12 baseline_actions=${actionSeeds.length} total_tickets=1012 total_actions=${5000 + actionSeeds.length} samples=30 warmups=5`)
    expect(requesterP95).toBeLessThanOrEqual(500)
    expect(operationsP95).toBeLessThanOrEqual(500)
    expect(myTicketsP95).toBeLessThanOrEqual(500)
    expect(staffQueueP95).toBeLessThanOrEqual(500)
    const resultFile = process.env.TOKTICKIT_PERFORMANCE_RESULT_FILE
    if (resultFile) {
      await mkdir(dirname(resultFile), { recursive: true })
      await writeFile(resultFile, JSON.stringify({
        capturedAt: new Date().toISOString(),
        nodeVersion: process.version,
        baseline: { tickets: 12, actions: actionSeeds.length },
        fixtures: { tickets: 1000, actions: 5000 },
        total: { tickets: 1012, actions: 5000 + actionSeeds.length },
        warmups: 5,
        samples: 30,
        budgetMs: 500,
        p95Ms: { requester: requesterP95, operations: operationsP95, myTickets: myTicketsP95, staffQueue: staffQueueP95 },
      }, null, 2) + '\n')
    }
  }, 120_000)
})
