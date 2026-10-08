import type { RequestedPriority, TicketStatus } from './tickets'
import { apiFetch } from './request'

export interface OperationsTicket {
  ticketNumber: string
  summary: string
  status: TicketStatus
  itPriority: RequestedPriority
  owner: { id: number; name: string; role: 'IT_STAFF' | 'ADMINISTRATOR' } | null
  updatedAt: string
}

export interface AssignedActionSummary {
  id: number
  ticketNumber: string
  description: string
  status: 'PLANNED' | 'IN_PROGRESS'
  assignedTo: { id: number; name: string; role: 'IT_STAFF' | 'ADMINISTRATOR' }
  updatedAt: string
}

export interface PerformedActionSummary {
  id: number
  ticketNumber: string
  description: string
  status: 'COMPLETED'
  performedBy: { id: number; name: string; role: 'IT_STAFF' | 'ADMINISTRATOR' }
  completedAt: string
}

export interface OperationsDashboardResult {
  asOf: string
  counts: {
    unassigned: number
    ownedByMe: number
    myAssignedActions: number
    myPerformedLast7Days: number
  }
  byStatus: Record<TicketStatus, number>
  byPriority: Record<RequestedPriority, number>
  myActions: AssignedActionSummary[]
  myPerformedActions: PerformedActionSummary[]
  recentTickets: OperationsTicket[]
  urgentTickets: OperationsTicket[]
  administration?: {
    activeRequesters: number
    activeStaff: number
    activeAdministrators: number
    inactiveAccounts: number
  }
}

const statuses: TicketStatus[] = [
  'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER',
  'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
]
const priorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const actionStatuses = new Set(['PLANNED', 'IN_PROGRESS'])

function isNonnegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isPerson(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const person = value as Record<string, unknown>
  return Number.isSafeInteger(person.id) && typeof person.name === 'string' &&
    (person.role === 'IT_STAFF' || person.role === 'ADMINISTRATOR')
}

function isTicket(value: unknown): value is OperationsTicket {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const ticket = value as Record<string, unknown>
  return typeof ticket.ticketNumber === 'string' && typeof ticket.summary === 'string' &&
    statuses.includes(ticket.status as TicketStatus) &&
    priorities.includes(ticket.itPriority as RequestedPriority) &&
    (ticket.owner === null || isPerson(ticket.owner)) && isDate(ticket.updatedAt)
}

function isAction(value: unknown): value is AssignedActionSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const action = value as Record<string, unknown>
  return Number.isSafeInteger(action.id) && typeof action.ticketNumber === 'string' &&
    typeof action.description === 'string' && actionStatuses.has(String(action.status)) &&
    isPerson(action.assignedTo) && isDate(action.updatedAt)
}

function isPerformedAction(value: unknown): value is PerformedActionSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const action = value as Record<string, unknown>
  return Number.isSafeInteger(action.id) && typeof action.ticketNumber === 'string' &&
    typeof action.description === 'string' && action.status === 'COMPLETED' &&
    isPerson(action.performedBy) && isDate(action.completedAt)
}

function hasCounts(value: unknown, keys: string[]) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const counts = value as Record<string, unknown>
  return keys.every((key) => isNonnegativeInteger(counts[key]))
}

function isResult(value: unknown): value is OperationsDashboardResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  return isDate(result.asOf) &&
    hasCounts(result.counts, ['unassigned', 'ownedByMe', 'myAssignedActions', 'myPerformedLast7Days']) &&
    hasCounts(result.byStatus, statuses) && hasCounts(result.byPriority, priorities) &&
    Array.isArray(result.myActions) && result.myActions.every(isAction) &&
    Array.isArray(result.myPerformedActions) && result.myPerformedActions.every(isPerformedAction) &&
    Array.isArray(result.recentTickets) && result.recentTickets.every(isTicket) &&
    Array.isArray(result.urgentTickets) && result.urgentTickets.every(isTicket) &&
    (result.administration === undefined || hasCounts(result.administration, [
      'activeRequesters', 'activeStaff', 'activeAdministrators', 'inactiveAccounts',
    ]))
}

export async function getOperationsDashboard(): Promise<OperationsDashboardResult> {
  const response = await apiFetch('/api/dashboard/operations')
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error('The operational dashboard could not be loaded.')
  if (!isResult(body)) throw new Error('The server returned invalid operational dashboard data.')
  return body
}
