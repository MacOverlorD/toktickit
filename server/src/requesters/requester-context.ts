import type { RequestHandler } from 'express'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'

export const DEVELOPMENT_REQUESTER_HEADER = 'x-development-requester-id'

// Mount this middleware on every requester-owned ticket and attachment router
// when those routes are introduced in the following Lab 2 implementation Issues.

const invalidRequesterContext = () =>
  new ApiError(
    400,
    'INVALID_REQUESTER_CONTEXT',
    'Select an active Development Requester.',
  )

function parseRequesterId(headerValue: string | string[] | undefined) {
  if (typeof headerValue !== 'string' || !/^[1-9]\d*$/.test(headerValue)) {
    return null
  }

  const requesterId = Number(headerValue)
  return Number.isSafeInteger(requesterId) ? requesterId : null
}

export const requireDevelopmentRequester: RequestHandler = async (
  request,
  response,
  next,
) => {
  const requesterId = parseRequesterId(
    request.headers[DEVELOPMENT_REQUESTER_HEADER],
  )

  if (requesterId === null) {
    next(invalidRequesterContext())
    return
  }

  try {
    const requester = await prisma.requester.findFirst({
      where: {
        id: requesterId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!requester) {
      next(invalidRequesterContext())
      return
    }

    response.locals.developmentRequester = requester
    next()
  } catch (error) {
    next(error)
  }
}
