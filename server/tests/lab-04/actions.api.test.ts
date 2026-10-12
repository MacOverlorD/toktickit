import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { createTestSession, type TestSession } from '../helpers/auth-session.js'

const marker = randomUUID().slice(0, 8).toUpperCase()
const ticketNumber = `TKT-20990403-${marker}`
const otherTicketNumber = `TKT-20990404-${marker}`
let requesterId: number
let otherRequesterId: number
let staffId: number
let adminId: number
let inactiveStaffId: number
let ticketId: number
let otherTicketId: number
const sessions: TestSession[] = []

function api(
  session: TestSession,
  method: 'get' | 'post' | 'patch',
  path: string,
  body?: unknown,
  idempotencyKey?: string,
) {
  let call = request(app)[method](path).set(session.headers)
  if (idempotencyKey) call = call.set('Idempotency-Key', idempotencyKey)
  return body === undefined ? call : call.send(body)
}

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    actionAt: null,
    description: 'Inspect the affected service',
    result: null,
    assignedToUserId: null,
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    ...overrides,
  }
}

beforeAll(async () => {
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } })
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } })
  const users = await Promise.all(
    [
      ['Action Requester', 'REQUESTER', true],
      ['Other Action Requester', 'REQUESTER', true],
      ['Action Staff', 'IT_STAFF', true],
      ['Action Admin', 'ADMINISTRATOR', true],
      ['Inactive Action Staff', 'IT_STAFF', false],
    ].map(([name, role, isActive], index) =>
      prisma.user.create({
        data: {
          name: `${name} ${marker}`,
          email: `action-${index}-${marker.toLowerCase()}@example.test`,
          role: role as any,
          isActive: Boolean(isActive),
        },
      }),
    ),
  )
  ;[requesterId, otherRequesterId, staffId, adminId, inactiveStaffId] = users.map(({ id }) => id)
  for (const id of [requesterId, otherRequesterId, staffId, adminId])
    sessions.push(await createTestSession(id))

  const [ticket, otherTicket] = await Promise.all([
    prisma.ticket.create({
      data: {
        ticketNumber,
        submissionKey: randomUUID(),
        requesterId,
        ownerId: staffId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: 'Action API fixture',
        requestedPriority: 'HIGH',
        itPriority: 'HIGH',
        description: 'Exercise the complete Action lifecycle.',
        status: 'IN_PROGRESS',
      },
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: otherTicketNumber,
        submissionKey: randomUUID(),
        requesterId: otherRequesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: 'Other requester fixture',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        description: 'Used for ownership and nesting checks.',
        status: 'OPEN',
      },
    }),
  ])
  ticketId = ticket.id
  otherTicketId = otherTicket.id
})

beforeEach(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: [ticketId, otherTicketId] } } })
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'IN_PROGRESS', workCycle: 1, ownerId: staffId },
  })
})

afterAll(async () => {
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: [ticketId, otherTicketId] } } })
  await prisma.ticket.deleteMany({ where: { id: { in: [ticketId, otherTicketId] } } })
  for (const session of sessions) await session.cleanup()
  await prisma.user.deleteMany({
    where: { id: { in: [requesterId, otherRequesterId, staffId, adminId, inactiveStaffId] } },
  })
  await prisma.$disconnect()
})

describe('Lab 4 Actions Taken API', () => {
  it('enforces authentication, mutation roles, ownership, nesting and role-safe projections', async () => {
    expect((await request(app).get(`/api/tickets/${ticketNumber}/actions`)).status).toBe(401)
    expect((await api(sessions[1], 'get', `/api/tickets/${ticketNumber}/actions`)).status).toBe(404)
    expect(
      (await api(sessions[0], 'post', `/api/staff/tickets/TKT-20990101-FFFFFFFF/actions`, createBody(), randomUUID())).status,
    ).toBe(403)

    const created = await api(
      sessions[2],
      'post',
      `/api/staff/tickets/${ticketNumber}/actions`,
      createBody({ assignedToUserId: adminId }),
      randomUUID(),
    )
    expect(created.status).toBe(201)
    const actionId = created.body.item.id

    const requesterList = await api(sessions[0], 'get', `/api/tickets/${ticketNumber}/actions`)
    expect(requesterList.status).toBe(200)
    expect(requesterList.body.items).toEqual([
      expect.objectContaining({
        id: actionId,
        createdBy: { name: expect.stringContaining('Action Staff') },
        performedBy: null,
      }),
    ])
    expect(requesterList.body.items[0]).not.toHaveProperty('version')
    expect(requesterList.body.items[0]).not.toHaveProperty('assignedTo')
    expect(requesterList.body.items[0]).not.toHaveProperty('ticketWorkCycle')
    expect(JSON.stringify(requesterList.body)).not.toMatch(/idempotency|fingerprint|password|session|csrf/i)

    const operational = await api(sessions[3], 'get', `/api/tickets/${ticketNumber}/actions/${actionId}`)
    expect(operational.body.item).toEqual(
      expect.objectContaining({
        ticketNumber,
        ticketWorkCycle: 1,
        version: 1,
        assignedTo: expect.objectContaining({ id: adminId, role: 'ADMINISTRATOR' }),
      }),
    )
    expect((await api(sessions[3], 'get', `/api/tickets/${otherTicketNumber}/actions/${actionId}`)).status).toBe(404)
    expect((await api(sessions[0], 'get', `/api/tickets/${ticketNumber}/actions?limit=1`)).body.error.code).toBe('INVALID_QUERY')

    await prisma.ticket.update({ where: { id: ticketId }, data: { ownerId: null } })
    expect((await api(sessions[2], 'get', `/api/tickets/${ticketNumber}/actions`)).status).toBe(200)
    await prisma.ticket.update({ where: { id: ticketId }, data: { ownerId: adminId, status: 'RESOLVED' } })
    expect((await api(sessions[2], 'get', `/api/tickets/${ticketNumber}/actions`)).status).toBe(200)
    expect((await api(sessions[0], 'get', `/api/tickets/${ticketNumber}/actions`)).status).toBe(200)
  })

  it('creates idempotently, orders newest first and rejects key reuse or ineligible assignees', async () => {
    const key = randomUUID()
    const body = createBody({ description: '  Canonical action  ', assignedToUserId: adminId })
    const first = await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions`, body, key)
    expect(first.status).toBe(201)
    expect(first.body.item).toEqual(expect.objectContaining({ description: 'Canonical action', status: 'PLANNED', version: 1 }))
    const replay = await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions`, body, key.toUpperCase())
    expect(replay.status).toBe(200)
    expect(replay.body.item.id).toBe(first.body.item.id)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)

    const mismatch = await api(
      sessions[2],
      'post',
      `/api/staff/tickets/${ticketNumber}/actions`,
      createBody({ description: 'Different payload' }),
      key,
    )
    expect(mismatch.status).toBe(409)
    expect(mismatch.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED')

    for (const assignedToUserId of [inactiveStaffId, requesterId]) {
      const rejected = await api(
        sessions[2],
        'post',
        `/api/staff/tickets/${ticketNumber}/actions`,
        createBody({ assignedToUserId }),
        randomUUID(),
      )
      expect(rejected.status).toBe(409)
      expect(rejected.body.error.code).toBe('INELIGIBLE_ASSIGNEE')
    }
    expect(
      (
        await api(
          sessions[2],
          'post',
          `/api/staff/tickets/${ticketNumber}/actions`,
          { ...createBody(), performedById: staffId },
          randomUUID(),
        )
      ).status,
    ).toBe(400)

    const second = await api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions`, createBody(), key)
    expect(second.status).toBe(201)
    const list = await api(sessions[2], 'get', `/api/tickets/${ticketNumber}/actions`)
    expect(list.body.items.map(({ id }: { id: number }) => id)).toEqual([second.body.item.id, first.body.item.id])
  })

  it('supports edit, assignment no-op, start and completion with distinct audit actors', async () => {
    const created = await api(
      sessions[2],
      'post',
      `/api/staff/tickets/${ticketNumber}/actions`,
      createBody({ followUpRequired: true, followUpNote: 'Call tomorrow' }),
      randomUUID(),
    )
    const id = created.body.item.id
    const edited = await api(sessions[2], 'patch', `/api/staff/tickets/${ticketNumber}/actions/${id}`, {
      description: 'Updated diagnostic work',
      followUpRequired: false,
      expectedVersion: 1,
    })
    expect(edited.body.item).toEqual(
      expect.objectContaining({
        description: 'Updated diagnostic work',
        followUpRequired: false,
        followUpNote: null,
        version: 2,
      }),
    )

    const assigned = await api(sessions[2], 'patch', `/api/staff/tickets/${ticketNumber}/actions/${id}/assignment`, {
      assignedToUserId: adminId,
      expectedVersion: 2,
    })
    expect(assigned.body.item).toEqual(expect.objectContaining({ version: 3, assignedTo: expect.objectContaining({ id: adminId }) }))
    const noOp = await api(sessions[2], 'patch', `/api/staff/tickets/${ticketNumber}/actions/${id}/assignment`, {
      assignedToUserId: adminId,
      expectedVersion: 3,
    })
    expect(noOp.body.item.version).toBe(3)

    const started = await api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions/${id}/start`, { expectedVersion: 3 })
    expect(started.body.item).toEqual(expect.objectContaining({ status: 'IN_PROGRESS', version: 4 }))
    const completed = await api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions/${id}/complete`, {
      expectedVersion: 4,
      result: 'Service restored',
    })
    expect(completed.body.item).toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        result: 'Service restored',
        version: 5,
        createdBy: expect.objectContaining({ id: staffId }),
        performedBy: expect.objectContaining({ id: adminId }),
        assignedTo: expect.objectContaining({ id: adminId }),
        completedAt: expect.any(String),
        actionAt: expect.any(String),
      }),
    )
    const terminalEdit = await api(sessions[2], 'patch', `/api/staff/tickets/${ticketNumber}/actions/${id}`, {
      description: 'Not allowed',
      expectedVersion: 5,
    })
    expect(terminalEdit.status).toBe(409)
    expect(terminalEdit.body.error.code).toBe('ACTION_NOT_EDITABLE')
  })

  it('rejects stale writes and permits exactly one simultaneous terminal transition', async () => {
    const created = await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions`, createBody(), randomUUID())
    const id = created.body.item.id
    const stale = await api(sessions[2], 'patch', `/api/staff/tickets/${ticketNumber}/actions/${id}`, {
      description: 'Stale update',
      expectedVersion: 9,
    })
    expect(stale.status).toBe(409)
    expect(stale.body.error.code).toBe('STALE_RESOURCE')

    const [complete, cancel] = await Promise.all([
      api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${id}/complete`, {
        expectedVersion: 1,
        result: 'Finished concurrently',
      }),
      api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions/${id}/cancel`, { expectedVersion: 1 }),
    ])
    expect([complete.status, cancel.status].sort()).toEqual([200, 409])
    const stored = await prisma.actionTaken.findUniqueOrThrow({ where: { id } })
    expect(['COMPLETED', 'CANCELLED']).toContain(stored.status)
    expect(stored.version).toBe(2)

    const another = await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions`, createBody(), randomUUID())
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'RESOLVED' } })
    const inactiveTicket = await api(
      sessions[2],
      'post',
      `/api/staff/tickets/${ticketNumber}/actions/${another.body.item.id}/start`,
      { expectedVersion: 1 },
    )
    expect(inactiveTicket.body.error.code).toBe('ACTION_NOT_EDITABLE')
  })

  it('permits every lifecycle edge and rejects repeated or terminal commands', async () => {
    const create = async () =>
      api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions`, createBody(), randomUUID())

    const plannedComplete = await create()
    expect(
      (
        await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${plannedComplete.body.item.id}/complete`, {
          expectedVersion: 1,
          result: 'Completed directly',
        })
      ).body.item.status,
    ).toBe('COMPLETED')

    const plannedCancel = await create()
    expect(
      (
        await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${plannedCancel.body.item.id}/cancel`, {
          expectedVersion: 1,
        })
      ).body.item.status,
    ).toBe('CANCELLED')

    const progressingComplete = await create()
    await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${progressingComplete.body.item.id}/start`, {
      expectedVersion: 1,
    })
    const repeatedStart = await api(
      sessions[2],
      'post',
      `/api/staff/tickets/${ticketNumber}/actions/${progressingComplete.body.item.id}/start`,
      { expectedVersion: 2 },
    )
    expect(repeatedStart.body.error.code).toBe('INVALID_ACTION_TRANSITION')
    expect(
      (
        await api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions/${progressingComplete.body.item.id}/complete`, {
          expectedVersion: 2,
          result: 'Completed after start',
        })
      ).body.item.status,
    ).toBe('COMPLETED')

    const progressingCancel = await create()
    await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${progressingCancel.body.item.id}/start`, {
      expectedVersion: 1,
    })
    expect(
      (
        await api(sessions[3], 'post', `/api/staff/tickets/${ticketNumber}/actions/${progressingCancel.body.item.id}/cancel`, {
          expectedVersion: 2,
        })
      ).body.item.status,
    ).toBe('CANCELLED')

    for (const id of [plannedComplete.body.item.id, plannedCancel.body.item.id]) {
      const terminal = await api(sessions[2], 'post', `/api/staff/tickets/${ticketNumber}/actions/${id}/cancel`, {
        expectedVersion: 2,
      })
      expect(terminal.body.error.code).toBe('ACTION_NOT_EDITABLE')
    }
  })

  it('rejects unsupported media types without exposing internal details', async () => {
    const response = await request(app)
      .post(`/api/staff/tickets/${ticketNumber}/actions`)
      .set(sessions[2].headers)
      .set('Idempotency-Key', randomUUID())
      .set('Content-Type', 'text/plain')
      .send('not json')
    expect(response.status).toBe(415)
    expect(response.body).toEqual({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Use application/json for this request.',
      },
    })
    expect(JSON.stringify(response.body)).not.toMatch(/stack|sql|database/i)
  })
})
