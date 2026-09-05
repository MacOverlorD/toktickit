import {
  assertRequiredSeedData,
  cleanupE2EData,
  database,
  EMPTY_REQUESTER_EMAIL,
} from './database.js'

export default async function globalSetup() {
  await cleanupE2EData()
  const prisma = await database()
  await assertRequiredSeedData()
  await prisma.requester.create({
    data: {
      name: 'E2E Empty Requester',
      email: EMPTY_REQUESTER_EMAIL,
      isActive: true,
    },
  })
}
