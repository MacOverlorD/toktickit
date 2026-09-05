import { RequestedPriority } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'

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

export function validateCreateTicketBody(body: unknown) {
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
  const requestedPriority = values.requestedPriority
  if (
    typeof requestedPriority !== 'string' ||
    !Object.values(RequestedPriority).includes(
      requestedPriority as RequestedPriority,
    )
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

  return {
    categoryId,
    relatedSystemId,
    summary,
    requestedPriority: requestedPriority as RequestedPriority,
    description,
  }
}
