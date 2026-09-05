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

type RemoveFile = (path: string) => Promise<void>

export async function removeE2EAttachmentFile(
  storedName: string,
  removeFile: RemoveFile = unlink,
) {
  if (basename(storedName) !== storedName) {
    throw new Error('Refusing to clean an unsafe E2E attachment filename.')
  }
  try {
    await removeFile(resolve(process.env.UPLOAD_DIR!, storedName))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
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
      await removeE2EAttachmentFile(attachment.storedName)
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

export async function assertRequiredSeedData() {
  const prisma = await database()
  const [requesterCount, categoryCount, systemCount] = await Promise.all([
    prisma.requester.count({
      where: {
        isActive: true,
        email: {
          in: [
            'anan.wong@example.test',
            'mali.chaiyasit@example.test',
            'narin.suksan@example.test',
            'pimchanok.dee@example.test',
          ],
        },
      },
    }),
    prisma.category.count({
      where: {
        isActive: true,
        name: { in: ['Account and Access', 'Hardware'] },
      },
    }),
    prisma.relatedSystem.count({
      where: {
        isActive: true,
        name: { in: ['Corporate Laptop', 'Email'] },
      },
    }),
  ])

  if (requesterCount !== 4 || categoryCount !== 2 || systemCount !== 2) {
    throw new Error(
      'Required Lab 2 seed data is missing. Run npm run prisma:seed --prefix server.',
    )
  }
}
