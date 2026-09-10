import {
  RequestedPriority,
  TicketStatus,
  UserRole,
  type PrismaClient,
} from '@prisma/client'
import { normalizeUserEmail } from '../src/users/user-email.js'

export const categorySeeds = [
  { name: 'Account and Access', displayOrder: 1 },
  { name: 'Hardware', displayOrder: 2 },
  { name: 'Software', displayOrder: 3 },
  { name: 'Network', displayOrder: 4 },
] as const

export const relatedSystemSeeds = [
  { name: 'Email', displayOrder: 1 },
  { name: 'Campus Wi-Fi', displayOrder: 2 },
  { name: 'VPN', displayOrder: 3 },
  { name: 'LEB2 App', displayOrder: 4 },
  { name: 'Grade Submission App', displayOrder: 5 },
  { name: 'Printer', displayOrder: 6 },
  { name: 'Corporate Laptop', displayOrder: 7 },
] as const

export const requesterSeeds = [
  { fixtureKey: 'lab3-requester-anan', name: 'Anan Wong', email: 'anan.wong@example.test', isActive: true },
  { fixtureKey: 'lab3-requester-mali', name: 'Mali Chaiyasit', email: 'mali.chaiyasit@example.test', isActive: true },
  { fixtureKey: 'lab3-requester-narin', name: 'Narin Suksan', email: 'narin.suksan@example.test', isActive: true },
  { fixtureKey: 'lab3-requester-pimchanok', name: 'Pimchanok Dee', email: 'pimchanok.dee@example.test', isActive: true },
  { fixtureKey: 'lab3-requester-former', name: 'Former Requester', email: 'former.requester@example.test', isActive: false },
] as const

export const staffSeeds = [
  { fixtureKey: 'lab3-staff-kanya', name: 'Kanya Support', email: 'kanya.support@example.test', isActive: true },
  { fixtureKey: 'lab3-staff-somchai', name: 'Somchai Service', email: 'somchai.service@example.test', isActive: true },
  { fixtureKey: 'lab3-staff-nicha', name: 'Nicha Helpdesk', email: 'nicha.helpdesk@example.test', isActive: true },
  { fixtureKey: 'lab3-staff-former', name: 'Former IT Staff', email: 'former.staff@example.test', isActive: false },
] as const

export const administratorSeeds = [
  { fixtureKey: 'lab3-admin-local', name: 'Local Administrator', email: 'admin@example.test', isActive: true },
] as const

export const userSeeds = [
  ...requesterSeeds.map((user) => ({ ...user, role: UserRole.REQUESTER })),
  ...staffSeeds.map((user) => ({ ...user, role: UserRole.IT_STAFF })),
  ...administratorSeeds.map((user) => ({
    ...user,
    role: UserRole.ADMINISTRATOR,
  })),
] as const

const ticketSeeds = [
  {
    ticketNumber: 'TKT-20260911-00000001',
    submissionKey: '30000000-0000-4000-8000-000000000001',
    requesterKey: requesterSeeds[0].fixtureKey,
    ownerKey: null,
    category: 'Account and Access',
    relatedSystem: 'Email',
    summary: 'Cannot sign in to university email',
    requestedPriority: RequestedPriority.HIGH,
    status: TicketStatus.NEW,
    description: 'The sign-in page rejects the current university account password.',
  },
  {
    ticketNumber: 'TKT-20260911-00000002',
    submissionKey: '30000000-0000-4000-8000-000000000002',
    requesterKey: requesterSeeds[1].fixtureKey,
    ownerKey: staffSeeds[0].fixtureKey,
    category: 'Network',
    relatedSystem: 'Campus Wi-Fi',
    summary: 'Wi-Fi disconnects during online class',
    requestedPriority: RequestedPriority.URGENT,
    status: TicketStatus.OPEN,
    description: 'The campus wireless connection drops every few minutes during class.',
  },
  {
    ticketNumber: 'TKT-20260911-00000003',
    submissionKey: '30000000-0000-4000-8000-000000000003',
    requesterKey: requesterSeeds[2].fixtureKey,
    ownerKey: staffSeeds[1].fixtureKey,
    category: 'Hardware',
    relatedSystem: 'Corporate Laptop',
    summary: 'Laptop battery drains unusually fast',
    requestedPriority: RequestedPriority.MEDIUM,
    status: TicketStatus.IN_PROGRESS,
    description: 'The laptop battery reaches empty after approximately one hour of use.',
  },
  {
    ticketNumber: 'TKT-20260911-00000004',
    submissionKey: '30000000-0000-4000-8000-000000000004',
    requesterKey: requesterSeeds[3].fixtureKey,
    ownerKey: staffSeeds[2].fixtureKey,
    category: 'Software',
    relatedSystem: 'Grade Submission App',
    summary: 'Grade submission file is rejected',
    requestedPriority: RequestedPriority.HIGH,
    status: TicketStatus.WAITING_FOR_REQUESTER,
    description: 'The application rejects a valid spreadsheet without a useful explanation.',
  },
  {
    ticketNumber: 'TKT-20260911-00000005',
    submissionKey: '30000000-0000-4000-8000-000000000005',
    requesterKey: requesterSeeds[0].fixtureKey,
    ownerKey: staffSeeds[0].fixtureKey,
    category: 'Software',
    relatedSystem: 'LEB2 App',
    summary: 'Course material link opened successfully',
    requestedPriority: RequestedPriority.LOW,
    status: TicketStatus.RESOLVED,
    description: 'The course material link failed earlier but now opens in the browser.',
  },
  {
    ticketNumber: 'TKT-20260911-00000006',
    submissionKey: '30000000-0000-4000-8000-000000000006',
    requesterKey: requesterSeeds[1].fixtureKey,
    ownerKey: administratorSeeds[0].fixtureKey,
    category: 'Hardware',
    relatedSystem: 'Printer',
    summary: 'Printer queue cleared after maintenance',
    requestedPriority: RequestedPriority.MEDIUM,
    status: TicketStatus.CLOSED,
    description: 'The printer queue was blocked and has been cleared after maintenance.',
  },
  {
    ticketNumber: 'TKT-20260911-00000007',
    submissionKey: '30000000-0000-4000-8000-000000000007',
    requesterKey: requesterSeeds[2].fixtureKey,
    ownerKey: null,
    category: 'Network',
    relatedSystem: 'VPN',
    summary: 'VPN request reopened after recurrence',
    requestedPriority: RequestedPriority.HIGH,
    status: TicketStatus.REOPENED,
    description: 'The VPN worked briefly and then began disconnecting again this morning.',
  },
  {
    ticketNumber: 'TKT-20260911-00000008',
    submissionKey: '30000000-0000-4000-8000-000000000008',
    requesterKey: requesterSeeds[3].fixtureKey,
    ownerKey: null,
    category: 'Account and Access',
    relatedSystem: 'Email',
    summary: 'Duplicate mailbox request cancelled',
    requestedPriority: RequestedPriority.LOW,
    status: TicketStatus.CANCELLED,
    description: 'The requester confirmed that this mailbox request duplicates another ticket.',
  },
] as const

async function seedEntry(
  prisma: PrismaClient,
  kind: 'publicComment' | 'internalNote',
  data: { ticketId: number; authorId: number; content: string; createdAt: Date },
) {
  if (kind === 'publicComment') {
    const existing = await prisma.publicComment.findFirst({ where: data })
    if (!existing) await prisma.publicComment.create({ data })
    return
  }

  const existing = await prisma.internalNote.findFirst({ where: data })
  if (!existing) await prisma.internalNote.create({ data })
}

export async function seedDatabase(prisma: PrismaClient) {
  const categories = new Map<string, number>()
  for (const category of categorySeeds) {
    const row = await prisma.category.upsert({
      where: { name: category.name },
      update: {
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    })
    categories.set(row.name, row.id)
  }

  const systems = new Map<string, number>()
  for (const relatedSystem of relatedSystemSeeds) {
    const row = await prisma.relatedSystem.upsert({
      where: { name: relatedSystem.name },
      update: {
        displayOrder: relatedSystem.displayOrder,
        isActive: true,
      },
      create: {
        ...relatedSystem,
        isActive: true,
      },
    })
    systems.set(row.name, row.id)
  }

  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>()
  for (const user of userSeeds) {
    const email = normalizeUserEmail(user.email)
    const row = await prisma.user.upsert({
      where: { fixtureKey: user.fixtureKey },
      update: {},
      create: {
        ...user,
        email,
        mustChangePassword: true,
      },
    })
    users.set(user.fixtureKey, row)
  }

  const counts = await prisma.user.groupBy({
    by: ['role', 'isActive'],
    _count: { _all: true },
  })
  const count = (role: UserRole, isActive: boolean) =>
    counts.find((item) => item.role === role && item.isActive === isActive)
      ?._count._all ?? 0

  if (
    count(UserRole.REQUESTER, true) < 4 ||
    count(UserRole.REQUESTER, false) < 1 ||
    count(UserRole.IT_STAFF, true) < 3 ||
    count(UserRole.IT_STAFF, false) < 1 ||
    count(UserRole.ADMINISTRATOR, true) < 1
  ) {
    throw new Error(
      'Lab 3 seed minimums are not met; preserve existing user-managed state and correct the local fixtures explicitly.',
    )
  }

  const tickets = new Map<string, number>()
  for (const seed of ticketSeeds) {
    const requester = users.get(seed.requesterKey)
    const owner = seed.ownerKey ? users.get(seed.ownerKey) : null
    const categoryId = categories.get(seed.category)
    const relatedSystemId = systems.get(seed.relatedSystem)
    if (!requester || !categoryId || !relatedSystemId) {
      throw new Error('Lab 3 seed references are incomplete.')
    }

    const row = await prisma.ticket.upsert({
      where: { ticketNumber: seed.ticketNumber },
      update: {},
      create: {
        ticketNumber: seed.ticketNumber,
        submissionKey: seed.submissionKey,
        requesterId: requester.id,
        ownerId: owner?.id ?? null,
        categoryId,
        relatedSystemId,
        summary: seed.summary,
        requestedPriority: seed.requestedPriority,
        itPriority: seed.requestedPriority,
        description: seed.description,
        status: seed.status,
      },
    })
    tickets.set(row.ticketNumber, row.id)
  }

  const firstTicketId = tickets.get(ticketSeeds[1].ticketNumber)
  const requester = users.get(requesterSeeds[1].fixtureKey)
  const staff = users.get(staffSeeds[0].fixtureKey)
  if (!firstTicketId || !requester || !staff) {
    throw new Error('Lab 3 communication seed references are incomplete.')
  }

  await seedEntry(prisma, 'publicComment', {
    ticketId: firstTicketId,
    authorId: requester.id,
    content: 'The connection drops in two different classrooms.',
    createdAt: new Date('2026-09-11T02:00:00.000Z'),
  })
  await seedEntry(prisma, 'publicComment', {
    ticketId: firstTicketId,
    authorId: staff.id,
    content: 'Thank you. We are checking the access points in those rooms.',
    createdAt: new Date('2026-09-11T02:05:00.000Z'),
  })
  await seedEntry(prisma, 'internalNote', {
    ticketId: firstTicketId,
    authorId: staff.id,
    content: 'Compare controller logs for the two reported access points.',
    createdAt: new Date('2026-09-11T02:06:00.000Z'),
  })
}
