import { cleanupE2EData, database } from '../lab-02/database.js'
import { E2E_AUTH_FIXTURE_KEY, E2E_REQUESTER_USERS, E2E_STAFF_USER } from './values.js'

export default async function globalTeardown() {
  await cleanupE2EData()
  const prisma = await database()
  const fixtureKeys = [
    E2E_AUTH_FIXTURE_KEY,
    E2E_STAFF_USER.fixtureKey,
    ...E2E_REQUESTER_USERS.map(({ fixtureKey }) => fixtureKey),
  ]
  const users = await prisma.user.findMany({
    where: { fixtureKey: { in: fixtureKeys } },
    select: { id: true },
  })
  const userIds = users.map(({ id }) => id)
  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  await prisma.$disconnect()
}
