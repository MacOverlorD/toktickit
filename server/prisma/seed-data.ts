import type { PrismaClient } from '@prisma/client'

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
  { name: 'Anan Wong', email: 'anan.wong@example.test', isActive: true },
  { name: 'Mali Chaiyasit', email: 'mali.chaiyasit@example.test', isActive: true },
  { name: 'Narin Suksan', email: 'narin.suksan@example.test', isActive: true },
  { name: 'Pimchanok Dee', email: 'pimchanok.dee@example.test', isActive: true },
  { name: 'Former Requester', email: 'former.requester@example.test', isActive: false },
] as const

export async function seedDatabase(prisma: PrismaClient) {
  for (const category of categorySeeds) {
    await prisma.category.upsert({
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
  }

  for (const relatedSystem of relatedSystemSeeds) {
    await prisma.relatedSystem.upsert({
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
  }

  for (const requester of requesterSeeds) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    })
  }
}
