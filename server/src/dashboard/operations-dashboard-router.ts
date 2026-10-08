import { Prisma } from '@prisma/client'
import { Router, type RequestHandler } from 'express'
import { authSession, requireRole } from '../auth/auth-middleware.js'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'

const ACTIVE_STATUSES = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'REOPENED',
] as const
const ALL_STATUSES = [
  ...ACTIVE_STATUSES,
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
] as const
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const ownerSelect = { id: true, name: true, role: true } as const
const ticketSelect = {
  ticketNumber: true,
  summary: true,
  status: true,
  itPriority: true,
  owner: { select: ownerSelect },
  updatedAt: true,
} satisfies Prisma.TicketSelect

interface AssignedActionRow {
  id: number
  ticketNumber: string
  description: string
  status: 'PLANNED' | 'IN_PROGRESS'
  assignedToId: number
  assignedToName: string
  assignedToRole: 'IT_STAFF' | 'ADMINISTRATOR'
  updatedAt: Date
}

function emptyRecord<T extends readonly string[]>(keys: T) {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T[number], number>
}

const getOperationsDashboard: RequestHandler = async (request, response, next) => {
  try {
    if (Object.keys(request.query).length > 0 || request.body !== undefined) {
      throw new ApiError(
        400,
        'INVALID_QUERY',
        'The operational dashboard does not accept request input.',
      )
    }

    const actor = authSession(response).user
    const asOf = new Date()
    const windowStart = new Date(asOf.getTime() - RECENT_WINDOW_MS)

    const result = await prisma.$transaction(async (transaction) => {
      const activeWhere: Prisma.TicketWhereInput = {
        status: { in: [...ACTIVE_STATUSES] },
        updatedAt: { lte: asOf },
      }
      const [
        unassigned,
        ownedByMe,
        statusGroups,
        priorityGroups,
        assignedCountRows,
        performedLast7Days,
        assignedActionRows,
        recentTickets,
        urgentTickets,
        userGroups,
      ] = await Promise.all([
        transaction.ticket.count({ where: { ...activeWhere, ownerId: null } }),
        transaction.ticket.count({ where: { ...activeWhere, ownerId: actor.id } }),
        transaction.ticket.groupBy({
          by: ['status'],
          where: { updatedAt: { lte: asOf } },
          _count: { _all: true },
        }),
        transaction.ticket.groupBy({
          by: ['itPriority'],
          where: activeWhere,
          _count: { _all: true },
        }),
        transaction.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM "ActionTaken" action
          JOIN "Ticket" ticket ON ticket.id = action."ticketId"
          WHERE action."assignedToId" = ${actor.id}
            AND action.status IN ('PLANNED', 'IN_PROGRESS')
            AND action."ticketWorkCycle" = ticket."workCycle"
            AND ticket.status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')
            AND action."updatedAt" <= ${asOf}
            AND ticket."updatedAt" <= ${asOf}
        `),
        transaction.actionTaken.count({
          where: {
            performedById: actor.id,
            status: 'COMPLETED',
            completedAt: { gte: windowStart, lte: asOf },
          },
        }),
        transaction.$queryRaw<AssignedActionRow[]>(Prisma.sql`
          SELECT action.id,
                 ticket."ticketNumber",
                 action.description,
                 action.status::text AS status,
                 assignee.id AS "assignedToId",
                 assignee.name AS "assignedToName",
                 assignee.role::text AS "assignedToRole",
                 action."updatedAt"
          FROM "ActionTaken" action
          JOIN "Ticket" ticket ON ticket.id = action."ticketId"
          JOIN "User" assignee ON assignee.id = action."assignedToId"
          WHERE action."assignedToId" = ${actor.id}
            AND action.status IN ('PLANNED', 'IN_PROGRESS')
            AND action."ticketWorkCycle" = ticket."workCycle"
            AND ticket.status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')
            AND action."updatedAt" <= ${asOf}
            AND ticket."updatedAt" <= ${asOf}
          ORDER BY action."updatedAt" DESC, action.id DESC
          LIMIT 10
        `),
        transaction.ticket.findMany({
          where: { updatedAt: { lte: asOf } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 10,
          select: ticketSelect,
        }),
        transaction.ticket.findMany({
          where: { ...activeWhere, itPriority: 'URGENT' },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 10,
          select: ticketSelect,
        }),
        actor.role === 'ADMINISTRATOR'
          ? transaction.user.groupBy({
              by: ['role', 'isActive'],
              where: { updatedAt: { lte: asOf } },
              _count: { _all: true },
            })
          : Promise.resolve([]),
      ])

      return {
        unassigned,
        ownedByMe,
        statusGroups,
        priorityGroups,
        myAssignedActions: assignedCountRows[0]?.count ?? 0,
        myPerformedLast7Days: performedLast7Days,
        assignedActionRows,
        recentTickets,
        urgentTickets,
        userGroups,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })

    const byStatus = emptyRecord(ALL_STATUSES)
    for (const group of result.statusGroups) byStatus[group.status] = group._count._all
    const byPriority = emptyRecord(PRIORITIES)
    for (const group of result.priorityGroups) byPriority[group.itPriority] = group._count._all

    const serializeTickets = (tickets: typeof result.recentTickets) =>
      tickets.map((ticket) => ({
        ...ticket,
        updatedAt: ticket.updatedAt.toISOString(),
      }))

    const administration = actor.role === 'ADMINISTRATOR'
      ? {
          activeRequesters: result.userGroups.find(
            (group) => group.isActive && group.role === 'REQUESTER',
          )?._count._all ?? 0,
          activeStaff: result.userGroups.find(
            (group) => group.isActive && group.role === 'IT_STAFF',
          )?._count._all ?? 0,
          activeAdministrators: result.userGroups.find(
            (group) => group.isActive && group.role === 'ADMINISTRATOR',
          )?._count._all ?? 0,
          inactiveAccounts: result.userGroups
            .filter((group) => !group.isActive)
            .reduce((total, group) => total + group._count._all, 0),
        }
      : undefined

    response.status(200).json({
      asOf: asOf.toISOString(),
      counts: {
        unassigned: result.unassigned,
        ownedByMe: result.ownedByMe,
        myAssignedActions: result.myAssignedActions,
        myPerformedLast7Days: result.myPerformedLast7Days,
      },
      byStatus,
      byPriority,
      myActions: result.assignedActionRows.map((action) => ({
        id: action.id,
        ticketNumber: action.ticketNumber,
        description: action.description,
        status: action.status,
        assignedTo: {
          id: action.assignedToId,
          name: action.assignedToName,
          role: action.assignedToRole,
        },
        updatedAt: action.updatedAt.toISOString(),
      })),
      recentTickets: serializeTickets(result.recentTickets),
      urgentTickets: serializeTickets(result.urgentTickets),
      ...(administration && { administration }),
    })
  } catch (error) {
    next(error)
  }
}

export const operationsDashboardRouter = Router()
operationsDashboardRouter.get(
  '/operations',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  getOperationsDashboard,
)
