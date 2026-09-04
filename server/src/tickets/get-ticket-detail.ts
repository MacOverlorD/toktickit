import type { RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'

const TICKET_NUMBER_PATTERN = /^TKT-\d{8}-[A-F0-9]{8}$/

function invalidTicketNumber() {
  return new ApiError(
    400,
    'INVALID_TICKET_NUMBER',
    'Provide a valid Ticket Number.',
  )
}

function ticketNotFound() {
  return new ApiError(
    404,
    'RESOURCE_NOT_FOUND',
    'Ticket was not found.',
  )
}

export const getTicketDetail: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const rawTicketNumber = request.params.ticketNumber
    if (typeof rawTicketNumber !== 'string') throw invalidTicketNumber()
    const ticketNumber = rawTicketNumber.trim().toUpperCase()
    if (!TICKET_NUMBER_PATTERN.test(ticketNumber)) {
      throw invalidTicketNumber()
    }

    const requester = response.locals.developmentRequester as { id: number }
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber,
        requesterId: requester.id,
      },
      select: {
        ticketNumber: true,
        createdAt: true,
        summary: true,
        requestedPriority: true,
        description: true,
        status: true,
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            removedAt: true,
            removalReason: true,
          },
        },
      },
    })

    if (!ticket) throw ticketNotFound()

    response.status(200).json({
      ticketNumber: ticket.ticketNumber,
      ticketDate: ticket.createdAt.toISOString(),
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      summary: ticket.summary,
      requestedPriority: ticket.requestedPriority,
      description: ticket.description,
      status: ticket.status,
      attachments: ticket.attachments.map((attachment) => ({
        ...attachment,
        isRemoved: attachment.removedAt !== null,
        createdAt: attachment.createdAt.toISOString(),
        removedAt: attachment.removedAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    next(error)
  }
}
