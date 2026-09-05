import type { RequestHandler } from 'express'
import prisma from '../prisma.js'

export interface DevelopmentRequester {
  id: number
  name: string
  email: string
}

function compareRequesterNames(
  first: DevelopmentRequester,
  second: DevelopmentRequester,
) {
  const firstName = first.name.toLocaleLowerCase('en-US')
  const secondName = second.name.toLocaleLowerCase('en-US')

  if (firstName < secondName) return -1
  if (firstName > secondName) return 1
  return first.id - second.id
}

export const listDevelopmentRequesters: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const requesters = await prisma.requester.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { id: 'asc' },
    })

    response.status(200).json([...requesters].sort(compareRequesterNames))
  } catch (error) {
    next(error)
  }
}
