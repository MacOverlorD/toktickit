import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

const submissionKeys: string[] = []
let requesterId: number
let categoryId: number
let relatedSystemId: number
let inactiveCategoryId: number
let inactiveSystemId: number

function newKey() {
  const key = randomUUID()
  submissionKeys.push(key)
  return key
}

function validBody() {
  return {
    categoryId,
    relatedSystemId,
    summary: '  Laptop battery drains quickly  ',
    requestedPriority: 'MEDIUM',
    description: '  Battery capacity drops from full to empty in one hour.  ',
  }
}

function createRequest(key = newKey()) {
  return request(app)
    .post('/api/tickets')
    .set('X-Development-Requester-Id', String(requesterId))
    .set('Idempotency-Key', key)
}

beforeAll(async () => {
  const [requester, category, system] = await Promise.all([
    prisma.requester.findFirstOrThrow({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    }),
    prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    }),
  ])
  requesterId = requester.id
  categoryId = category.id
  relatedSystemId = system.id

  const [inactiveCategory, inactiveSystem] = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Inactive API Test ' + randomUUID(),
        displayOrder: 9_999,
        isActive: false,
      },
      select: { id: true },
    }),
    prisma.relatedSystem.create({
      data: {
        name: 'Inactive API Test ' + randomUUID(),
        displayOrder: 9_999,
        isActive: false,
      },
      select: { id: true },
    }),
  ])
  inactiveCategoryId = inactiveCategory.id
  inactiveSystemId = inactiveSystem.id
})

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { submissionKey: { in: submissionKeys } } })
  await prisma.category.delete({ where: { id: inactiveCategoryId } })
  await prisma.relatedSystem.delete({ where: { id: inactiveSystemId } })
  await prisma.$disconnect()
})

describe('Issue 15 reference data and ticket creation API', () => {
  it('returns only active Categories and Related Systems in display order', async () => {
    const [categories, systems] = await Promise.all([
      request(app).get('/api/categories'),
      request(app).get('/api/related-systems'),
    ])

    expect(categories.status).toBe(200)
    expect(systems.status).toBe(200)
    expect(categories.body).not.toContainEqual(
      expect.objectContaining({ id: inactiveCategoryId }),
    )
    expect(systems.body).not.toContainEqual(
      expect.objectContaining({ id: inactiveSystemId }),
    )
    expect(categories.body.map(({ name }: { name: string }) => name)).toEqual([
      'Account and Access',
      'Hardware',
      'Software',
      'Network',
    ])
    expect(systems.body.map(({ name }: { name: string }) => name)).toEqual([
      'Email',
      'Campus Wi-Fi',
      'VPN',
      'LEB2 App',
      'Grade Submission App',
      'Printer',
      'Corporate Laptop',
    ])
    expect(categories.body[0]).toEqual({ id: expect.any(Number), name: expect.any(String) })
    expect(systems.body[0]).toEqual({ id: expect.any(Number), name: expect.any(String) })
  })

  it('creates one owned NEW ticket with normalized text and server identity', async () => {
    const response = await createRequest().send(validBody())

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: {
        ticketNumber: expect.stringMatching(/^TKT-\d{8}-[A-F0-9]{8}$/),
        ticketDate: expect.any(String),
        status: 'NEW',
        requesterId,
      },
      replayed: false,
    })

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: response.body.data.ticketNumber },
    })
    expect(ticket.requesterId).toBe(requesterId)
    expect(ticket.summary).toBe('Laptop battery drains quickly')
    expect(ticket.description).toBe(
      'Battery capacity drops from full to empty in one hour.',
    )
    expect(ticket.createdAt.toISOString()).toBe(response.body.data.ticketDate)
  })

  it('rejects malformed values and protected ownership fields without creating a ticket', async () => {
    const key = newKey()
    const response = await createRequest(key).send({
      categoryId: 0,
      relatedSystemId: '1',
      summary: ' x ',
      requestedPriority: 'CRITICAL',
      description: ' short ',
      requesterId: requesterId + 1,
      status: 'CLOSED',
      unexpected: true,
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.fieldErrors).toEqual(
      expect.objectContaining({
        categoryId: expect.any(String),
        relatedSystemId: expect.any(String),
        summary: expect.any(String),
        requestedPriority: expect.any(String),
        description: expect.any(String),
        requesterId: expect.any(String),
        status: expect.any(String),
        unexpected: expect.any(String),
      }),
    )
    await expect(
      prisma.ticket.count({ where: { submissionKey: key } }),
    ).resolves.toBe(0)
  })

  it('rejects summary and description values above their maximum lengths', async () => {
    const key = newKey()
    const response = await createRequest(key).send({
      ...validBody(),
      summary: 's'.repeat(121),
      description: 'd'.repeat(5_001),
    })

    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors).toEqual(
      expect.objectContaining({
        summary: expect.stringContaining('5-120'),
        description: expect.stringContaining('10-5,000'),
      }),
    )
    await expect(
      prisma.ticket.count({ where: { submissionKey: key } }),
    ).resolves.toBe(0)
  })

  it('rejects inactive references and invalid requester/idempotency context', async () => {
    const inactiveResponse = await createRequest().send({
      ...validBody(),
      categoryId: inactiveCategoryId,
      relatedSystemId: inactiveSystemId,
    })
    expect(inactiveResponse.status).toBe(400)
    expect(inactiveResponse.body.error.fieldErrors).toEqual({
      categoryId: 'Select an active Category.',
      relatedSystemId: 'Select an active Related System.',
    })

    const missingRequester = await request(app)
      .post('/api/tickets')
      .set('Idempotency-Key', newKey())
      .send(validBody())
    expect(missingRequester.status).toBe(400)
    expect(missingRequester.body.error.code).toBe('INVALID_REQUESTER_CONTEXT')

    const invalidKey = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', String(requesterId))
      .set('Idempotency-Key', 'not-a-uuid')
      .send(validBody())
    expect(invalidKey.status).toBe(400)
    expect(invalidKey.body.error.fieldErrors.idempotencyKey).toEqual(
      expect.any(String),
    )
  })

  it('replays an equivalent intent and rejects changed data with the same key', async () => {
    const key = newKey()
    const first = await createRequest(key).send(validBody())
    const replay = await createRequest(key).send({
      ...validBody(),
      summary: 'Laptop battery drains quickly',
      description: 'Battery capacity drops from full to empty in one hour.',
    })
    const conflict = await createRequest(key).send({
      ...validBody(),
      summary: 'A different valid summary',
    })

    expect(first.status).toBe(201)
    expect(replay.status).toBe(200)
    expect(replay.body).toEqual({ data: first.body.data, replayed: true })
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED')
    await expect(
      prisma.ticket.count({ where: { submissionKey: key } }),
    ).resolves.toBe(1)
  })

  it('replays an existing intent before validating references that later became inactive', async () => {
    const key = newKey()
    const temporaryCategory = await prisma.category.create({
      data: {
        name: 'Replay Category ' + randomUUID(),
        displayOrder: 9_998,
      },
    })
    const temporarySystem = await prisma.relatedSystem.create({
      data: {
        name: 'Replay System ' + randomUUID(),
        displayOrder: 9_998,
      },
    })
    const body = {
      ...validBody(),
      categoryId: temporaryCategory.id,
      relatedSystemId: temporarySystem.id,
    }

    try {
      const first = await createRequest(key).send(body)
      expect(first.status).toBe(201)

      await Promise.all([
        prisma.category.update({
          where: { id: temporaryCategory.id },
          data: { isActive: false },
        }),
        prisma.relatedSystem.update({
          where: { id: temporarySystem.id },
          data: { isActive: false },
        }),
      ])

      const replay = await createRequest(key).send(body)
      const conflict = await createRequest(key).send({
        ...body,
        summary: 'A different valid summary',
      })

      expect(replay.status).toBe(200)
      expect(replay.body).toEqual({ data: first.body.data, replayed: true })
      expect(conflict.status).toBe(409)
      expect(conflict.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED')
    } finally {
      await prisma.ticket.deleteMany({ where: { submissionKey: key } })
      await prisma.category.delete({ where: { id: temporaryCategory.id } })
      await prisma.relatedSystem.delete({ where: { id: temporarySystem.id } })
    }
  })

  it('returns safe JSON validation feedback for a malformed JSON body', async () => {
    const key = newKey()
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', String(requesterId))
      .set('Idempotency-Key', key)
      .set('Content-Type', 'application/json')
      .send('{categoryId:')

    expect(response.status).toBe(400)
    expect(response.headers['content-type']).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Provide a valid JSON request body.',
        fieldErrors: {
          body: 'Provide valid JSON.',
        },
      },
    })
  })
})
