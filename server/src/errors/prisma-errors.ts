import { Prisma } from '@prisma/client'

export function isSerializationConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (
      error.code === 'P2034' ||
      (error.code === 'P2010' && error.meta?.code === '40001')
    )
  )
}
