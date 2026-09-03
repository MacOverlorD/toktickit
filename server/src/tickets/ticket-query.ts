import { ApiError } from '../errors/api-error.js'

export const TICKET_SORT_FIELDS = [
  'createdAt',
  'ticketNumber',
  'summary',
  'requestedPriority',
] as const
export const TICKET_PAGE_SIZES = [10, 20, 50] as const

export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number]
export type TicketSortOrder = 'asc' | 'desc'

export interface TicketListQuery {
  search: string | null
  categoryId: number | null
  relatedSystemId: number | null
  status: 'NEW' | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null
  sortBy: TicketSortField
  sortOrder: TicketSortOrder
  page: number
  pageSize: (typeof TICKET_PAGE_SIZES)[number]
}

const ALLOWED_QUERY_KEYS = new Set([
  'search',
  'categoryId',
  'relatedSystemId',
  'status',
  'priority',
  'sortBy',
  'sortOrder',
  'page',
  'pageSize',
])
const PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

function invalidQuery() {
  return new ApiError(
    400,
    'INVALID_QUERY',
    'Check the ticket list query parameters and try again.',
  )
}

function optionalValue(query: Record<string, unknown>, key: string) {
  if (!(key in query)) return null
  const value = query[key]
  if (typeof value !== 'string' || value.length === 0) throw invalidQuery()
  return value
}

function positiveInteger(value: string | null, fallback: number | null) {
  if (value === null) return fallback
  if (!/^[1-9]\d*$/.test(value)) throw invalidQuery()
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw invalidQuery()
  return parsed
}

export function parseTicketListQuery(
  query: Record<string, unknown>,
): TicketListQuery {
  if (Object.keys(query).some((key) => !ALLOWED_QUERY_KEYS.has(key))) {
    throw invalidQuery()
  }

  const rawSearch = optionalValue(query, 'search')
  const search = rawSearch === null ? null : rawSearch.trim()
  if (search !== null && (search.length < 1 || search.length > 100)) {
    throw invalidQuery()
  }

  const categoryId = positiveInteger(optionalValue(query, 'categoryId'), null)
  const relatedSystemId = positiveInteger(
    optionalValue(query, 'relatedSystemId'),
    null,
  )
  const status = optionalValue(query, 'status')
  if (status !== null && status !== 'NEW') throw invalidQuery()

  const priority = optionalValue(query, 'priority')
  if (priority !== null && !PRIORITIES.has(priority)) throw invalidQuery()

  const sortBy = optionalValue(query, 'sortBy') ?? 'createdAt'
  if (!TICKET_SORT_FIELDS.includes(sortBy as TicketSortField)) {
    throw invalidQuery()
  }
  const sortOrder = optionalValue(query, 'sortOrder') ?? 'desc'
  if (sortOrder !== 'asc' && sortOrder !== 'desc') throw invalidQuery()

  const page = positiveInteger(optionalValue(query, 'page'), 1)
  const pageSize = positiveInteger(optionalValue(query, 'pageSize'), 10)
  if (
    page === null ||
    pageSize === null ||
    !TICKET_PAGE_SIZES.includes(pageSize as (typeof TICKET_PAGE_SIZES)[number])
  ) {
    throw invalidQuery()
  }

  return {
    search,
    categoryId,
    relatedSystemId,
    status: status as 'NEW' | null,
    priority: priority as TicketListQuery['priority'],
    sortBy: sortBy as TicketSortField,
    sortOrder,
    page,
    pageSize: pageSize as TicketListQuery['pageSize'],
  }
}
