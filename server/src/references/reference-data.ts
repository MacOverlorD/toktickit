import type { RequestHandler } from 'express'
import prisma from '../prisma.js'

export const listCategories: RequestHandler = async (_request, response, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    })

    response.status(200).json(categories)
  } catch (error) {
    next(error)
  }
}

export const listRelatedSystems: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    })

    response.status(200).json(relatedSystems)
  } catch (error) {
    next(error)
  }
}
