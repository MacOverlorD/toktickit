import type { RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'
import {
  createTicketWithIdentity,
  IdempotencyKeyReuseError,
  resolveExistingTicketIntent,
  TicketNumberGenerationError,
} from './create-ticket-with-identity.js'
import { validateCreateTicketBody } from './ticket-validation.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function parseIdempotencyKey(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Check the highlighted ticket fields and try again.',
      { idempotencyKey: 'Provide one valid UUID Idempotency-Key header.' },
    )
  }
  return value.toLowerCase()
}

export const createTicket: RequestHandler = async (request, response, next) => {
  try {
    const submissionKey = parseIdempotencyKey(
      request.headers['idempotency-key'],
    )
    const {
      categoryId,
      relatedSystemId,
      summary,
      requestedPriority,
      description,
    } = validateCreateTicketBody(request.body)

    const requester = response.locals.developmentRequester as { id: number }
    const normalizedInput = {
      requesterId: requester.id,
      categoryId,
      relatedSystemId,
      summary,
      requestedPriority,
      description,
      submissionKey,
    }
    const existingResult = await resolveExistingTicketIntent(
      prisma,
      normalizedInput,
    )
    if (existingResult) {
      response.status(200).json({
        data: {
          ticketNumber: existingResult.ticket.ticketNumber,
          ticketDate: existingResult.ticket.createdAt.toISOString(),
          status: existingResult.ticket.status,
          requesterId: existingResult.ticket.requesterId,
        },
        replayed: true,
      })
      return
    }

    const [category, relatedSystem] = await Promise.all([
      prisma.category.findFirst({
        where: { id: categoryId, isActive: true },
        select: { id: true },
      }),
      prisma.relatedSystem.findFirst({
        where: { id: relatedSystemId, isActive: true },
        select: { id: true },
      }),
    ])
    const fieldErrors: Record<string, string> = {}
    if (!category) fieldErrors.categoryId = 'Select an active Category.'
    if (!relatedSystem) {
      fieldErrors.relatedSystemId = 'Select an active Related System.'
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Check the highlighted ticket fields and try again.',
        fieldErrors,
      )
    }

    const result = await createTicketWithIdentity(prisma, normalizedInput)

    response.status(result.replayed ? 200 : 201).json({
      data: {
        ticketNumber: result.ticket.ticketNumber,
        ticketDate: result.ticket.createdAt.toISOString(),
        status: result.ticket.status,
        requesterId: result.ticket.requesterId,
      },
      replayed: result.replayed,
    })
  } catch (error) {
    if (error instanceof IdempotencyKeyReuseError) {
      next(new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', error.message))
      return
    }
    if (error instanceof TicketNumberGenerationError) {
      next(
        new ApiError(
          500,
          'INTERNAL_ERROR',
          'Something went wrong. Please try again.',
        ),
      )
      return
    }
    next(error)
  }
}
