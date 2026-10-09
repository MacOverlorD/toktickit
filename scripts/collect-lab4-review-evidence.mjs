import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function gh(...args) {
  return JSON.parse(execFileSync('gh', args, { cwd: root, encoding: 'utf8', windowsHide: true }))
}
const repository = 'MacOverlorD/toktickit'
function getPull(number) {
  const pull = gh('pr', 'view', String(number), '--repo', repository, '--json',
    'number,title,url,baseRefName,headRefName,state,mergedAt,mergeCommit')
  const reviews = gh('api', `repos/${repository}/pulls/${number}/reviews`, '--paginate')
  const comments = gh('api', `repos/${repository}/pulls/${number}/comments`, '--paginate')
  return { ...pull, reviews: reviews.map(r => ({ author: r.user.login, state: r.state,
    submittedAt: r.submitted_at, commit: r.commit_id, url: r.html_url, body: r.body })),
  comments: comments.map(c => ({ id: c.id, replyTo: c.in_reply_to_id ?? null,
    author: c.user.login, path: c.path, url: c.html_url, body: c.body })) }
}
const pulls = []
for (let number = 63; number <= 70; number++) pulls.push(getPull(number))
const releaseNumbers = process.argv.slice(2).map(Number)
if (releaseNumbers.some(n => !Number.isSafeInteger(n) || n < 71)) throw new Error('Optional arguments must be release/preparation PR numbers >= 71.')
const releasePulls = releaseNumbers.map(getPull)
const issues = []
for (let number = 54; number <= 62; number++) {
  issues.push(gh('issue', 'view', String(number), '--repo', repository, '--json',
    'number,title,state,closedAt,url'))
}
const project = gh('project', 'item-list', '2', '--owner', 'MacOverlorD', '--format', 'json', '--limit', '100')
const snapshot = { capturedAt: new Date().toISOString(), repository, pulls, releasePulls, issues,
  project: { url: 'https://github.com/users/MacOverlorD/projects/2', items: project.items
    .filter(i => i.content?.repository === repository && i.content.number >= 54 && i.content.number <= 62)
    .map(i => ({ issue: i.content.number, status: i.status, id: i.id })) } }
const destination = process.env.TOKTICKIT_REVIEW_SNAPSHOT
  ? path.resolve(root, process.env.TOKTICKIT_REVIEW_SNAPSHOT)
  : path.join(root, 'artifacts/lab-04/review-history.json')
if (!destination.startsWith(`${root}${path.sep}`)) throw new Error('Snapshot destination must be inside this worktree.')
mkdirSync(path.dirname(destination), { recursive: true })
writeFileSync(destination, `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Saved ${pulls.length} PRs, ${issues.length} Issues, and ${snapshot.project.items.length} Project items.`)
