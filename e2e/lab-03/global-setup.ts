import { database } from '../lab-02/database.js'
import { hashPassword } from '../../server/src/auth/password-hash.js'
import {
  E2E_AUTH_EMAIL,
  E2E_AUTH_FIXTURE_KEY,
  E2E_INITIAL_PASSWORD,
} from './values.js'

export default async function globalSetup() {
  const prisma = await database()
  const passwordHash = await hashPassword(E2E_INITIAL_PASSWORD)
  const user = await prisma.user.upsert({
    where: { fixtureKey: E2E_AUTH_FIXTURE_KEY },
    update: {
      name: 'E2E Authentication Requester',
      email: E2E_AUTH_EMAIL,
      role: 'REQUESTER',
      isActive: true,
      passwordHash,
      mustChangePassword: true,
      version: { increment: 1 },
    },
    create: {
      fixtureKey: E2E_AUTH_FIXTURE_KEY,
      name: 'E2E Authentication Requester',
      email: E2E_AUTH_EMAIL,
      role: 'REQUESTER',
      isActive: true,
      passwordHash,
      mustChangePassword: true,
    },
    select: { id: true },
  })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  await prisma.$disconnect()
}
