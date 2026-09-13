import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { requireRole } from '../auth/auth-middleware.js'
import prisma from '../prisma.js'
import { parseQueueQuery } from './queue-query.js'

export const queueRouter = Router()
queueRouter.use(requireRole('IT_STAFF', 'ADMINISTRATOR'))
const ownerSelect = { id: true, name: true, role: true } as const
const ownerWhere: Prisma.UserWhereInput = {
  isActive: true,
  role: { in: ['IT_STAFF', 'ADMINISTRATOR'] },
}

queueRouter.get('/ticket-owners', async (_request, response, next) => {
  try {
    const items = await prisma.user.findMany({
      where: ownerWhere,
      select: ownerSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
    response.json({ items })
  } catch (error) {
    next(error)
  }
})

queueRouter.get('/tickets', async (request, response, next) => {
  try {
    const query = parseQueueQuery(request.query)
    const where: Prisma.TicketWhereInput = {
      ...(query.search !== null && {
        OR: [
          { ticketNumber: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { requester: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
      ...(query.categoryId !== null && { categoryId: query.categoryId }),
      ...(query.relatedSystemId !== null && { relatedSystemId: query.relatedSystemId }),
      ...(query.status !== null && { status: query.status }),
      ...(query.requestedPriority !== null && { requestedPriority: query.requestedPriority }),
      ...(query.itPriority !== null && { itPriority: query.itPriority }),
      ...(query.ownerId !== null && {
        ownerId: query.ownerId === 'unassigned' ? null : query.ownerId,
      }),
    }
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      { id: query.sortOrder },
    ]
    const referenceWhere = {
      OR: [{ isActive: true }, { tickets: { some: {} } }],
    }
    const result = await prisma.$transaction(async (transaction) => {
      const totalItems = await transaction.ticket.count({ where })
      const items = await transaction.ticket.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          ticketNumber: true,
          createdAt: true,
          updatedAt: true,
          summary: true,
          version: true,
          requestedPriority: true,
          itPriority: true,
          status: true,
          category: { select: { id: true, name: true } },
          owner: { select: ownerSelect },
        },
      })
      const categories = await transaction.category.findMany({
        where: referenceWhere,
        select: { id: true, name: true, isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      })
      const relatedSystems = await transaction.relatedSystem.findMany({
        where: referenceWhere,
        select: { id: true, name: true, isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      })
      const owners = await transaction.user.findMany({
        where: ownerWhere,
        select: ownerSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
      return { totalItems, items, filterOptions: { categories, relatedSystems, owners } }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    const totalPages = Math.ceil(result.totalItems / query.pageSize)
    response.json({
      items: result.items,
      query,
      filterOptions: result.filterOptions,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.totalItems,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})
