import type { RequestedPriority, TicketStatus } from './tickets'
import { apiFetch } from './request'

export interface RequesterDashboardTicket {
  ticketNumber: string
  summary: string
  status: TicketStatus
  requestedPriority: RequestedPriority
  updatedAt: string
}

export interface RequesterDashboardResult {
  asOf: string
  counts: {
    open: number
    waitingForRequester: number
    recentlyResolved: number
  }
  drillDown: {
    open: string
    waitingForRequester: string
    recentlyResolved: string
  }
  recentTickets: RequesterDashboardTicket[]
  attentionTickets: RequesterDashboardTicket[]
}

export class DashboardApiError extends Error {
  readonly code: string

  constructor(code = 'REQUEST_FAILED', message = 'Dashboard data could not be loaded.') {
    super(message)
    this.name = 'DashboardApiError'
    this.code = code
  }
}

const statuses = new Set([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
])
const priorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

function isCount(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isSafePath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/tickets')
}

function isTicket(value: unknown): value is RequesterDashboardTicket {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const ticket = value as Record<string, unknown>
  return (
    typeof ticket.ticketNumber === 'string' &&
    typeof ticket.summary === 'string' &&
    statuses.has(String(ticket.status)) &&
    priorities.has(String(ticket.requestedPriority)) &&
    typeof ticket.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(ticket.updatedAt))
  )
}

function isDashboardResult(value: unknown): value is RequesterDashboardResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  if (typeof result.asOf !== 'string' || Number.isNaN(Date.parse(result.asOf))) return false
  if (typeof result.counts !== 'object' || result.counts === null) return false
  if (typeof result.drillDown !== 'object' || result.drillDown === null) return false
  const counts = result.counts as Record<string, unknown>
  const drillDown = result.drillDown as Record<string, unknown>
  return (
    isCount(counts.open) &&
    isCount(counts.waitingForRequester) &&
    isCount(counts.recentlyResolved) &&
    isSafePath(drillDown.open) &&
    isSafePath(drillDown.waitingForRequester) &&
    isSafePath(drillDown.recentlyResolved) &&
    Array.isArray(result.recentTickets) &&
    result.recentTickets.every(isTicket) &&
    Array.isArray(result.attentionTickets) &&
    result.attentionTickets.every(isTicket)
  )
}

export async function getRequesterDashboard(): Promise<RequesterDashboardResult> {
  const response = await apiFetch('/api/dashboard/requester')
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = typeof body === 'object' && body !== null
      ? (body as { error?: { code?: unknown; message?: unknown } }).error
      : undefined
    throw new DashboardApiError(
      typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error?.message === 'string'
        ? error.message
        : 'Dashboard data could not be loaded.',
    )
  }
  if (!isDashboardResult(body)) {
    throw new DashboardApiError('INVALID_RESPONSE', 'The server returned invalid dashboard data.')
  }
  return body
}
