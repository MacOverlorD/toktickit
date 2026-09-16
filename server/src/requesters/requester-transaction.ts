import { Prisma, UserRole } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'

export async function requireActiveRequesterInTransaction(
  transaction: Prisma.TransactionClient,
  userId: number,
) {
  const quote = String.fromCharCode(34)
  const query =
    'SELECT ' + quote + 'id' + quote + ', ' +
    quote + 'role' + quote + ', ' + quote + 'isActive' + quote +
    ' FROM ' + quote + 'User' + quote +
    ' WHERE ' + quote + 'id' + quote + ' = $1 FOR UPDATE'
  const users = await transaction.$queryRawUnsafe<
    Array<{ id: number; role: UserRole; isActive: boolean }>
  >(query, userId)
  const user = users[0]
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  }
  if (user.role !== UserRole.REQUESTER) {
    throw new ApiError(403, 'FORBIDDEN', 'Requester access is required.')
  }
  return user
}
