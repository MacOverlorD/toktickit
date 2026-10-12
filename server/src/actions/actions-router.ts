import type { Prisma, UserRole } from '@prisma/client'
import { Prisma as PrismaNamespace } from '@prisma/client'
import { Router } from 'express'
import { authSession, requireRole } from '../auth/auth-middleware.js'
import { ApiError } from '../errors/api-error.js'
import { isSerializationConflict } from '../errors/prisma-errors.js'
import prisma from '../prisma.js'
import { notFound, parseTicketNumber, requireOperationalActor, stale } from '../tickets/ticket-domain.js'
import {
  ACTIVE_TICKET_STATUSES,
  EDITABLE_ACTION_STATUSES,
  parseActionId,
  rejectQuery,
  validateAssignment,
  validateCompletion,
  validateCreateAction,
  validateEditAction,
  validateExpectedVersion,
} from './action-domain.js'

export const actionsRouter = Router()

const userSelect = { id: true, name: true } as const
const assigneeSelect = { id: true, name: true, role: true } as const
const actionSelect = {
  id: true,
  ticketWorkCycle: true,
  actionAt: true,
  description: true,
  result: true,
  status: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdBy: { select: userSelect },
  performedBy: { select: userSelect },
  assignedTo: { select: assigneeSelect },
  ticket: { select: { ticketNumber: true } },
} as const

function actionDto(item: any, role: UserRole) {
  const common = {
    id: item.id,
    actionAt: item.actionAt?.toISOString() ?? null,
    description: item.description,
    result: item.result,
    status: item.status,
    createdBy: role === 'REQUESTER' ? { name: item.createdBy.name } : item.createdBy,
    performedBy: item.performedBy
      ? role === 'REQUESTER'
        ? { name: item.performedBy.name }
        : item.performedBy
      : null,
    followUpRequired: item.followUpRequired,
    followUpNote: item.followUpNote,
    attachmentNotes: item.attachmentNotes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    completedAt: item.completedAt?.toISOString() ?? null,
  }
  if (role === 'REQUESTER') return common
  return {
    ...common,
    ticketNumber: item.ticket.ticketNumber,
    ticketWorkCycle: item.ticketWorkCycle,
    assignedTo: item.assignedTo,
    version: item.version,
    cancelledAt: item.cancelledAt?.toISOString() ?? null,
  }
}

async function serializable<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === 2)
        throw isSerializationConflict(error)
          ? new ApiError(409, 'STALE_RESOURCE', 'The action changed concurrently. Reload and try again.')
          : error
    }
  }
  throw new Error('Transaction retry exhausted.')
}

async function lockTicket(transaction: Prisma.TransactionClient, ticketNumber: string) {
  const rows = await transaction.$queryRaw<Array<{ id: number }>>(
    PrismaNamespace.sql`SELECT "id" FROM "Ticket" WHERE "ticketNumber" = ${ticketNumber} FOR UPDATE`,
  )
  if (!rows[0]) throw notFound()
  return transaction.ticket.findUniqueOrThrow({
    where: { id: rows[0].id },
    select: { id: true, status: true, workCycle: true },
  })
}

async function lockAction(
  transaction: Prisma.TransactionClient,
  ticketId: number,
  actionId: number,
) {
  const rows = await transaction.$queryRaw<Array<{ id: number }>>(
    PrismaNamespace.sql`SELECT "id" FROM "ActionTaken" WHERE "id" = ${actionId} AND "ticketId" = ${ticketId} FOR UPDATE`,
  )
  if (!rows[0]) throw notFound()
  return transaction.actionTaken.findUniqueOrThrow({
    where: { id: rows[0].id },
    select: {
      id: true,
      ticketWorkCycle: true,
      status: true,
      actionAt: true,
      description: true,
      result: true,
      followUpRequired: true,
      followUpNote: true,
      attachmentNotes: true,
      assignedToId: true,
      version: true,
    },
  })
}

function ensureActiveTicket(status: string) {
  if (!ACTIVE_TICKET_STATUSES.has(status as any))
    throw new ApiError(409, 'ACTION_NOT_EDITABLE', 'Actions are read-only in the current Ticket state.')
}

function requireJsonRequest(request: any) {
  if (!request.is('application/json'))
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for this request.')
}

function ensureEditable(action: { status: string; ticketWorkCycle: number }, ticket: { status: string; workCycle: number }) {
  ensureActiveTicket(ticket.status)
  if (
    !EDITABLE_ACTION_STATUSES.has(action.status as any) ||
    action.ticketWorkCycle !== ticket.workCycle
  )
    throw new ApiError(409, 'ACTION_NOT_EDITABLE', 'This Action can no longer be changed.')
}

async function requireEligibleAssignee(transaction: Prisma.TransactionClient, id: number | null) {
  if (id === null) return
  const user = await transaction.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  })
  if (!user || !user.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(user.role))
    throw new ApiError(409, 'INELIGIBLE_ASSIGNEE', 'Choose an active IT Staff or Administrator assignee.')
}

async function selectedAction(transaction: Prisma.TransactionClient, id: number) {
  return transaction.actionTaken.findUniqueOrThrow({ where: { id }, select: actionSelect })
}

async function accessibleTicket(ticketNumber: string, actor: { id: number; role: UserRole }) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      ticketNumber,
      ...(actor.role === 'REQUESTER' ? { requesterId: actor.id } : {}),
    },
    select: { id: true },
  })
  if (!ticket) throw notFound()
  return ticket
}

actionsRouter.get('/tickets/:ticketNumber/actions', async (request, response, next) => {
  try {
    rejectQuery(request.query as Record<string, unknown>)
    const actor = authSession(response).user
    const ticket = await accessibleTicket(parseTicketNumber(request.params.ticketNumber), actor)
    const items = await prisma.actionTaken.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: actionSelect,
    })
    response.json({ items: items.map((item) => actionDto(item, actor.role)) })
  } catch (error) {
    next(error)
  }
})

actionsRouter.get('/tickets/:ticketNumber/actions/:actionId', async (request, response, next) => {
  try {
    rejectQuery(request.query as Record<string, unknown>)
    const actor = authSession(response).user
    const ticket = await accessibleTicket(parseTicketNumber(request.params.ticketNumber), actor)
    const item = await prisma.actionTaken.findFirst({
      where: { id: parseActionId(request.params.actionId), ticketId: ticket.id },
      select: actionSelect,
    })
    if (!item) throw notFound()
    response.json({ item: actionDto(item, actor.role) })
  } catch (error) {
    next(error)
  }
})

actionsRouter.post(
  '/staff/tickets/:ticketNumber/actions',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  async (request, response, next) => {
    try {
      rejectQuery(request.query as Record<string, unknown>)
      const ticketNumber = parseTicketNumber(request.params.ticketNumber)
      const actorId = authSession(response).user.id
      const result = await serializable(async (transaction) => {
        const actor = await requireOperationalActor(transaction, actorId)
        const ticket = await lockTicket(transaction, ticketNumber)
        requireJsonRequest(request)
        const input = validateCreateAction(request.body, request.header('Idempotency-Key'), new Date())
        const existing = await transaction.actionTaken.findUnique({
          where: {
            ticketId_createdById_idempotencyKey: {
              ticketId: ticket.id,
              createdById: actor.id,
              idempotencyKey: input.idempotencyKey,
            },
          },
          select: { id: true, requestFingerprint: true },
        })
        if (existing) {
          if (existing.requestFingerprint !== input.requestFingerprint)
            throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'The idempotency key was already used with different Action data.')
          return { created: false, item: await selectedAction(transaction, existing.id) }
        }
        ensureActiveTicket(ticket.status)
        await requireEligibleAssignee(transaction, input.assignedToId)
        const created = await transaction.actionTaken.create({
          data: {
            ticketId: ticket.id,
            ticketWorkCycle: ticket.workCycle,
            actionAt: input.actionAt,
            description: input.description,
            result: input.result,
            createdById: actor.id,
            assignedToId: input.assignedToId,
            followUpRequired: input.followUpRequired,
            followUpNote: input.followUpNote,
            attachmentNotes: input.attachmentNotes,
            idempotencyKey: input.idempotencyKey,
            requestFingerprint: input.requestFingerprint,
          },
          select: { id: true },
        })
        return { created: true, item: await selectedAction(transaction, created.id) }
      })
      response.status(result.created ? 201 : 200).json({ item: actionDto(result.item, authSession(response).user.role) })
    } catch (error) {
      next(error)
    }
  },
)

type MutationKind = 'edit' | 'assignment' | 'start' | 'complete' | 'cancel'

async function mutateAction(request: any, response: any, kind: MutationKind) {
  rejectQuery(request.query as Record<string, unknown>)
  const ticketNumber = parseTicketNumber(request.params.ticketNumber)
  const actionId = parseActionId(request.params.actionId)
  const actorId = authSession(response).user.id
  return serializable(async (transaction) => {
    const actor = await requireOperationalActor(transaction, actorId)
    const ticket = await lockTicket(transaction, ticketNumber)
    const action = await lockAction(transaction, ticket.id, actionId)
    requireJsonRequest(request)
    const now = new Date()

    if (kind === 'edit') {
      const input = validateEditAction(request.body, action, now)
      if (action.version !== input.expectedVersion) throw stale()
      ensureEditable(action, ticket)
      await transaction.actionTaken.update({
        where: { id: action.id },
        data: { ...input.data, version: { increment: 1 } },
      })
    } else if (kind === 'assignment') {
      const input = validateAssignment(request.body)
      if (action.version !== input.expectedVersion) throw stale()
      ensureEditable(action, ticket)
      await requireEligibleAssignee(transaction, input.assignedToId)
      if (action.assignedToId !== input.assignedToId)
        await transaction.actionTaken.update({
          where: { id: action.id },
          data: { assignedToId: input.assignedToId, version: { increment: 1 } },
        })
    } else if (kind === 'start') {
      const expectedVersion = validateExpectedVersion(request.body)
      if (action.version !== expectedVersion) throw stale()
      ensureEditable(action, ticket)
      if (action.status !== 'PLANNED')
        throw new ApiError(409, 'INVALID_ACTION_TRANSITION', 'That Action transition is not permitted.')
      await transaction.actionTaken.update({
        where: { id: action.id },
        data: { status: 'IN_PROGRESS', version: { increment: 1 } },
      })
    } else if (kind === 'complete') {
      const input = validateCompletion(request.body, now)
      if (action.version !== input.expectedVersion) throw stale()
      ensureEditable(action, ticket)
      await transaction.actionTaken.update({
        where: { id: action.id },
        data: {
          status: 'COMPLETED',
          result: input.result,
          actionAt: input.actionAt,
          performedById: actor.id,
          completedAt: now,
          version: { increment: 1 },
        },
      })
    } else {
      const expectedVersion = validateExpectedVersion(request.body)
      if (action.version !== expectedVersion) throw stale()
      ensureEditable(action, ticket)
      await transaction.actionTaken.update({
        where: { id: action.id },
        data: { status: 'CANCELLED', cancelledAt: now, version: { increment: 1 } },
      })
    }
    return selectedAction(transaction, action.id)
  })
}

function mutationRoute(path: string, kind: MutationKind, method: 'patch' | 'post') {
  actionsRouter[method](
    path,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (request, response, next) => {
      try {
        const item = await mutateAction(request, response, kind)
        response.json({ item: actionDto(item, authSession(response).user.role) })
      } catch (error) {
        next(error)
      }
    },
  )
}

mutationRoute('/staff/tickets/:ticketNumber/actions/:actionId', 'edit', 'patch')
mutationRoute('/staff/tickets/:ticketNumber/actions/:actionId/assignment', 'assignment', 'patch')
mutationRoute('/staff/tickets/:ticketNumber/actions/:actionId/start', 'start', 'post')
mutationRoute('/staff/tickets/:ticketNumber/actions/:actionId/complete', 'complete', 'post')
mutationRoute('/staff/tickets/:ticketNumber/actions/:actionId/cancel', 'cancel', 'post')
