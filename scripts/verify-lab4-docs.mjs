import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')
for (const file of ['specification', 'tests', 'ui-spec', 'api-spec', 'reviewer', 'ai-use']) {
  assert(read(`docs/lab-04/${file}.md`).length > 100, `Missing ${file}`)
}
const specification = read('docs/lab-04/specification.md')
for (const [prefix, count] of [['FR', 10], ['BR', 20], ['AC', 12]]) {
  for (let index = 1; index <= count; index++) {
    assert(specification.includes(`${prefix}-${String(index).padStart(2, '0')}`), `Missing ${prefix}-${index}`)
  }
}
const tests = read('docs/lab-04/tests.md')
const paths = [...tests.matchAll(/`((?:server|client|e2e|scripts)\/[^`]+\.(?:ts|tsx|mjs))`/g)].map(m => m[1])
assert(paths.length >= 24, 'Incomplete automated test inventory')
for (const file of paths) assert(existsSync(path.join(root, file)), `Missing test path: ${file}`)
const ai = read('docs/lab-04/ai-use.md')
const prompts = [...ai.matchAll(/^\| [1-9]\d* \|/gm)]
assert(prompts.length >= 6 && prompts.length <= 10, 'Need 6-10 selected prompts')
assert(ai.includes('OpenAI Codex') && ai.includes('## My Reflection') && ai.includes('Provenance:'), 'Missing AI-use evidence')
const snapshot = JSON.parse(read('artifacts/lab-04/review-history.json'))
assert.equal(snapshot.pulls.length, 8)
for (const pull of snapshot.pulls) {
  assert.equal(pull.state, 'MERGED', `PR #${pull.number} is not merged`)
  assert.equal(pull.baseRefName, 'lab4-staging')
  assert(pull.reviews.some(r => r.state === 'APPROVED' && r.author !== 'MacOverlorD'), `No peer approval: #${pull.number}`)
  for (const comment of pull.comments.filter(c => !c.replyTo && c.author !== 'MacOverlorD')) {
    assert(pull.comments.some(c => c.replyTo === comment.id && c.author === 'MacOverlorD'), `Unanswered finding ${comment.id}`)
  }
}
for (let number = 54; number <= 61; number++) {
  assert.equal(snapshot.issues.find(i => i.number === number)?.state, 'CLOSED', `Issue #${number} not closed`)
  assert.equal(snapshot.project.items.find(i => i.issue === number)?.status, 'Done', `Project #${number} not Done`)
}
const directories = ['actions', 'ticket-workflow', 'requester-dashboard', 'operations-dashboard']
let screenshots = 0
for (const directory of directories) {
  const folder = path.join(root, 'artifacts/lab-04/screenshots', directory)
  const files = readdirSync(folder).filter(f => f.endsWith('.png'))
  assert.equal(files.length, 4, `Need four viewport PNGs: ${directory}`)
  for (const file of files) {
    const data = readFileSync(path.join(folder, file))
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    const expected = file.includes('desktop') ? 1440 : file.includes('tablet') ? 768 : file.includes('boundary') ? 320 : 390
    assert(data.readUInt32BE(16) <= expected, `PNG wider than viewport: ${file}`)
    screenshots++
  }
}
console.log(`Lab 4 document audit passed: ${paths.length} existing test references, ${prompts.length} prompts, 8 reviewed PRs, 8 Done issues, ${screenshots} viewport PNGs.`)
console.log('This preparation audit does not certify release approval, final-main tests, or final PDF completion.')
