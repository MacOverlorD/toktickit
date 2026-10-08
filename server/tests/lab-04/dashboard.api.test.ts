import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import {
  createTestSession,
  type TestSession,
} from '../helpers/auth-session.js'

const marker = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
const emailMarker = marker.toLowerCase()
const fixedAsOf = new Date('2026-10-08T12:00:00.000Z')
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
const userIds: number[] = []
const sessions: TestSession[] = []
let requesterId: number
let emptyRequesterId: number
let otherRequesterId: number
let staffId: number
let categoryId: number
let systemId: number

function numberFor(index: number) {
  return `TKT-20991008-${marker}${index.toString(16).toUpperCase().padStart(2, '0')}`
}

async function sessionFor(userId: number) {
  const session = await createTestSession(userId)
  sessions.push(session)
  return session
}

beforeAll(async () => {
  const [category, system] = await Promise.all([
    prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
    prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
  ])
  categoryId = category.id
  systemId = system.id

  const users = await Promise.all([
    prisma.user.create({
      data: { name: 'Dashboard Requester', email: `dash-${emailMarker}@example.test` },
    }),
    prisma.user.create({
      data: { name: 'Empty Dashboard Requester', email: `dash-empty-${emailMarker}@example.test` },
    }),
    prisma.user.create({
      data: { name: 'Other Dashboard Requester', email: `dash-other-${emailMarker}@example.test` },
    }),
    prisma.user.create({
      data: {
        name: 'Dashboard Staff',
        email: `dash-staff-${emailMarker}@example.test`,
        role: 'IT_STAFF',
      },
    }),
  ])
  ;[requesterId, emptyRequesterId, otherRequesterId, staffId] = users.map((user) => user.id)
  userIds.push(...users.map((user) => user.id))

  const tieTime = new Date(fixedAsOf.getTime() - 2 * 60 * 60 * 1000)
  for (let index = 1; index <= 12; index += 1) {
    await prisma.ticket.create({
      data: {
        ticketNumber: numberFor(index),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: `Recent dashboard ticket ${index}`,
        requestedPriority: index % 2 === 0 ? 'HIGH' : 'LOW',
        itPriority: index % 2 === 0 ? 'HIGH' : 'LOW',
        description: 'Requester dashboard list fixture',
        status: 'NEW',
        createdAt: tieTime,
        updatedAt: tieTime,
      },
    })
  }

  await prisma.ticket.createMany({
    data: [
      {
        ticketNumber: numberFor(13),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Waiting for requester response',
        requestedPriority: 'URGENT',
        itPriority: 'URGENT',
        description: 'Needs attention',
        status: 'WAITING_FOR_REQUESTER',
        updatedAt: new Date(fixedAsOf.getTime() - 60 * 60 * 1000),
      },
      {
        ticketNumber: numberFor(14),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Recently resolved work',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        description: 'Recent resolution',
        status: 'RESOLVED',
        resolvedAt: new Date(fixedAsOf.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(fixedAsOf.getTime() - 30 * 60 * 1000),
      },
      {
        ticketNumber: numberFor(15),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Old closed work',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        description: 'Outside recent resolution window',
        status: 'CLOSED',
        resolvedAt: new Date(fixedAsOf.getTime() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(fixedAsOf.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        ticketNumber: numberFor(16),
        submissionKey: randomUUID(),
        requesterId: otherRequesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Other requester secret',
        requestedPriority: 'URGENT',
        itPriority: 'URGENT',
        description: 'Must never be included',
        status: 'WAITING_FOR_REQUESTER',
      },
      {
        ticketNumber: numberFor(17),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Resolution exactly at seven-day boundary',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        description: 'Inclusive boundary fixture',
        status: 'RESOLVED',
        resolvedAt: new Date(fixedAsOf.getTime() - sevenDaysMs),
        updatedAt: new Date(fixedAsOf.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        ticketNumber: numberFor(18),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Resolution one millisecond before window',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        description: 'Excluded lower boundary fixture',
        status: 'RESOLVED',
        resolvedAt: new Date(fixedAsOf.getTime() - sevenDaysMs - 1),
        updatedAt: new Date(fixedAsOf.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        ticketNumber: numberFor(19),
        submissionKey: randomUUID(),
        requesterId,
        categoryId,
        relatedSystemId: systemId,
        summary: 'Resolution one millisecond after asOf',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        description: 'Excluded upper boundary fixture',
        status: 'RESOLVED',
        resolvedAt: new Date(fixedAsOf.getTime() + 1),
        updatedAt: new Date(fixedAsOf.getTime() - 3 * 60 * 60 * 1000),
      },
    ],
  })
})

afterAll(async () => {
  await Promise.all(sessions.map((session) => session.cleanup()))
  if (userIds.length > 0) {
    await prisma.ticket.deleteMany({ where: { requesterId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  await prisma.$disconnect()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Issue 59 requester dashboard API', () => {
  it('calculates owned counts and bounded lists from one authoritative asOf', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(fixedAsOf)
    const session = await sessionFor(requesterId)
    const response = await request(app)
      .get('/api/dashboard/requester')
      .set(session.headers)
    vi.useRealTimers()

    expect(response.status).toBe(200)
    expect(Object.keys(response.body).sort()).toEqual([
      'asOf',
      'attentionTickets',
      'counts',
      'drillDown',
      'recentTickets',
    ])
    const asOf = new Date(response.body.asOf)
    expect(Number.isNaN(asOf.getTime())).toBe(false)
    expect(response.body.counts).toEqual({
      open: 13,
      waitingForRequester: 1,
      recentlyResolved: 2,
    })
    expect(response.body.recentTickets).toHaveLength(10)
    expect(Object.keys(response.body.recentTickets[0]).sort()).toEqual([
      'requestedPriority',
      'status',
      'summary',
      'ticketNumber',
      'updatedAt',
    ])
    expect(response.body.attentionTickets).toEqual([
      expect.objectContaining({
        ticketNumber: numberFor(13),
        status: 'WAITING_FOR_REQUESTER',
      }),
    ])
    expect(JSON.stringify(response.body)).not.toContain('Other requester secret')

    const directRecent = await prisma.ticket.findMany({
      where: { requesterId, updatedAt: { lte: asOf } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { ticketNumber: true },
    })
    expect(response.body.recentTickets.map((ticket: { ticketNumber: string }) => ticket.ticketNumber))
      .toEqual(directRecent.map((ticket) => ticket.ticketNumber))
    expect(response.body.drillDown).toEqual({
      open: '/tickets?scope=open',
      waitingForRequester: '/tickets?status=WAITING_FOR_REQUESTER',
      recentlyResolved: `/tickets?scope=recently-resolved&asOf=${encodeURIComponent(response.body.asOf)}`,
    })
  })

  it('returns a successful explicit zero state for an account with no tickets', async () => {
    const session = await sessionFor(emptyRequesterId)
    const response = await request(app)
      .get('/api/dashboard/requester')
      .set(session.headers)

    expect(response.status).toBe(200)
    expect(response.body.counts).toEqual({
      open: 0,
      waitingForRequester: 0,
      recentlyResolved: 0,
    })
    expect(response.body.recentTickets).toEqual([])
    expect(response.body.attentionTickets).toEqual([])
  })

  it('keeps dashboard drill-down filters owner-scoped and formula-equivalent', async () => {
    const session = await sessionFor(requesterId)
    const [open, waiting, recentlyResolved, invalidCombination] = await Promise.all([
      request(app)
        .get('/api/tickets')
        .query({ scope: 'open' })
        .set(session.headers),
      request(app)
        .get('/api/tickets')
        .query({ status: 'WAITING_FOR_REQUESTER' })
        .set(session.headers),
      request(app)
        .get('/api/tickets')
        .query({ scope: 'recently-resolved', asOf: fixedAsOf.toISOString() })
        .set(session.headers),
      request(app)
        .get('/api/tickets')
        .query({ scope: 'open', status: 'NEW' })
        .set(session.headers),
    ])

    expect(open.status).toBe(200)
    expect(open.body.pagination.totalItems).toBe(13)
    expect(waiting.status).toBe(200)
    expect(waiting.body.pagination.totalItems).toBe(1)
    expect(waiting.body.items[0].ticketNumber).toBe(numberFor(13))
    expect(recentlyResolved.status).toBe(200)
    expect(recentlyResolved.body.pagination.totalItems).toBe(2)
    expect(recentlyResolved.body.items.map((ticket: { ticketNumber: string }) => ticket.ticketNumber))
      .toEqual(expect.arrayContaining([numberFor(14), numberFor(17)]))
    expect(JSON.stringify([open.body, waiting.body, recentlyResolved.body]))
      .not.toContain('Other requester secret')
    expect(invalidCombination.status).toBe(400)
    expect(invalidCombination.body.error.code).toBe('INVALID_QUERY')
  })

  it('rejects non-requester roles and client-supplied identity', async () => {
    const [staffSession, requesterSession] = await Promise.all([
      sessionFor(staffId),
      sessionFor(requesterId),
    ])
    const forbidden = await request(app)
      .get('/api/dashboard/requester')
      .set(staffSession.headers)
    const injected = await request(app)
      .get('/api/dashboard/requester')
      .query({ userId: otherRequesterId })
      .set(requesterSession.headers)
    const bodyInjected = await request(app)
      .get('/api/dashboard/requester')
      .send({ userId: otherRequesterId })
      .set(requesterSession.headers)

    expect(forbidden.status).toBe(403)
    expect(forbidden.body.error.code).toBe('FORBIDDEN')
    expect(injected.status).toBe(400)
    expect(injected.body).toEqual({
      error: {
        code: 'INVALID_QUERY',
        message: 'The requester dashboard does not accept request input.',
      },
    })
    expect(bodyInjected.status).toBe(400)
    expect(bodyInjected.body.error.code).toBe('INVALID_QUERY')
  })

  it('requires authentication', async () => {
    const response = await request(app).get('/api/dashboard/requester')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHENTICATED')
  })
})
