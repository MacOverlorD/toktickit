import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { provisionInitialPasswords } from './provision-initial-passwords-data.js'

const prisma = new PrismaClient()

async function main() {
  if (!process.argv.includes('--all-unprovisioned')) {
    throw new Error(
      'Refusing to provision without --all-unprovisioned. Review the target database first.',
    )
  }

  const password = process.env.LAB3_INITIAL_PASSWORD
  if (typeof password !== 'string') {
    throw new Error(
      'Set LAB3_INITIAL_PASSWORD in the ignored server/.env file before provisioning.',
    )
  }

  const provisioned = await provisionInitialPasswords(prisma, password)
  console.log(
    `Provisioned ${provisioned} unprovisioned Lab 3 account(s). No password value was logged.`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? `Initial-password provisioning failed: ${error.message}`
        : 'Initial-password provisioning failed.',
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
