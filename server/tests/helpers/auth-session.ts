import { createHash, randomBytes } from 'node:crypto'
import prisma from '../../src/prisma.js'

export interface TestSession {
  headers: Record<string, string>
  cleanup: () => Promise<void>
}

export async function createTestSession(userId: number): Promise<TestSession> {
  const original = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, mustChangePassword: true },
  })
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: original.passwordHash ?? 'test-only-session-credential',
      mustChangePassword: false,
    },
  })

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const csrfToken = randomBytes(32).toString('hex')
  const now = new Date()
  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      csrfToken,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    },
  })

  return {
    headers: {
      Cookie: `toktickit.sid=${token}`,
      Origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      'X-CSRF-Token': csrfToken,
    },
    cleanup: async () => {
      await prisma.session.deleteMany({ where: { tokenHash } })
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: original,
        })
      }
    },
  }
}
