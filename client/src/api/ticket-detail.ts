import { apiFetch } from './request'
import {
  TicketApiError,
  type RequestedPriority,
  type TicketStatus,
} from './tickets'

export interface TicketAttachmentMetadata {
  id: number
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  isRemoved: boolean
  removedAt: string | null
  removalReason: string | null
}

export interface TicketDetail {
  ticketNumber: string
  ticketDate: string
  requester: { id: number; name: string; email: string }
  category: { id: number; name: string }
  relatedSystem: { id: number; name: string }
  summary: string
  requestedPriority: RequestedPriority
  description: string
  status: TicketStatus
  attachments: TicketAttachmentMetadata[]
}

const priorities = new Set<unknown>(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
const ticketNumberPattern = /^TKT-\d{8}-[A-F0-9]{8}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function parseReference(value: unknown) {
  if (!isRecord(value) || !isPositiveInteger(value.id) ||
    typeof value.name !== 'string' || value.name.trim().length === 0) {
    return null
  }
  return { id: Number(value.id), name: value.name }
}

function parseRequester(value: unknown) {
  if (!isRecord(value) || !isPositiveInteger(value.id) ||
    typeof value.name !== 'string' || value.name.trim().length === 0 ||
    typeof value.email !== 'string' || value.email.trim().length === 0) {
    return null
  }
  return { id: Number(value.id), name: value.name, email: value.email }
}

function parseAttachment(value: unknown): TicketAttachmentMetadata | null {
  if (!isRecord(value) || !isPositiveInteger(value.id) ||
    typeof value.originalName !== 'string' || value.originalName.length === 0 ||
    typeof value.mimeType !== 'string' || value.mimeType.length === 0 ||
    !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 0 ||
    !isDate(value.createdAt) || typeof value.isRemoved !== 'boolean') {
    return null
  }
  const removed = value.removedAt !== null
  if ((removed && !isDate(value.removedAt)) ||
    value.isRemoved !== removed ||
    (!removed && value.removalReason !== null) ||
    (removed && (typeof value.removalReason !== 'string' ||
      value.removalReason.trim().length === 0))) {
    return null
  }
  return {
    id: Number(value.id),
    originalName: value.originalName,
    mimeType: value.mimeType,
    sizeBytes: Number(value.sizeBytes),
    createdAt: value.createdAt,
    isRemoved: value.isRemoved,
    removedAt: value.removedAt as string | null,
    removalReason: value.removalReason as string | null,
  }
}

function parseTicketDetail(value: unknown): TicketDetail | null {
  if (!isRecord(value) || typeof value.ticketNumber !== 'string' ||
    !ticketNumberPattern.test(value.ticketNumber) ||
    !isDate(value.ticketDate) || typeof value.summary !== 'string' ||
    !priorities.has(value.requestedPriority) ||
    typeof value.description !== 'string' || value.status !== 'NEW' ||
    !Array.isArray(value.attachments)) {
    return null
  }
  const requester = parseRequester(value.requester)
  const category = parseReference(value.category)
  const relatedSystem = parseReference(value.relatedSystem)
  const attachments = value.attachments.map(parseAttachment)
  if (!requester || !category || !relatedSystem || attachments.includes(null)) {
    return null
  }
  return {
    ticketNumber: value.ticketNumber,
    ticketDate: value.ticketDate,
    requester,
    category,
    relatedSystem,
    summary: value.summary,
    requestedPriority: value.requestedPriority as RequestedPriority,
    description: value.description,
    status: 'NEW',
    attachments: attachments as TicketAttachmentMetadata[],
  }
}

export async function getTicketDetail(
  ticketNumber: string,
  requesterId: number,
): Promise<TicketDetail> {
  const response = await apiFetch(
    `/api/tickets/${encodeURIComponent(ticketNumber)}`,
    { headers: { 'X-Development-Requester-Id': String(requesterId) } },
  )
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isRecord(body) && isRecord(body.error)) {
      throw new TicketApiError(
        typeof body.error.code === 'string' ? body.error.code : 'REQUEST_FAILED',
        typeof body.error.message === 'string'
          ? body.error.message
          : 'Ticket details could not be loaded.',
      )
    }
    throw new TicketApiError(
      'REQUEST_FAILED',
      'Ticket details could not be loaded.',
    )
  }

  const ticket = parseTicketDetail(body)
  if (!ticket) {
    throw new TicketApiError(
      'INVALID_RESPONSE',
      'The server returned invalid ticket details.',
    )
  }
  return ticket
}
