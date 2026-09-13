import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { createTestSession, type TestSession } from '../helpers/auth-session.js'

const marker = randomUUID().slice(0, 8)
const sessions: TestSession[] = []
let requesterId: number
let staffId: number
let adminId: number
let categoryId: number
let systemId: number
const numbers = [1, 2, 3].map(index => `TKT-20990202-${marker.slice(0, 6).toUpperCase()}${index.toString().padStart(2, '0')}`)

function queue(session?: TestSession, query = '') {
  const call = request(app).get('/api/staff/tickets' + query)
  return session ? call.set(session.headers) : call
}

beforeAll(async () => {
  const [category, system] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } }),
  ])
  categoryId = category.id
  systemId = system.id
  const [requesterUser, staff, admin] = await Promise.all([
    prisma.user.create({ data: { name: `Queue Requester ${marker}`, email: `queue-requester-${marker}@example.test`, role: 'REQUESTER' } }),
    prisma.user.create({ data: { name: `Queue Staff ${marker}`, email: `queue-staff-${marker}@example.test`, role: 'IT_STAFF' } }),
    prisma.user.create({ data: { name: `Queue Admin ${marker}`, email: `queue-admin-${marker}@example.test`, role: 'ADMINISTRATOR' } }),
  ])
  requesterId = requesterUser.id
  staffId = staff.id
  adminId = admin.id
  for (const id of [requesterId, staffId, adminId]) sessions.push(await createTestSession(id))
  await prisma.ticket.createMany({ data: [
    { ticketNumber: numbers[0], submissionKey: randomUUID(), requesterId, ownerId: null, categoryId, relatedSystemId: systemId, summary: `Printer queue ${marker}`, requestedPriority: 'LOW', itPriority: 'URGENT', description: 'First searchable queue fixture.', status: 'NEW' },
    { ticketNumber: numbers[1], submissionKey: randomUUID(), requesterId, ownerId: staffId, categoryId, relatedSystemId: systemId, summary: `Laptop queue ${marker}`, requestedPriority: 'HIGH', itPriority: 'LOW', description: 'Second searchable queue fixture.', status: 'IN_PROGRESS' },
    { ticketNumber: numbers[2], submissionKey: randomUUID(), requesterId, ownerId: adminId, categoryId, relatedSystemId: systemId, summary: `Account queue ${marker}`, requestedPriority: 'MEDIUM', itPriority: 'HIGH', description: 'Third searchable queue fixture.', status: 'OPEN' },
  ] })
})

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { ticketNumber: { in: numbers } } })
  for (const session of sessions) await session.cleanup()
  await prisma.user.deleteMany({ where: { id: { in: [requesterId, staffId, adminId] } } })
  await prisma.$disconnect()
})

describe('Lab 3 Staff Ticket Queue', () => {
  it('allows operational roles and rejects anonymous and Requester access', async () => {
    expect((await queue()).status).toBe(401)
    expect((await queue(sessions[0])).status).toBe(403)
    expect((await queue(sessions[1], `?search=${marker}`)).status).toBe(200)
    expect((await queue(sessions[2], `?search=${marker}`)).status).toBe(200)
  })

  it('combines search, status, priority, reference, and owner filters', async () => {
    const response = await queue(sessions[1], `?search=Laptop%20queue&categoryId=${categoryId}&relatedSystemId=${systemId}&status=IN_PROGRESS&requestedPriority=HIGH&itPriority=LOW&ownerId=${staffId}`)
    expect(response.status).toBe(200)
    expect(response.body.items.map((item: { ticketNumber: string }) => item.ticketNumber)).toEqual([numbers[1]])
    const unassigned = await queue(sessions[1], `?search=${marker}&ownerId=unassigned`)
    expect(unassigned.body.items.map((item: { ticketNumber: string }) => item.ticketNumber)).toEqual([numbers[0]])
  })

  it('sorts priority by rank with a same-direction ID tie breaker', async () => {
    const response = await queue(sessions[1], `?search=${marker}&sortBy=itPriority&sortOrder=asc&pageSize=10`)
    expect(response.body.items.map((item: { itPriority: string }) => item.itPriority)).toEqual(['LOW', 'HIGH', 'URGENT'])
  })

  it('returns truthful pagination and normalized query data beyond the last page', async () => {
    const response = await queue(sessions[1], `?search=%20${marker}%20&page=2&pageSize=10`)
    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([])
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 3, totalPages: 1, hasPreviousPage: true, hasNextPage: false })
    expect(response.body.query.search).toBe(marker)
  })

  it.each(['?unknown=x', '?search=', '?status=UNKNOWN', '?page=0', '?page=1000001', '?pageSize=11', '?search=a&search=b'])(
    'rejects invalid query %s',
    async query => {
      const response = await queue(sessions[1], query)
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('INVALID_QUERY')
    },
  )

  it('returns active eligible owners and lets historical owner IDs match no tickets', async () => {
    const owners = await request(app).get('/api/staff/ticket-owners').set(sessions[1].headers)
    expect(owners.status).toBe(200)
    expect(owners.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: staffId, role: 'IT_STAFF' }),
      expect.objectContaining({ id: adminId, role: 'ADMINISTRATOR' }),
    ]))
    const historical = await queue(sessions[1], '?ownerId=2147483647')
    expect(historical.status).toBe(200)
    expect(historical.body.items).toEqual([])
  })
})
