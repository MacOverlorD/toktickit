import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedDatabase } from './seed-data.js'

const prisma = new PrismaClient()

seedDatabase(prisma)
  .catch((error: unknown) => {
    console.error('Failed to seed TokTickIT reference data.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
