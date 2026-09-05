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

export type TicketStatus = 'NEW'
export type TicketSortField =
  | 'createdAt'
  | 'ticketNumber'
  | 'summary'
  | 'requestedPriority'
export type TicketSortOrder = 'asc' | 'desc'
export type TicketPageSize = 10 | 20 | 50

export interface TicketListQuery {
  search: string
  categoryId: number | null
  relatedSystemId: number | null
  status: TicketStatus | null
  priority: RequestedPriority | null
  sortBy: TicketSortField
  sortOrder: TicketSortOrder
  page: number
  pageSize: TicketPageSize
}

export interface AppliedTicketListQuery {
  search: string | null
  categoryId: number | null
  relatedSystemId: number | null
  status: TicketStatus | null
  priority: RequestedPriority | null
  sortBy: TicketSortField
  sortOrder: TicketSortOrder
}

export interface TicketListItem {
  ticketNumber: string
  createdAt: string
  summary: string
  requestedPriority: RequestedPriority
  status: TicketStatus
  category: { id: number; name: string }
  relatedSystem: { id: number; name: string }
  attachmentCount: number
}

export interface TicketFilterReference {
  id: number
  name: string
  isActive: boolean
}

export interface TicketListResult {
  items: TicketListItem[]
  pagination: {
    page: number
    pageSize: TicketPageSize
    totalItems: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
  query: AppliedTicketListQuery
  filterOptions: {
    categories: TicketFilterReference[]
    relatedSystems: TicketFilterReference[]
  }
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

const priorities = new Set<unknown>(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
const sortFields = new Set<unknown>([
  'createdAt',
  'ticketNumber',
  'summary',
  'requestedPriority',
])
const pageSizes = new Set<unknown>([10, 20, 50])

function isPositiveInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isReference(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const reference = value as Record<string, unknown>
  return (
    isPositiveInteger(reference.id) &&
    typeof reference.name === 'string' &&
    reference.name.trim().length > 0
  )
}

function isFilterReference(value: unknown): value is TicketFilterReference {
  return isReference(value) &&
    typeof (value as Record<string, unknown>).isActive === 'boolean'
}

function isTicketListItem(value: unknown): value is TicketListItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.ticketNumber === 'string' &&
    typeof item.createdAt === 'string' &&
    !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.summary === 'string' &&
    priorities.has(item.requestedPriority) &&
    item.status === 'NEW' &&
    isReference(item.category) &&
    isReference(item.relatedSystem) &&
    Number.isSafeInteger(item.attachmentCount) &&
    Number(item.attachmentCount) >= 0
  )
}

function isTicketListResult(value: unknown): value is TicketListResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  if (!Array.isArray(result.items) || !result.items.every(isTicketListItem)) return false
  if (
    typeof result.pagination !== 'object' ||
    result.pagination === null ||
    Array.isArray(result.pagination) ||
    typeof result.query !== 'object' ||
    result.query === null ||
    Array.isArray(result.query) ||
    typeof result.filterOptions !== 'object' ||
    result.filterOptions === null ||
    Array.isArray(result.filterOptions)
  ) return false

  const pagination = result.pagination as Record<string, unknown>
  const query = result.query as Record<string, unknown>
  const filterOptions = result.filterOptions as Record<string, unknown>
  return (
    isPositiveInteger(pagination.page) &&
    pageSizes.has(pagination.pageSize) &&
    Number.isSafeInteger(pagination.totalItems) &&
    Number(pagination.totalItems) >= 0 &&
    Number.isSafeInteger(pagination.totalPages) &&
    Number(pagination.totalPages) >= 0 &&
    typeof pagination.hasPreviousPage === 'boolean' &&
    typeof pagination.hasNextPage === 'boolean' &&
    (query.search === null || typeof query.search === 'string') &&
    (query.categoryId === null || isPositiveInteger(query.categoryId)) &&
    (query.relatedSystemId === null || isPositiveInteger(query.relatedSystemId)) &&
    (query.status === null || query.status === 'NEW') &&
    (query.priority === null || priorities.has(query.priority)) &&
    sortFields.has(query.sortBy) &&
    (query.sortOrder === 'asc' || query.sortOrder === 'desc') &&
    Array.isArray(filterOptions.categories) &&
    filterOptions.categories.every(isFilterReference) &&
    Array.isArray(filterOptions.relatedSystems) &&
    filterOptions.relatedSystems.every(isFilterReference)
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

export async function getMyTickets(
  query: TicketListQuery,
  requesterId: number,
): Promise<TicketListResult> {
  const parameters = new URLSearchParams({
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) parameters.set('search', query.search)
  if (query.categoryId !== null) parameters.set('categoryId', String(query.categoryId))
  if (query.relatedSystemId !== null) {
    parameters.set('relatedSystemId', String(query.relatedSystemId))
  }
  if (query.status !== null) parameters.set('status', query.status)
  if (query.priority !== null) parameters.set('priority', query.priority)

  const response = await apiFetch(`/api/tickets?${parameters.toString()}`, {
    headers: { 'X-Development-Requester-Id': String(requesterId) },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (typeof body === 'object' && body !== null) {
      const error = (body as Record<string, unknown>).error
      if (typeof error === 'object' && error !== null) {
        const details = error as Record<string, unknown>
        throw new TicketApiError(
          typeof details.code === 'string' ? details.code : 'REQUEST_FAILED',
          typeof details.message === 'string'
            ? details.message
            : 'Tickets could not be loaded.',
        )
      }
    }
    throw new TicketApiError('REQUEST_FAILED', 'Tickets could not be loaded.')
  }
  if (!isTicketListResult(body)) {
    throw new TicketApiError(
      'INVALID_RESPONSE',
      'The server returned an invalid ticket list.',
    )
  }
  return body
}
