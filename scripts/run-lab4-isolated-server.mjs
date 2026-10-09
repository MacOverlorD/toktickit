import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverDirectory = path.join(repositoryRoot, 'server')
const requireFromServer = createRequire(path.join(serverDirectory, 'package.json'))
const { PrismaClient } = requireFromServer('@prisma/client')
config({ path: path.join(serverDirectory, '.env'), quiet: true })

if (!process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL in server/.env before running the isolated server suite.')
}
if (!process.env.npm_execpath) {
  throw new Error('Run this helper through npm run test:server:isolated.')
}

const schema = `lab4_quality_${randomUUID().replaceAll('-', '')}`
const isolatedUrl = new URL(process.env.DATABASE_URL)
isolatedUrl.searchParams.set('schema', schema)
const admin = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
const environment = {
  ...process.env,
  DATABASE_URL: isolatedUrl.toString(),
  TOKTICKIT_ISOLATED_TEST_SCHEMA: schema,
  TOKTICKIT_PERFORMANCE_RESULT_FILE: path.join(repositoryRoot, 'artifacts/lab-04/performance-results/latest.json'),
  NODE_ENV: 'test',
}

function runNpm(args) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: repositoryRoot,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status ?? 1}.`)
}

try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  runNpm(['run', 'prisma:deploy', '--prefix', 'server'])
  runNpm(['run', 'prisma:seed', '--prefix', 'server'])
  const testFiles = process.argv.slice(2)
  runNpm([
    'test', '--prefix', 'server', '--', '--run', '--no-file-parallelism', ...testFiles,
  ])
} finally {
  try {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  } finally {
    await admin.$disconnect()
  }
}
