import {
  Prisma,
  type PrismaClient,
  type RequestedPriority,
  type Ticket,
} from '@prisma/client'
import { generateTicketNumber } from './ticket-identity.js'

export const MAX_TICKET_NUMBER_RETRIES = 3
export const MAX_TICKET_NUMBER_ATTEMPTS = MAX_TICKET_NUMBER_RETRIES + 1

export interface NormalizedTicketCreation {
  requesterId: number
  categoryId: number
  relatedSystemId: number
  summary: string
  requestedPriority: RequestedPriority
  description: string
  submissionKey: string
}

export interface TicketCreationResult {
  ticket: Ticket
  replayed: boolean
}

export class IdempotencyKeyReuseError extends Error {
  constructor() {
    super('The idempotency key was already used with different ticket data.')
    this.name = 'IdempotencyKeyReuseError'
  }
}

export class TicketNumberGenerationError extends Error {
  constructor() {
    super('Could not generate a unique ticket number.')
    this.name = 'TicketNumberGenerationError'
  }
}

type TicketNumberGenerator = () => string

function hasEquivalentPayload(
  ticket: Ticket,
  input: NormalizedTicketCreation,
) {
  return (
    ticket.requesterId === input.requesterId &&
    ticket.categoryId === input.categoryId &&
    ticket.relatedSystemId === input.relatedSystemId &&
    ticket.summary === input.summary &&
    ticket.requestedPriority === input.requestedPriority &&
    ticket.description === input.description
  )
}

async function findIdempotentTicket(
  prisma: PrismaClient,
  input: NormalizedTicketCreation,
) {
  return prisma.ticket.findUnique({
    where: {
      requesterId_submissionKey: {
        requesterId: input.requesterId,
        submissionKey: input.submissionKey,
      },
    },
  })
}

function resolveReplay(
  existingTicket: Ticket,
  input: NormalizedTicketCreation,
): TicketCreationResult {
  if (!hasEquivalentPayload(existingTicket, input)) {
    throw new IdempotencyKeyReuseError()
  }

  return {
    ticket: existingTicket,
    replayed: true,
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export async function createTicketWithIdentity(
  prisma: PrismaClient,
  input: NormalizedTicketCreation,
  generateNumber: TicketNumberGenerator = generateTicketNumber,
): Promise<TicketCreationResult> {
  const existingTicket = await findIdempotentTicket(prisma, input)

  if (existingTicket) {
    return resolveReplay(existingTicket, input)
  }

  for (let attempt = 0; attempt < MAX_TICKET_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: generateNumber(),
          submissionKey: input.submissionKey,
          requesterId: input.requesterId,
          categoryId: input.categoryId,
          relatedSystemId: input.relatedSystemId,
          summary: input.summary,
          requestedPriority: input.requestedPriority,
          description: input.description,
        },
      })

      return {
        ticket,
        replayed: false,
      }
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error
      }

      const concurrentTicket = await findIdempotentTicket(prisma, input)

      if (concurrentTicket) {
        return resolveReplay(concurrentTicket, input)
      }
    }
  }

  throw new TicketNumberGenerationError()
}
