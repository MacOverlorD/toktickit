import type { Prisma } from '@prisma/client'
import type { RequestHandler } from 'express'
import prisma from '../prisma.js'
import { parseTicketListQuery } from './ticket-query.js'

export const listTickets: RequestHandler = async (request, response, next) => {
  try {
    const requester = response.locals.developmentRequester as { id: number }
    const query = parseTicketListQuery(request.query)
    const where: Prisma.TicketWhereInput = {
      requesterId: requester.id,
      ...(query.search && {
        OR: [
          { ticketNumber: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.categoryId !== null && { categoryId: query.categoryId }),
      ...(query.relatedSystemId !== null && {
        relatedSystemId: query.relatedSystemId,
      }),
      ...(query.status !== null && { status: query.status }),
      ...(query.priority !== null && { requestedPriority: query.priority }),
    }
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      { id: query.sortOrder },
    ]

    const [totalItems, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          ticketNumber: true,
          createdAt: true,
          summary: true,
          requestedPriority: true,
          status: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          _count: {
            select: { attachments: { where: { removedAt: null } } },
          },
        },
      }),
    ])
    const totalPages = Math.ceil(totalItems / query.pageSize)

    response.status(200).json({
      items: tickets.map(({ _count, createdAt, ...ticket }) => ({
        ...ticket,
        createdAt: createdAt.toISOString(),
        attachmentCount: _count.attachments,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
      query: {
        search: query.search,
        categoryId: query.categoryId,
        relatedSystemId: query.relatedSystemId,
        status: query.status,
        priority: query.priority,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    })
  } catch (error) {
    next(error)
  }
}
