import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
function run(script, args = [], environment = {}) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root,
    env: { ...process.env, ...environment }, encoding: 'utf8', windowsHide: true })
}
test('preparation document audit verifies the real repository inventory', () => {
  const result = run('scripts/verify-lab4-docs.mjs')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /8 reviewed PRs, 8 Done issues, 16 viewport PNGs/)
  assert.match(result.stdout, /does not certify release approval/)
})
test('release runner rejects unknown arguments before running commands', () => {
  const result = run('scripts/verify-lab4-release.mjs', ['--pretend-main'])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Usage:/)
})
test('release runner rejects execution outside npm rather than guessing a shell', () => {
  const result = run('scripts/verify-lab4-release.mjs', [], { npm_execpath: '' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Run through npm/)
})
test('final PDF generation refuses an absent final-main certificate', () => {
  const result = spawnSync('python', ['-X', 'utf8', 'scripts/generate-lab4-submission.py'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /requires a passed final-main verification manifest/)
})
