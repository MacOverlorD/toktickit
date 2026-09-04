import { cleanupE2EData, database, EMPTY_REQUESTER_EMAIL } from './database.js'

export default async function globalSetup() {
  await cleanupE2EData()
  const prisma = await database()
  const { seedDatabase } = await import('../../server/prisma/seed-data.js')
  await seedDatabase(prisma)
  await prisma.requester.upsert({
    where: { email: EMPTY_REQUESTER_EMAIL },
    update: { name: 'E2E Empty Requester', isActive: true },
    create: {
      name: 'E2E Empty Requester',
      email: EMPTY_REQUESTER_EMAIL,
      isActive: true,
    },
  })
}
