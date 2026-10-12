import { apiFetch } from './request'

export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ActionPerson {
  id?: number
  name: string
  role?: 'IT_STAFF' | 'ADMINISTRATOR'
}

export interface ActionTaken {
  id: number
  ticketNumber?: string
  ticketWorkCycle?: number
  actionAt: string | null
  description: string
  result: string | null
  status: ActionStatus
  createdBy: ActionPerson
  performedBy: ActionPerson | null
  assignedTo?: ActionPerson | null
  followUpRequired: boolean
  followUpNote: string | null
  attachmentNotes: string | null
  version?: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  cancelledAt?: string | null
}

export interface ActionDraft {
  actionAt?: string | null
  description: string
  result?: string | null
  assignedToUserId?: number | null
  followUpRequired: boolean
  followUpNote?: string | null
  attachmentNotes?: string | null
}

export class ActionsTakenError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message)
  }
}

async function json<T>(response: Response, fallback: string): Promise<T> {
  const body: any = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ActionsTakenError(
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? fallback,
      body?.error?.fieldErrors ?? {},
    )
  }
  return body as T
}

const ticketPath = (number: string) =>
  `/api/tickets/${encodeURIComponent(number)}/actions`
const staffPath = (number: string) =>
  `/api/staff/tickets/${encodeURIComponent(number)}/actions`

export async function listActionsTaken(number: string) {
  return (
    await json<{ items: ActionTaken[] }>(
      await apiFetch(ticketPath(number)),
      'Actions Taken could not be loaded.',
    )
  ).items
}

export async function createActionTaken(
  number: string,
  input: ActionDraft,
  idempotencyKey: string,
) {
  return (
    await json<{ item: ActionTaken }>(
      await apiFetch(staffPath(number), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(input),
      }),
      'The Action could not be created.',
    )
  ).item
}

export async function editActionTaken(
  number: string,
  id: number,
  input: Omit<ActionDraft, 'assignedToUserId'> & { expectedVersion: number },
) {
  return mutate(number, id, '', 'PATCH', input)
}

export async function assignActionTaken(
  number: string,
  id: number,
  assignedToUserId: number | null,
  expectedVersion: number,
) {
  return mutate(number, id, '/assignment', 'PATCH', {
    assignedToUserId,
    expectedVersion,
  })
}

export async function transitionActionTaken(
  number: string,
  id: number,
  transition: 'start' | 'cancel',
  expectedVersion: number,
) {
  return mutate(number, id, `/${transition}`, 'POST', { expectedVersion })
}

export async function completeActionTaken(
  number: string,
  id: number,
  expectedVersion: number,
  result: string,
  actionAt?: string | null,
) {
  return mutate(number, id, '/complete', 'POST', {
    expectedVersion,
    result,
    ...(actionAt !== undefined ? { actionAt } : {}),
  })
}

async function mutate(
  number: string,
  id: number,
  suffix: string,
  method: 'PATCH' | 'POST',
  body: object,
) {
  return (
    await json<{ item: ActionTaken }>(
      await apiFetch(`${staffPath(number)}/${id}${suffix}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      'The Action could not be updated.',
    )
  ).item
}
