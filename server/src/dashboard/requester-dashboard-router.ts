import { Router, type RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import { requireRole, authSession } from '../auth/auth-middleware.js'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'

const ACTIVE_STATUSES = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'REOPENED',
] as const
const RESOLVED_STATUSES = ['RESOLVED', 'CLOSED'] as const
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const ticketSummarySelect = {
  ticketNumber: true,
  summary: true,
  status: true,
  requestedPriority: true,
  updatedAt: true,
} satisfies Prisma.TicketSelect

function requesterDrillDown(asOf: Date) {
  return {
    open: '/tickets?scope=open',
    waitingForRequester: '/tickets?status=WAITING_FOR_REQUESTER',
    recentlyResolved: `/tickets?scope=recently-resolved&asOf=${encodeURIComponent(asOf.toISOString())}`,
  }
}

const getRequesterDashboard: RequestHandler = async (request, response, next) => {
  try {
    if (Object.keys(request.query).length > 0 || request.body !== undefined) {
      throw new ApiError(
        400,
        'INVALID_QUERY',
        'The requester dashboard does not accept request input.',
      )
    }
    const requesterId = authSession(response).user.id
    const asOf = new Date()
    const windowStart = new Date(asOf.getTime() - RECENT_WINDOW_MS)

    const result = await prisma.$transaction(async (transaction) => {
      const ownerWhere = { requesterId }
      const [open, waitingForRequester, recentlyResolved, recentTickets, attentionTickets] =
        await Promise.all([
          transaction.ticket.count({
            where: { ...ownerWhere, status: { in: [...ACTIVE_STATUSES] } },
          }),
          transaction.ticket.count({
            where: { ...ownerWhere, status: 'WAITING_FOR_REQUESTER' },
          }),
          transaction.ticket.count({
            where: {
              ...ownerWhere,
              status: { in: [...RESOLVED_STATUSES] },
              resolvedAt: { gte: windowStart, lte: asOf },
            },
          }),
          transaction.ticket.findMany({
            where: { ...ownerWhere, updatedAt: { lte: asOf } },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 10,
            select: ticketSummarySelect,
          }),
          transaction.ticket.findMany({
            where: {
              ...ownerWhere,
              status: 'WAITING_FOR_REQUESTER',
              updatedAt: { lte: asOf },
            },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 10,
            select: ticketSummarySelect,
          }),
        ])

      return {
        counts: { open, waitingForRequester, recentlyResolved },
        recentTickets,
        attentionTickets,
      }
    }, { isolationLevel: 'RepeatableRead' })

    const serializeTickets = (tickets: typeof result.recentTickets) =>
      tickets.map((ticket) => ({
        ...ticket,
        updatedAt: ticket.updatedAt.toISOString(),
      }))

    response.status(200).json({
      asOf: asOf.toISOString(),
      counts: result.counts,
      drillDown: requesterDrillDown(asOf),
      recentTickets: serializeTickets(result.recentTickets),
      attentionTickets: serializeTickets(result.attentionTickets),
    })
  } catch (error) {
    next(error)
  }
}

export const requesterDashboardRouter = Router()
requesterDashboardRouter.get(
  '/requester',
  requireRole('REQUESTER'),
  getRequesterDashboard,
)
