import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categoryNames = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
] as const

async function main() {
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed request categories.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
