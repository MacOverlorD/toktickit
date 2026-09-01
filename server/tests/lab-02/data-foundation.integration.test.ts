import { randomUUID } from 'node:crypto'
import { RequestedPriority } from '@prisma/client'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  categorySeeds,
  relatedSystemSeeds,
  requesterSeeds,
  seedDatabase,
} from '../../prisma/seed-data.js'
import prisma from '../../src/prisma.js'
import {
  createTicketWithIdentity,
  IdempotencyKeyReuseError,
  MAX_TICKET_NUMBER_ATTEMPTS,
  TicketNumberGenerationError,
  type NormalizedTicketCreation,
} from '../../src/tickets/create-ticket-with-identity.js'

const submissionKeys = new Set<string>()

let requesterId: number
let categoryId: number
let relatedSystemId: number

function newSubmissionKey() {
  const key = randomUUID()
  submissionKeys.add(key)
  return key
}

function ticketInput(
  overrides: Partial<NormalizedTicketCreation> = {},
): NormalizedTicketCreation {
  return {
    requesterId,
    categoryId,
    relatedSystemId,
    summary: 'Laptop battery drains quickly',
    requestedPriority: RequestedPriority.MEDIUM,
    description: 'Battery capacity drops from full to empty in one hour.',
    submissionKey: newSubmissionKey(),
    ...overrides,
  }
}

beforeAll(async () => {
  await seedDatabase(prisma)

  const [requester, category, relatedSystem] = await Promise.all([
    prisma.requester.findUniqueOrThrow({
      where: { email: requesterSeeds[0].email },
    }),
    prisma.category.findUniqueOrThrow({
      where: { name: categorySeeds[1].name },
    }),
    prisma.relatedSystem.findUniqueOrThrow({
      where: { name: relatedSystemSeeds[6].name },
    }),
  ])

  requesterId = requester.id
  categoryId = category.id
  relatedSystemId = relatedSystem.id
})

afterEach(async () => {
  const keys = [...submissionKeys]

  if (keys.length > 0) {
    const tickets = await prisma.ticket.findMany({
      where: { submissionKey: { in: keys } },
      select: { id: true },
    })
    const ticketIds = tickets.map(({ id }) => id)

    if (ticketIds.length > 0) {
      await prisma.attachment.deleteMany({
        where: { ticketId: { in: ticketIds } },
      })
      await prisma.ticket.deleteMany({
        where: { id: { in: ticketIds } },
      })
    }
  }

  submissionKeys.clear()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Lab 2 seed data', () => {
  it('is complete and remains duplicate-free when run repeatedly', async () => {
    await seedDatabase(prisma)
    await seedDatabase(prisma)

    const [categories, relatedSystems, requesters] = await Promise.all([
      prisma.category.findMany({
        where: { name: { in: categorySeeds.map(({ name }) => name) } },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.relatedSystem.findMany({
        where: { name: { in: relatedSystemSeeds.map(({ name }) => name) } },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.requester.findMany({
        where: { email: { in: requesterSeeds.map(({ email }) => email) } },
      }),
    ])

    expect(categories.map(({ name }) => name)).toEqual(
      categorySeeds.map(({ name }) => name),
    )
    expect(relatedSystems.map(({ name }) => name)).toEqual(
      relatedSystemSeeds.map(({ name }) => name),
    )
    expect(requesters).toHaveLength(requesterSeeds.length)
    expect(requesters.filter(({ isActive }) => isActive)).toHaveLength(4)
    expect(requesters.filter(({ isActive }) => !isActive)).toHaveLength(1)
  })
})

describe('Ticket identity and schema behavior', () => {
  it('installs the required indexes and integrity constraints', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('Ticket', 'Attachment')
    `
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT constraint_row.conname
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS table_row ON table_row.oid = constraint_row.conrelid
      WHERE table_row.relname IN ('Category', 'RelatedSystem', 'Ticket', 'Attachment')
    `

    expect(indexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        'Ticket_ticketNumber_key',
        'Ticket_requesterId_submissionKey_key',
        'Ticket_requesterId_createdAt_id_idx',
        'Ticket_requesterId_categoryId_idx',
        'Ticket_requesterId_relatedSystemId_idx',
        'Ticket_requesterId_status_idx',
        'Ticket_requesterId_requestedPriority_idx',
        'Attachment_storedName_key',
        'Attachment_ticketId_removedAt_idx',
      ]),
    )
    expect(constraints.map(({ conname }) => conname)).toEqual(
      expect.arrayContaining([
        'Category_displayOrder_check',
        'RelatedSystem_displayOrder_check',
        'Ticket_ticketNumber_format_check',
        'Ticket_summary_check',
        'Ticket_description_check',
        'Attachment_sizeBytes_check',
        'Attachment_removal_metadata_check',
      ]),
    )
  })

  it('creates the relationships and applies the NEW status default', async () => {
    const result = await createTicketWithIdentity(prisma, ticketInput(), () =>
      'TKT-20260901-10000001',
    )

    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: result.ticket.id },
      include: {
        requester: true,
        category: true,
        relatedSystem: true,
      },
    })

    expect(result.replayed).toBe(false)
    expect(stored.status).toBe('NEW')
    expect(stored.requester.id).toBe(requesterId)
    expect(stored.category.id).toBe(categoryId)
    expect(stored.relatedSystem.id).toBe(relatedSystemId)
  })

  it('replays the same normalized intent and rejects changed data', async () => {
    const input = ticketInput()
    const generator = () => 'TKT-20260901-10000002'

    const created = await createTicketWithIdentity(prisma, input, generator)
    const replayed = await createTicketWithIdentity(prisma, input, generator)

    expect(replayed.replayed).toBe(true)
    expect(replayed.ticket.id).toBe(created.ticket.id)
    await expect(
      createTicketWithIdentity(
        prisma,
        { ...input, summary: 'A different normalized summary' },
        generator,
      ),
    ).rejects.toBeInstanceOf(IdempotencyKeyReuseError)
    await expect(
      prisma.ticket.count({ where: { submissionKey: input.submissionKey } }),
    ).resolves.toBe(1)
  })

  it('collapses concurrent submissions with the same key to one Ticket', async () => {
    const input = ticketInput()
    let suffix = 3
    const generator = () =>
      `TKT-20260901-${(suffix++).toString().padStart(8, '0')}`

    const results = await Promise.all([
      createTicketWithIdentity(prisma, input, generator),
      createTicketWithIdentity(prisma, input, generator),
    ])

    expect(new Set(results.map(({ ticket }) => ticket.id)).size).toBe(1)
    expect(results.some(({ replayed }) => replayed)).toBe(true)
    await expect(
      prisma.ticket.count({ where: { submissionKey: input.submissionKey } }),
    ).resolves.toBe(1)
  })

  it('retries Ticket Number collisions and fails after the approved limit', async () => {
    const collisionNumber = 'TKT-20260901-10000004'
    await createTicketWithIdentity(
      prisma,
      ticketInput(),
      () => collisionNumber,
    )

    const retryNumbers = [collisionNumber, 'TKT-20260901-10000005']
    const retried = await createTicketWithIdentity(
      prisma,
      ticketInput(),
      () => retryNumbers.shift() ?? 'TKT-20260901-FFFFFFFF',
    )

    expect(retried.ticket.ticketNumber).toBe('TKT-20260901-10000005')

    let attempts = 0
    await expect(
      createTicketWithIdentity(prisma, ticketInput(), () => {
        attempts += 1
        return collisionNumber
      }),
    ).rejects.toBeInstanceOf(TicketNumberGenerationError)
    expect(attempts).toBe(MAX_TICKET_NUMBER_ATTEMPTS)
  })

  it('retains complete soft-removal metadata and enforces database checks', async () => {
    const { ticket } = await createTicketWithIdentity(
      prisma,
      ticketInput(),
      () => 'TKT-20260901-10000006',
    )
    const attachment = await prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        originalName: 'battery-report.pdf',
        storedName: `${randomUUID()}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedByRequesterId: requesterId,
      },
    })

    await expect(
      prisma.attachment.update({
        where: { id: attachment.id },
        data: { removedAt: new Date() },
      }),
    ).rejects.toThrow(/Attachment_removal_metadata_check/)

    const removed = await prisma.attachment.update({
      where: { id: attachment.id },
      data: {
        removedAt: new Date('2026-09-01T12:00:00.000Z'),
        removalReason: 'Uploaded the wrong document',
        removedByRequesterId: requesterId,
      },
    })

    expect(removed.removedAt).toEqual(new Date('2026-09-01T12:00:00.000Z'))
    expect(removed.removalReason).toBe('Uploaded the wrong document')
    expect(removed.removedByRequesterId).toBe(requesterId)
  })
})
