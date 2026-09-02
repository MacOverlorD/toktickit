import { RequestedPriority } from '@prisma/client'
import type { RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'
import {
  createTicketWithIdentity,
  IdempotencyKeyReuseError,
  TicketNumberGenerationError,
} from './create-ticket-with-identity.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_FIELDS = new Set([
  'categoryId',
  'relatedSystemId',
  'summary',
  'requestedPriority',
  'description',
])
const PROTECTED_FIELDS = new Set([
  'requesterId',
  'ticketNumber',
  'ticketDate',
  'createdAt',
  'status',
  'attachments',
])

type CreateTicketBody = Record<string, unknown>

function invalidRequest(fieldErrors: Record<string, string>) {
  return new ApiError(
    400,
    'VALIDATION_ERROR',
    'Check the highlighted ticket fields and try again.',
    fieldErrors,
  )
}

function parseIdempotencyKey(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw invalidRequest({
      idempotencyKey: 'Provide one valid UUID Idempotency-Key header.',
    })
  }
  return value.toLowerCase()
}

function validateText(
  body: CreateTicketBody,
  field: 'summary' | 'description',
  minimum: number,
  maximum: number,
  errors: Record<string, string>,
) {
  const label = field === 'summary' ? 'Ticket Summary' : 'Description'
  const value = body[field]
  if (typeof value !== 'string') {
    errors[field] = label + ' is required.'
    return ''
  }

  const trimmed = value.trim()
  if (trimmed.length < minimum || trimmed.length > maximum) {
    errors[field] =
      label + ' must be ' + minimum + '-' +
      maximum.toLocaleString('en-US') + ' characters after trimming.'
  }
  return trimmed
}

function validatePositiveInteger(
  body: CreateTicketBody,
  field: 'categoryId' | 'relatedSystemId',
  errors: Record<string, string>,
) {
  const value = body[field]
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    errors[field] =
      (field === 'categoryId' ? 'Category' : 'Related System') + ' is required.'
    return null
  }
  return Number(value)
}

export const createTicket: RequestHandler = async (request, response, next) => {
  try {
    const submissionKey = parseIdempotencyKey(
      request.headers['idempotency-key'],
    )
    const body = request.body
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw invalidRequest({ body: 'Provide a JSON object for the ticket.' })
    }

    const values = body as CreateTicketBody
    const fieldErrors: Record<string, string> = {}
    for (const field of Object.keys(values)) {
      if (PROTECTED_FIELDS.has(field)) {
        fieldErrors[field] =
          field + ' is assigned by the server and cannot be submitted.'
      } else if (!ALLOWED_FIELDS.has(field)) {
        fieldErrors[field] = 'This field is not accepted.'
      }
    }

    const categoryId = validatePositiveInteger(values, 'categoryId', fieldErrors)
    const relatedSystemId = validatePositiveInteger(
      values,
      'relatedSystemId',
      fieldErrors,
    )
    const summary = validateText(values, 'summary', 5, 120, fieldErrors)
    const description = validateText(
      values,
      'description',
      10,
      5_000,
      fieldErrors,
    )
    const priority = values.requestedPriority
    if (
      typeof priority !== 'string' ||
      !Object.values(RequestedPriority).includes(priority as RequestedPriority)
    ) {
      fieldErrors.requestedPriority = 'Select LOW, MEDIUM, HIGH, or URGENT.'
    }

    if (
      Object.keys(fieldErrors).length > 0 ||
      categoryId === null ||
      relatedSystemId === null
    ) {
      throw invalidRequest(fieldErrors)
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
    if (!category) fieldErrors.categoryId = 'Select an active Category.'
    if (!relatedSystem) {
      fieldErrors.relatedSystemId = 'Select an active Related System.'
    }
    if (Object.keys(fieldErrors).length > 0) throw invalidRequest(fieldErrors)

    const requester = response.locals.developmentRequester as { id: number }
    const result = await createTicketWithIdentity(prisma, {
      requesterId: requester.id,
      categoryId,
      relatedSystemId,
      summary,
      requestedPriority: priority as RequestedPriority,
      description,
      submissionKey,
    })

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
