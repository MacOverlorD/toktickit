import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

let requesterAId: number
let requesterBId: number
let categoryAId: number
let categoryBId: number
let systemAId: number
let systemBId: number
let historicalCategoryId: number
let historicalSystemId: number
const marker = randomUUID().slice(0, 8)
const ownedTicketNumbers: string[] = []

function ticketNumber(index: number) {
  return `TKT-20990101-${marker.slice(0, 6).toUpperCase()}${index
    .toString(16)
    .toUpperCase()
    .padStart(2, '0')}`
}

function listAs(requesterId: number) {
  return request(app)
    .get('/api/tickets')
    .set('X-Development-Requester-Id', String(requesterId))
}

beforeAll(async () => {
  const [categoryA, categoryB, systemA, systemB] = await Promise.all([
    prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
    prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      select: { id: true },
    }),
    prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
    prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      select: { id: true },
    }),
  ])
  categoryAId = categoryA.id
  categoryBId = categoryB.id
  systemAId = systemA.id
  systemBId = systemB.id

  const [requesterA, requesterB] = await Promise.all([
    prisma.requester.create({
      data: {
        name: 'List API Owner A',
        email: `list-a-${marker}@example.com`,
      },
    }),
    prisma.requester.create({
      data: {
        name: 'List API Owner B',
        email: `list-b-${marker}@example.com`,
      },
    }),
  ])
  requesterAId = requesterA.id
  requesterBId = requesterB.id

  const [historicalCategory, historicalSystem] = await prisma.$transaction(
    async (transaction) => {
      const category = await transaction.category.create({
        data: {
          name: `Historical Category ${marker}`,
          displayOrder: 9_998,
        },
      })
      const system = await transaction.relatedSystem.create({
        data: {
          name: `Historical System ${marker}`,
          displayOrder: 9_998,
        },
      })
      await transaction.category.update({
        where: { id: category.id },
        data: { isActive: false },
      })
      await transaction.relatedSystem.update({
        where: { id: system.id },
        data: { isActive: false },
      })
      return [category, system] as const
    },
  )
  historicalCategoryId = historicalCategory.id
  historicalSystemId = historicalSystem.id

  const tiedDate = new Date('2099-01-01T12:00:00.000Z')
  for (let index = 1; index <= 12; index += 1) {
    const number = ticketNumber(index)
    ownedTicketNumbers.push(number)
    await prisma.ticket.create({
      data: {
        ticketNumber: number,
        submissionKey: randomUUID(),
        requesterId: requesterAId,
        categoryId:
          index === 12
            ? historicalCategoryId
            : index % 2 === 0 ? categoryBId : categoryAId,
        relatedSystemId:
          index === 12
            ? historicalSystemId
            : index % 2 === 0 ? systemBId : systemAId,
        summary: index <= 3 ? `Deterministic ${marker}` : `Owned item ${index}`,
        requestedPriority: index % 2 === 0 ? 'HIGH' : 'LOW',
        description:
          index === 4
            ? `Secret searchable phrase ${marker}`
            : `Owned description ${index}`,
        createdAt: index <= 3 ? tiedDate : new Date(tiedDate.getTime() + index * 1000),
      },
    })
  }

  await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-20990102-${marker.toUpperCase()}`,
      submissionKey: randomUUID(),
      requesterId: requesterBId,
      categoryId: categoryAId,
      relatedSystemId: systemAId,
      summary: `Other owner ${marker}`,
      requestedPriority: 'URGENT',
      description: `Secret searchable phrase ${marker}`,
    },
  })
})

afterAll(async () => {
  await prisma.ticket.deleteMany({
    where: { requesterId: { in: [requesterAId, requesterBId] } },
  })
  await prisma.requester.deleteMany({
    where: { id: { in: [requesterAId, requesterBId] } },
  })
  await prisma.category.delete({ where: { id: historicalCategoryId } })
  await prisma.relatedSystem.delete({ where: { id: historicalSystemId } })
  await prisma.$disconnect()
})

describe('Issue 16 My Tickets API', () => {
  it('returns only the selected requester tickets with default metadata', async () => {
    const response = await listAs(requesterAId)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(10)
    expect(response.body.items).not.toContainEqual(
      expect.objectContaining({ summary: `Other owner ${marker}` }),
    )
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    })
    expect(response.body.query).toEqual({
      search: null,
      categoryId: null,
      relatedSystemId: null,
      status: null,
      priority: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    expect(response.body.filterOptions.categories).toContainEqual({
      id: historicalCategoryId,
      name: `Historical Category ${marker}`,
      isActive: false,
    })
    expect(response.body.filterOptions.relatedSystems).toContainEqual({
      id: historicalSystemId,
      name: `Historical System ${marker}`,
      isActive: false,
    })
    expect(response.body.items[0]).toEqual({
      ticketNumber: expect.any(String),
      createdAt: expect.any(String),
      summary: expect.any(String),
      requestedPriority: expect.stringMatching(/^(LOW|MEDIUM|HIGH|URGENT)$/),
      status: 'NEW',
      category: { id: expect.any(Number), name: expect.any(String) },
      relatedSystem: { id: expect.any(Number), name: expect.any(String) },
      attachmentCount: 0,
    })
  })

  it('searches all documented fields case-insensitively without leaking another owner', async () => {
    const byDescription = await listAs(requesterAId).query({
      search: `  SECRET SEARCHABLE PHRASE ${marker.toUpperCase()}  `,
    })
    const byTicketNumber = await listAs(requesterAId).query({
      search: ownedTicketNumbers[0].toLowerCase(),
    })

    expect(byDescription.status).toBe(200)
    expect(byDescription.body.items).toHaveLength(1)
    expect(byDescription.body.items[0].ticketNumber).toBe(ownedTicketNumbers[3])
    expect(byTicketNumber.body.items.map((item: { ticketNumber: string }) => item.ticketNumber))
      .toEqual([ownedTicketNumbers[0]])
  })

  it('combines exact filters while retaining owner scope', async () => {
    const response = await listAs(requesterAId).query({
      categoryId: categoryBId,
      relatedSystemId: systemBId,
      status: 'NEW',
      priority: 'HIGH',
      pageSize: 20,
    })

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(5)
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: expect.objectContaining({ id: categoryBId }),
          relatedSystem: expect.objectContaining({ id: systemBId }),
          requestedPriority: 'HIGH',
          status: 'NEW',
        }),
      ]),
    )
  })

  it('keeps deactivated references available and filterable for historical tickets', async () => {
    const response = await listAs(requesterAId).query({
      categoryId: historicalCategoryId,
      relatedSystemId: historicalSystemId,
    })

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        ticketNumber: ownedTicketNumbers[11],
        category: expect.objectContaining({ id: historicalCategoryId }),
        relatedSystem: expect.objectContaining({ id: historicalSystemId }),
      }),
    )

    const otherOwnerResponse = await listAs(requesterBId)
    expect(otherOwnerResponse.status).toBe(200)
    expect(otherOwnerResponse.body.filterOptions.categories).not.toContainEqual(
      expect.objectContaining({ id: historicalCategoryId }),
    )
    expect(otherOwnerResponse.body.filterOptions.relatedSystems).not.toContainEqual(
      expect.objectContaining({ id: historicalSystemId }),
    )
  })

  it('uses id in the requested direction to break primary-sort ties', async () => {
    const ascending = await listAs(requesterAId).query({
      search: `Deterministic ${marker}`,
      sortBy: 'summary',
      sortOrder: 'asc',
    })
    const descending = await listAs(requesterAId).query({
      search: `Deterministic ${marker}`,
      sortBy: 'summary',
      sortOrder: 'desc',
    })

    expect(ascending.body.items.map((item: { ticketNumber: string }) => item.ticketNumber))
      .toEqual(ownedTicketNumbers.slice(0, 3))
    expect(descending.body.items.map((item: { ticketNumber: string }) => item.ticketNumber))
      .toEqual(ownedTicketNumbers.slice(0, 3).reverse())
  })

  it('returns the requested beyond-last page with accurate metadata', async () => {
    const response = await listAs(requesterAId).query({ page: 9, pageSize: 10 })

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([])
    expect(response.body.pagination).toEqual({
      page: 9,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    })
  })

  it.each([
    { unknown: 'value' },
    { search: '' },
    { page: 0 },
    { pageSize: 25 },
    { categoryId: '2147483648' },
    { relatedSystemId: '2147483648' },
    { page: '42949674', pageSize: 50 },
    { sortBy: 'requesterId' },
    { priority: 'CRITICAL' },
  ])('returns safe JSON 400 for invalid query %#', async (query) => {
    const response = await listAs(requesterAId).query(query)

    expect(response.status).toBe(400)
    expect(response.type).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_QUERY',
        message: 'Check the ticket list query parameters and try again.',
      },
    })
  })

  it('rejects repeated query parameters', async () => {
    const response = await listAs(requesterAId).query({ search: ['one', 'two'] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_QUERY')
  })
})
