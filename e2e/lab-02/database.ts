import { unlink } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { config } from 'dotenv'

export const E2E_PREFIX = '[E2E]'
export const EMPTY_REQUESTER_EMAIL = 'e2e.empty@example.test'

config({ path: resolve('server/.env'), quiet: true })
process.env.UPLOAD_DIR ??= resolve('server/uploads')

export async function database() {
  return (await import('../../server/src/prisma.js')).default
}

export async function cleanupE2EData() {
  const prisma = await database()
  const tickets = await prisma.ticket.findMany({
    where: { summary: { startsWith: E2E_PREFIX } },
    select: {
      id: true,
      attachments: { select: { storedName: true } },
    },
  })
  const ticketIds = tickets.map(({ id }) => id)

  for (const ticket of tickets) {
    for (const attachment of ticket.attachments) {
      if (basename(attachment.storedName) !== attachment.storedName) continue
      await unlink(resolve(process.env.UPLOAD_DIR!, attachment.storedName))
        .catch(() => undefined)
    }
  }

  if (ticketIds.length > 0) {
    await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } })
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } })
  }
  await prisma.requester.deleteMany({
    where: {
      email: EMPTY_REQUESTER_EMAIL,
      tickets: { none: {} },
    },
  })
}
