import type { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/auth/password-hash.js'

export type PasswordHasher = (password: string) => Promise<string>

export async function provisionInitialPasswords(
  prisma: PrismaClient,
  password: string,
  hasher: PasswordHasher = hashPassword,
) {
  const users = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  let provisioned = 0
  for (const user of users) {
    const passwordHash = await hasher(password)
    const result = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: null },
      data: {
        passwordHash,
        mustChangePassword: true,
        version: { increment: 1 },
      },
    })
    provisioned += result.count
  }

  return provisioned
}
