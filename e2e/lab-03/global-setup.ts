import { randomUUID } from 'node:crypto'
import { database } from '../lab-02/database.js'
import { hashPassword } from '../../server/src/auth/password-hash.js'
import {
  E2E_AUTH_EMAIL,
  E2E_AUTH_FIXTURE_KEY,
  E2E_INITIAL_PASSWORD,
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_ADMIN_USER,
  E2E_MANAGED_EMAIL,
  E2E_WORKFLOW_TICKET,
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

  const requesterPasswordHash = await hashPassword(E2E_REQUESTER_PASSWORD)
  for (const requester of E2E_REQUESTER_USERS) {
    const flowUser = await prisma.user.upsert({
      where: { fixtureKey: requester.fixtureKey },
      update: {
        name: requester.name,
        email: requester.email,
        role: 'REQUESTER',
        isActive: true,
        passwordHash: requesterPasswordHash,
        mustChangePassword: false,
        version: { increment: 1 },
      },
      create: {
        fixtureKey: requester.fixtureKey,
        name: requester.name,
        email: requester.email,
        role: 'REQUESTER',
        isActive: true,
        passwordHash: requesterPasswordHash,
        mustChangePassword: false,
      },
      select: { id: true },
    })
    await prisma.session.deleteMany({ where: { userId: flowUser.id } })
  }
  const staffUser = await prisma.user.upsert({
    where: { fixtureKey: E2E_STAFF_USER.fixtureKey },
    update: { ...E2E_STAFF_USER, role: 'IT_STAFF', isActive: true, passwordHash: requesterPasswordHash, mustChangePassword: false, version: { increment: 1 } },
    create: { ...E2E_STAFF_USER, role: 'IT_STAFF', isActive: true, passwordHash: requesterPasswordHash, mustChangePassword: false },
    select: { id: true },
  })
  await prisma.session.deleteMany({ where: { userId: staffUser.id } })

  const previousManaged = await prisma.user.findUnique({ where: { email: E2E_MANAGED_EMAIL } })
  if (previousManaged) {
    await prisma.session.deleteMany({ where: { userId: previousManaged.id } })
    await prisma.user.delete({ where: { id: previousManaged.id } })
  }
  const adminUser = await prisma.user.upsert({
    where: { fixtureKey: E2E_ADMIN_USER.fixtureKey },
    update: { ...E2E_ADMIN_USER, role: 'ADMINISTRATOR', isActive: true, passwordHash: requesterPasswordHash, mustChangePassword: false, version: { increment: 1 } },
    create: { ...E2E_ADMIN_USER, role: 'ADMINISTRATOR', isActive: true, passwordHash: requesterPasswordHash, mustChangePassword: false },
    select: { id: true },
  })
  await prisma.session.deleteMany({ where: { userId: adminUser.id } })

  const workflowRequester = await prisma.user.findUniqueOrThrow({ where: { fixtureKey: E2E_REQUESTER_USERS[0].fixtureKey } })
  const category = await prisma.category.findFirstOrThrow({ where: { name: 'Hardware' } })
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { name: 'Corporate Laptop' } })
  const previousWorkflowTicket = await prisma.ticket.findUnique({ where: { ticketNumber: E2E_WORKFLOW_TICKET }, select: { id: true } })
  if (previousWorkflowTicket) {
    await prisma.publicComment.deleteMany({ where: { ticketId: previousWorkflowTicket.id } })
    await prisma.internalNote.deleteMany({ where: { ticketId: previousWorkflowTicket.id } })
  }
  await prisma.ticket.upsert({
    where: { ticketNumber: E2E_WORKFLOW_TICKET },
    update: { requesterId: workflowRequester.id, ownerId: null, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: '[E2E] Shared workflow ticket', requestedPriority: 'HIGH', itPriority: 'MEDIUM', description: '[E2E] Exercises staff workflow and communication.', status: 'OPEN', resolutionIndicatedAt: null, resolutionIndicatedById: null, version: { increment: 1 } },
    create: { ticketNumber: E2E_WORKFLOW_TICKET, submissionKey: randomUUID(), requesterId: workflowRequester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: '[E2E] Shared workflow ticket', requestedPriority: 'HIGH', itPriority: 'MEDIUM', description: '[E2E] Exercises staff workflow and communication.', status: 'OPEN' },
  })

  await prisma.$disconnect()
}
