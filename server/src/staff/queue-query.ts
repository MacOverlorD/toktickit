import { RequestedPriority, TicketStatus } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'

export const QUEUE_SORT_FIELDS = ['createdAt', 'updatedAt', 'ticketNumber', 'summary', 'itPriority'] as const
export interface QueueQuery {
  search: string | null
  categoryId: number | null
  relatedSystemId: number | null
  status: TicketStatus | null
  requestedPriority: RequestedPriority | null
  itPriority: RequestedPriority | null
  ownerId: number | 'unassigned' | null
  sortBy: typeof QUEUE_SORT_FIELDS[number]
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: 10 | 20 | 50
}

export function parseQueueQuery(query: Record<string, unknown>): QueueQuery {
  const allowed = ['search', 'categoryId', 'relatedSystemId', 'status', 'requestedPriority', 'itPriority', 'ownerId', 'sortBy', 'sortOrder', 'page', 'pageSize']
  function invalid(): never { throw new ApiError(400, 'INVALID_QUERY', 'Check the ticket queue query parameters and try again.') }
  if (Object.keys(query).some(key => !allowed.includes(key))) invalid()
  function scalar(key: string): string | null {
    if (!(key in query)) return null
    const value = query[key]
    if (typeof value !== 'string' || !value) invalid()
    return value as string
  }
  function integer(key: string, fallback: number | null, max = 2_147_483_647): number | null {
    const value = scalar(key)
    if (value === null) return fallback
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) invalid()
    return Number(value)
  }
  function enumeration<T extends string>(key: string, values: readonly T[]): T | null {
    const value = scalar(key)
    if (value !== null && !values.includes(value as T)) invalid()
    return value as T | null
  }
  const search = scalar('search')?.trim() ?? null
  if (search !== null && (!search || Array.from(search).length > 100)) invalid()
  const ownerId = scalar('ownerId') === 'unassigned' ? 'unassigned' : integer('ownerId', null)
  const pageSize = integer('pageSize', 10)
  if (![10, 20, 50].includes(pageSize!)) invalid()
  return {
    search,
    categoryId: integer('categoryId', null),
    relatedSystemId: integer('relatedSystemId', null),
    status: enumeration('status', Object.values(TicketStatus)),
    requestedPriority: enumeration('requestedPriority', Object.values(RequestedPriority)),
    itPriority: enumeration('itPriority', Object.values(RequestedPriority)),
    ownerId,
    sortBy: enumeration('sortBy', QUEUE_SORT_FIELDS) ?? 'updatedAt',
    sortOrder: enumeration('sortOrder', ['asc', 'desc']) ?? 'desc',
    page: integer('page', 1, 1_000_000)!,
    pageSize: pageSize as QueueQuery['pageSize'],
  }
}
