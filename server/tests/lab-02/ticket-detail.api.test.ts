import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

const marker = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
const ownerTicketNumber = `TKT-20990201-${marker}`
const otherTicketNumber = `TKT-20990202-${marker}`
let ownerId: number
let otherOwnerId: number
let ownerTicketId: number

function detailAs(requesterId: number, ticketNumber: string) {
  return request(app)
    .get(`/api/tickets/${ticketNumber}`)
    .set('X-Development-Requester-Id', String(requesterId))
}

beforeAll(async () => {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    }),
    prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    }),
  ])
  const [owner, otherOwner] = await Promise.all([
    prisma.requester.create({
      data: {
        name: 'Detail API Owner',
        email: `detail-owner-${marker.toLowerCase()}@example.com`,
      },
    }),
    prisma.requester.create({
      data: {
        name: 'Detail API Other Owner',
        email: `detail-other-${marker.toLowerCase()}@example.com`,
      },
    }),
  ])
  ownerId = owner.id
  otherOwnerId = otherOwner.id

  const [ownerTicket] = await Promise.all([
    prisma.ticket.create({
      data: {
        ticketNumber: ownerTicketNumber,
        submissionKey: randomUUID(),
        requesterId: ownerId,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: 'Owned detail request',
        requestedPriority: 'HIGH',
        description: 'First line of detail.\nSecond line remains meaningful.',
        createdAt: new Date('2099-02-01T10:00:00.000Z'),
      },
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: otherTicketNumber,
        submissionKey: randomUUID(),
        requesterId: otherOwnerId,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: 'Other owner private request',
        requestedPriority: 'URGENT',
        description: 'This description must never cross the owner boundary.',
      },
    }),
  ])
  ownerTicketId = ownerTicket.id

  await Promise.all([
    prisma.attachment.create({
      data: {
        ticketId: ownerTicketId,
        originalName: 'evidence.pdf',
        storedName: `${randomUUID()}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 2_048,
        uploadedByRequesterId: ownerId,
        createdAt: new Date('2099-02-01T10:01:00.000Z'),
      },
    }),
    prisma.attachment.create({
      data: {
        ticketId: ownerTicketId,
        originalName: 'old-image.png',
        storedName: `${randomUUID()}.png`,
        mimeType: 'image/png',
        sizeBytes: 4_096,
        uploadedByRequesterId: ownerId,
        createdAt: new Date('2099-02-01T10:02:00.000Z'),
        removedAt: new Date('2099-02-01T11:00:00.000Z'),
        removalReason: 'No longer relevant',
        removedByRequesterId: ownerId,
      },
    }),
  ])
})

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { ticketId: ownerTicketId } })
  await prisma.ticket.deleteMany({
    where: { requesterId: { in: [ownerId, otherOwnerId] } },
  })
  await prisma.requester.deleteMany({
    where: { id: { in: [ownerId, otherOwnerId] } },
  })
  await prisma.$disconnect()
})

describe('Issue 17 Ticket Detail API', () => {
  it('returns every approved read-only field and ordered attachment metadata', async () => {
    const response = await detailAs(ownerId, ownerTicketNumber)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ticketNumber: ownerTicketNumber,
      ticketDate: '2099-02-01T10:00:00.000Z',
      requester: {
        id: ownerId,
        name: 'Detail API Owner',
        email: `detail-owner-${marker.toLowerCase()}@example.com`,
      },
      category: { id: expect.any(Number), name: expect.any(String) },
      relatedSystem: { id: expect.any(Number), name: expect.any(String) },
      summary: 'Owned detail request',
      requestedPriority: 'HIGH',
      description: 'First line of detail.\nSecond line remains meaningful.',
      status: 'NEW',
      attachments: [
        {
          id: expect.any(Number),
          originalName: 'evidence.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2_048,
          createdAt: '2099-02-01T10:01:00.000Z',
          isRemoved: false,
          removedAt: null,
          removalReason: null,
        },
        {
          id: expect.any(Number),
          originalName: 'old-image.png',
          mimeType: 'image/png',
          sizeBytes: 4_096,
          createdAt: '2099-02-01T10:02:00.000Z',
          isRemoved: true,
          removedAt: '2099-02-01T11:00:00.000Z',
          removalReason: 'No longer relevant',
        },
      ],
    })
    expect(JSON.stringify(response.body)).not.toContain('storedName')
    expect(JSON.stringify(response.body)).not.toContain('removedByRequesterId')
  })

  it('normalizes a trimmed lowercase Ticket Number', async () => {
    const encoded = encodeURIComponent(`  ${ownerTicketNumber.toLowerCase()}  `)
    const response = await detailAs(ownerId, encoded)

    expect(response.status).toBe(200)
    expect(response.body.ticketNumber).toBe(ownerTicketNumber)
  })

  it.each(['not-a-ticket', 'TKT-20260230-ABC', 'TKT-20260230-ABCDEFG!'])(
    'returns safe JSON 400 for malformed Ticket Number %s',
    async (ticketNumber) => {
      const response = await detailAs(ownerId, ticketNumber)

      expect(response.status).toBe(400)
      expect(response.type).toMatch(/json/)
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TICKET_NUMBER',
          message: 'Provide a valid Ticket Number.',
        },
      })
    },
  )

  it('returns the same safe 404 for missing and cross-owner tickets', async () => {
    const [missing, crossOwner] = await Promise.all([
      detailAs(ownerId, 'TKT-20991231-FFFFFFFF'),
      detailAs(ownerId, otherTicketNumber),
    ])

    for (const response of [missing, crossOwner]) {
      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Ticket was not found.',
        },
      })
      expect(JSON.stringify(response.body)).not.toContain('Other owner')
    }
  })
})
