import { createHash } from 'node:crypto'
import type { ActionStatus, TicketStatus } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'
import { positiveVersion, requireExactBody } from '../tickets/ticket-domain.js'

export const ACTIVE_TICKET_STATUSES = new Set<TicketStatus>([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'REOPENED',
])

export const EDITABLE_ACTION_STATUSES = new Set<ActionStatus>([
  'PLANNED',
  'IN_PROGRESS',
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INVALID_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u

export interface ActionTextState {
  actionAt: Date | null
  description: string
  result: string | null
  followUpRequired: boolean
  followUpNote: string | null
  attachmentNotes: string | null
}

export interface CreateActionInput extends ActionTextState {
  assignedToId: number | null
  idempotencyKey: string
  requestFingerprint: string
}

function validation(fieldErrors: Record<string, string>) {
  return new ApiError(
    400,
    'VALIDATION_ERROR',
    'Review the highlighted fields.',
    fieldErrors,
  )
}

function text(
  value: unknown,
  field: string,
  maximum: number,
  options: { required?: boolean; nullable?: boolean } = {},
) {
  if (value === undefined && !options.required) return undefined
  if (value === null && options.nullable) return null
  if (typeof value !== 'string')
    throw validation({ [field]: `${field} must be text${options.nullable ? ' or null' : ''}.` })
  const normalized = value.trim()
  const length = Array.from(normalized).length
  if (INVALID_SURROGATE.test(normalized) || length < 1 || length > maximum)
    throw validation({ [field]: `${field} must contain 1 to ${maximum} characters.` })
  return normalized
}

function optionalInstant(value: unknown, now: Date) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string')
    throw validation({ actionAt: 'Action date/time must be an ISO-8601 instant or null.' })
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime() + 5 * 60_000)
    throw validation({ actionAt: 'Action date/time must be valid and no more than five minutes in the future.' })
  return parsed
}

function optionalPositiveId(value: unknown, field: string) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw validation({ [field]: `${field} must be a positive integer or null.` })
  return Number(value)
}

function validateFollowUp(followUpRequired: boolean, followUpNote: string | null) {
  if (followUpRequired && followUpNote === null)
    throw validation({ followUpNote: 'Follow-up note is required when follow-up is selected.' })
  if (!followUpRequired && followUpNote !== null)
    throw validation({ followUpNote: 'Follow-up note must be null when follow-up is not required.' })
}

export function parseActionId(raw: string | string[] | undefined) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw))
    throw validation({ actionId: 'Action ID must be a positive integer.' })
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0)
    throw validation({ actionId: 'Action ID must be a positive integer.' })
  return value
}

export function parseIdempotencyKey(value: string | undefined) {
  if (!value || !UUID_PATTERN.test(value))
    throw validation({ idempotencyKey: 'Provide one valid UUID Idempotency-Key header.' })
  return value.toLowerCase()
}

export function rejectQuery(query: Record<string, unknown>) {
  if (Object.keys(query).length)
    throw new ApiError(400, 'INVALID_QUERY', 'This endpoint does not accept query parameters.')
}

export function validateCreateAction(body: unknown, idempotencyHeader: string | undefined, now: Date): CreateActionInput {
  const value = requireExactBody(body, [
    'actionAt',
    'description',
    'result',
    'assignedToUserId',
    'followUpRequired',
    'followUpNote',
    'attachmentNotes',
  ])
  if (typeof value.followUpRequired !== 'boolean')
    throw validation({ followUpRequired: 'Follow-up Required must be true or false.' })
  const actionAt = optionalInstant(value.actionAt, now) ?? null
  const description = text(value.description, 'description', 2000, { required: true }) as string
  const result = (text(value.result, 'result', 4000, { nullable: true }) ?? null) as string | null
  const assignedToId = optionalPositiveId(value.assignedToUserId, 'assignedToUserId') ?? null
  const followUpNote = (text(value.followUpNote, 'followUpNote', 1000, { nullable: true }) ?? null) as string | null
  const attachmentNotes = (text(value.attachmentNotes, 'attachmentNotes', 1000, { nullable: true }) ?? null) as string | null
  validateFollowUp(value.followUpRequired, followUpNote)
  const idempotencyKey = parseIdempotencyKey(idempotencyHeader)
  const canonical = JSON.stringify({
    actionAt: actionAt?.toISOString() ?? null,
    description,
    result,
    assignedToUserId: assignedToId,
    followUpRequired: value.followUpRequired,
    followUpNote,
    attachmentNotes,
  })
  return {
    actionAt,
    description,
    result,
    assignedToId,
    followUpRequired: value.followUpRequired,
    followUpNote,
    attachmentNotes,
    idempotencyKey,
    requestFingerprint: createHash('sha256').update(canonical).digest('hex'),
  }
}

export function validateEditAction(body: unknown, current: ActionTextState, now: Date) {
  const value = requireExactBody(body, [
    'actionAt',
    'description',
    'result',
    'followUpRequired',
    'followUpNote',
    'attachmentNotes',
    'expectedVersion',
  ])
  const editable = ['actionAt', 'description', 'result', 'followUpRequired', 'followUpNote', 'attachmentNotes']
  if (!editable.some((key) => Object.hasOwn(value, key)))
    throw validation({ body: 'Provide at least one editable field.' })
  if (value.followUpRequired !== undefined && typeof value.followUpRequired !== 'boolean')
    throw validation({ followUpRequired: 'Follow-up Required must be true or false.' })
  const next = {
    actionAt: optionalInstant(value.actionAt, now) ?? current.actionAt,
    description: (text(value.description, 'description', 2000) ?? current.description) as string,
    result: (text(value.result, 'result', 4000, { nullable: true }) ?? current.result) as string | null,
    followUpRequired: value.followUpRequired === undefined ? current.followUpRequired : value.followUpRequired,
    followUpNote: (text(value.followUpNote, 'followUpNote', 1000, { nullable: true }) ?? current.followUpNote) as string | null,
    attachmentNotes: (text(value.attachmentNotes, 'attachmentNotes', 1000, { nullable: true }) ?? current.attachmentNotes) as string | null,
  }
  if (value.actionAt === null) next.actionAt = null
  if (value.result === null) next.result = null
  if (value.followUpNote === null) next.followUpNote = null
  if (value.attachmentNotes === null) next.attachmentNotes = null
  validateFollowUp(next.followUpRequired, next.followUpNote)
  return { expectedVersion: positiveVersion(value.expectedVersion), data: next }
}

export function validateAssignment(body: unknown) {
  const value = requireExactBody(body, ['assignedToUserId', 'expectedVersion'])
  const assignedToId = optionalPositiveId(value.assignedToUserId, 'assignedToUserId')
  if (assignedToId === undefined)
    throw validation({ assignedToUserId: 'assignedToUserId is required.' })
  return { assignedToId, expectedVersion: positiveVersion(value.expectedVersion) }
}

export function validateExpectedVersion(body: unknown) {
  return positiveVersion(requireExactBody(body, ['expectedVersion']).expectedVersion)
}

export function validateCompletion(body: unknown, now: Date) {
  const value = requireExactBody(body, ['expectedVersion', 'result', 'actionAt'])
  const result = text(value.result, 'result', 4000, { required: true }) as string
  const actionAt = optionalInstant(value.actionAt, now) ?? now
  return { expectedVersion: positiveVersion(value.expectedVersion), result, actionAt }
}
