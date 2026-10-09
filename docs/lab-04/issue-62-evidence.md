# Issue #62 Release Preparation Evidence

Status: candidate verification passed; preparation peer review and staging-to-main release remain pending. This is not a final-main completion claim.

## Verified candidate

- Command: `npm run verify:release:lab4 -- --candidate`.
- Exact tested source: `388a932a1003a1bfd3636584e82e37b3b56a774f`.
- Clean-worktree guard passed before and after the run.
- Prisma generate/deploy/status passed; all six migrations present, no pending migration.
- Standard seed executed successfully twice.
- Client: 21 files, 163 passed.
- Fresh-schema server: 30 files, 186 passed.
- Server build, client typecheck and Vite production build passed.
- Labs 1-3 browser suite: 10 passed.
- Lab 4 browser suite: 13 passed, including populated-state axe checks, role isolation, workflow, dashboards, responsive and visual capture tests.
- Release-tool guard tests: 4 passed, 0 failed/skipped.
- Total: 376 tests passed; no unexplained skipped tests.

The [candidate manifest](../../artifacts/lab-04/release-candidate/388a932a1003a1bfd3636584e82e37b3b56a774f/verification.json), [complete aggregate output](../../artifacts/lab-04/release-candidate/388a932a1003a1bfd3636584e82e37b3b56a774f/quality-all.txt), [merge graph](../../artifacts/lab-04/release-candidate/388a932a1003a1bfd3636584e82e37b3b56a774f/commit-history.txt) and [performance JSON](../../artifacts/lab-04/release-candidate/388a932a1003a1bfd3636584e82e37b3b56a774f/performance.json) retain observed results. This evidence-record commit adds only documentation/artifacts; it does not relabel a parent-commit test as a test on a later commit.

The manifest also names separate migration/audit/seed logs kept in ignored `release-results/<SHA>/` locally. Only the aggregate output, commit graph and performance record are promoted here; reviewers must not assume the unpromoted files are present in GitHub.

## Controlled performance

Fresh baseline: 12 Tickets and 4 Actions; added 1,000 Tickets and 5,000 Actions; measured total 1,012/5,004. Five warmups, 30 sequential samples, p95 <= 500 ms budget. Captured `2026-10-09T18:26:52.824Z` on Node `v22.18.0`.

| Endpoint | Observed p95 |
|---|---:|
| Requester dashboard | 41.96 ms |
| Operations dashboard | 87.85 ms |
| My Tickets | 40.94 ms |
| Staff queue | 45.71 ms |

## Preparation QA and honest failure record

- Document audit: 39 existing automated-file references, eight prompts, eight reviewed implementation PRs, eight completed prerequisite Issues, 16 viewport PNGs.
- PDF preview: nine answer headings in exact order; complete numbered FR/BR/AC and planned Test IDs; rendered specification/test/reviewer/AI/UI evidence; image captions remain with readable viewport extracts. Every preview page was rendered and visually inspected during preparation. It is not the final submitted PDF.
- The first rehearsal at `648c302` passed client tests but failed server startup because the patched Vitest mocker could not resolve its top-level Vite peer. The later candidate explicitly adds that test-only dependency and passed the full suite. The failed rehearsal is not counted as a pass.
- Client/root dependency audit are clean. The remaining Prisma configuration-merger advisory and exposure assessment are disclosed in [dependency-security.md](./dependency-security.md); no zero-advisory server claim is made.

## Remaining gates

Preparation PR [#71](https://github.com/MacOverlorD/toktickit/pull/71) must be peer-reviewed and merged to staging. Then the full staging-to-main release needs separate approval/merge, exact-main verification, final reviewer/Project evidence, and one final rendered/checked PDF. #62 remains open until those gates are completed. See [release-checklist.md](./release-checklist.md).
