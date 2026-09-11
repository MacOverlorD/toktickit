import { database } from '../lab-02/database.js'
import { E2E_AUTH_FIXTURE_KEY } from './values.js'

export default async function globalTeardown() {
  const prisma = await database()
  const user = await prisma.user.findUnique({
    where: { fixtureKey: E2E_AUTH_FIXTURE_KEY },
    select: { id: true },
  })
  if (user) {
    await prisma.session.deleteMany({ where: { userId: user.id } })
    await prisma.ticket.deleteMany({ where: { requesterId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  await prisma.$disconnect()
}
