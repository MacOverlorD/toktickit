import { apiFetch } from './request'

export type RequestedPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface CreateTicketInput {
  categoryId: number
  relatedSystemId: number
  summary: string
  requestedPriority: RequestedPriority
  description: string
}

export interface CreatedTicket {
  ticketNumber: string
  ticketDate: string
  status: 'NEW'
  requesterId: number
}

export interface CreateTicketResult {
  data: CreatedTicket
  replayed: boolean
}

export class TicketApiError extends Error {
  readonly code: string
  readonly fieldErrors: Record<string, string>

  constructor(
    code = 'REQUEST_FAILED',
    message = 'The ticket could not be created.',
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'TicketApiError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

const ticketFieldNames = new Set([
  'categoryId',
  'relatedSystemId',
  'summary',
  'requestedPriority',
  'description',
])

function parseFieldErrors(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const entries = Object.entries(value)
  if (
    !entries.every(
      ([field, message]) =>
        ticketFieldNames.has(field) &&
        typeof message === 'string' &&
        message.trim().length > 0,
    )
  ) {
    return {}
  }
  return Object.fromEntries(entries)
}

function isCreateTicketResult(value: unknown): value is CreateTicketResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Record<string, unknown>
  if (typeof result.replayed !== 'boolean') return false
  if (typeof result.data !== 'object' || result.data === null) return false
  const data = result.data as Record<string, unknown>
  return (
    typeof data.ticketNumber === 'string' &&
    typeof data.ticketDate === 'string' &&
    data.status === 'NEW' &&
    Number.isInteger(data.requesterId)
  )
}

export async function createTicket(
  input: CreateTicketInput,
  requesterId: number,
  idempotencyKey: string,
): Promise<CreateTicketResult> {
  const response = await apiFetch('/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Development-Requester-Id': String(requesterId),
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(input),
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (typeof body === 'object' && body !== null) {
      const error = (body as Record<string, unknown>).error
      if (typeof error === 'object' && error !== null) {
        const details = error as Record<string, unknown>
        throw new TicketApiError(
          typeof details.code === 'string' ? details.code : undefined,
          typeof details.message === 'string' ? details.message : undefined,
          parseFieldErrors(details.fieldErrors),
        )
      }
    }
    throw new TicketApiError()
  }

  if (!isCreateTicketResult(body)) {
    throw new TicketApiError(
      'INVALID_RESPONSE',
      'The server returned an invalid response.',
    )
  }
  return body
}
