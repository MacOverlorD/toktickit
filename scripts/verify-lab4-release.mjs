import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argumentsReceived = process.argv.slice(2)
if (argumentsReceived.some(a => a !== '--candidate') || argumentsReceived.length > 1) {
  throw new Error('Usage: npm run verify:release:lab4 -- [--candidate]')
}
if (!process.env.npm_execpath) throw new Error('Run through npm run verify:release:lab4.')
const candidate = argumentsReceived.includes('--candidate')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim()
const commit = git('rev-parse', 'HEAD')
if (git('status', '--porcelain')) throw new Error('Use a clean worktree; commit or preserve changes first.')
if (!candidate) {
  git('fetch', 'origin', 'main')
  if (commit !== git('rev-parse', 'origin/main')) throw new Error('HEAD must equal the freshly fetched origin/main SHA. Use --candidate only for preparation.')
}
const directory = path.join(root, 'artifacts/lab-04/release-results', commit)
mkdirSync(directory, { recursive: true })
const result = { mode: candidate ? 'candidate' : 'final-main', commit, startedAt: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch }, commands: [], passed: false }
const history = git('log', '--graph', '--oneline', '--decorate', '-45')
writeFileSync(path.join(directory, 'commit-history.txt'), `${history}\n`)
result.history = { log: 'commit-history.txt', sha256: createHash('sha256').update(`${history}\n`).digest('hex') }
const commands = [
  ['audit-documents', ['run', 'audit:docs:lab4']],
  ['release-tool-tests', ['run', 'test:release-tools:lab4']],
  ['prisma-generate', ['run', 'prisma:generate', '--prefix', 'server']],
  ['prisma-deploy', ['run', 'prisma:deploy', '--prefix', 'server']],
  ['prisma-status', ['run', 'prisma:status', '--prefix', 'server']],
  ['prisma-seed-first', ['run', 'prisma:seed', '--prefix', 'server']],
  ['prisma-seed-repeat', ['run', 'prisma:seed', '--prefix', 'server']],
  ['quality-all', ['test']],
]
try {
  for (const [name, args] of commands) {
    console.log(`Verifying ${name} at ${commit} (${result.mode})`)
    const startedAt = new Date().toISOString()
    const run = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root, env: { ...process.env, FORCE_COLOR: '0' }, encoding: 'utf8', windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    })
    const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
    writeFileSync(path.join(directory, `${name}.txt`), output)
    result.commands.push({ name, command: `npm ${args.join(' ')}`, startedAt, finishedAt: new Date().toISOString(),
      exitCode: run.status, log: `${name}.txt`, sha256: createHash('sha256').update(output).digest('hex') })
    process.stdout.write(output)
    if (run.error) throw run.error
    if (run.status !== 0) throw new Error(`${name} failed with exit code ${run.status}.`)
  }
  if (git('rev-parse', 'HEAD') !== commit || git('status', '--porcelain')) throw new Error('Source changed during verification.')
  if (!candidate) {
    git('fetch', 'origin', 'main')
    if (git('rev-parse', 'origin/main') !== commit) throw new Error('Main advanced during verification; rerun against the new SHA.')
  }
  result.passed = true
} catch (error) {
  result.failure = error.message
  process.exitCode = 1
} finally {
  result.finishedAt = new Date().toISOString()
  writeFileSync(path.join(directory, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(`Verification manifest: ${path.relative(root, path.join(directory, 'verification.json'))}`)
}
