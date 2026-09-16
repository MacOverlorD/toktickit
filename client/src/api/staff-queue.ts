import { apiFetch } from './request'
import type { RequestedPriority, TicketStatus } from './tickets'

export type QueueSortField = 'createdAt' | 'updatedAt' | 'ticketNumber' | 'summary' | 'itPriority'
export interface StaffQueueQuery {
  search: string
  categoryId: number | null
  relatedSystemId: number | null
  status: TicketStatus | null
  requestedPriority: RequestedPriority | null
  itPriority: RequestedPriority | null
  ownerId: number | 'unassigned' | null
  sortBy: QueueSortField
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: 10 | 20 | 50
}
export interface StaffQueueResult {
  items: Array<{
    ticketNumber: string
    createdAt: string
    updatedAt: string
    summary: string
    version: number
    category: { id: number; name: string }
    requestedPriority: RequestedPriority
    itPriority: RequestedPriority
    status: TicketStatus
    owner: { id: number; name: string; role: 'IT_STAFF' | 'ADMINISTRATOR' } | null
  }>
  pagination: {
    page: number
    pageSize: 10 | 20 | 50
    totalItems: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
  filterOptions: {
    categories: Array<{ id: number; name: string; isActive: boolean }>
    relatedSystems: Array<{ id: number; name: string; isActive: boolean }>
    owners: Array<{ id: number; name: string; role: 'IT_STAFF' | 'ADMINISTRATOR' }>
  }
}

export const DEFAULT_STAFF_QUEUE_QUERY: StaffQueueQuery = {
  search: '', categoryId: null, relatedSystemId: null, status: null,
  requestedPriority: null, itPriority: null, ownerId: null,
  sortBy: 'updatedAt', sortOrder: 'desc', page: 1, pageSize: 10,
}

export function queueSearch(query: StaffQueueQuery) {
  const parameters = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== '' && value !== null) parameters.set(key, String(value))
  }
  return parameters
}

export async function getStaffQueue(query: StaffQueueQuery) {
  const response = await apiFetch('/api/staff/tickets?' + queueSearch(query))
  if (!response.ok) throw new Error(response.status === 403 ? 'FORBIDDEN' : 'FAILED')
  return response.json() as Promise<StaffQueueResult>
}
