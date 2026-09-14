# Lab 3 Review Evidence

Status: Issues #33-#38 are merged into `lab3-staging`. Only Issue #33 has a
recorded peer approval; Issues #34-#38 were merged after fixes while their last
recorded peer decisions remained Changes requested. Issue #39 is submitted for peer review in PR #49.

Record real reviewer identity, PR URL, comments, response, resulting change and
approval evidence for each feature PR and the release PR. Do not substitute AI
self-review for a required peer review. Add records as work happens.

| PR | Reviewer | Comment / response / change | Approval evidence |
|---|---|---|---|
| [PR #42](https://github.com/MacOverlorD/toktickit/pull/42) | Titihinan Sobking (`Ohmmykung09`), collaborator | Reviewed the complete lab handout and Lab 2 baseline. Confirmed specification structure, authorization/status rules, data-preserving migration, API/UI contracts, FR/BR/AC traceability, Markdown tables, relative links, whitespace checks, and build after Prisma Client generation. Reported one non-blocking source-section correction; corrected from sections 1-13 to 1-14 in this evidence update. | Approved commit `270bf9a` at 2026-09-10 16:50:34 UTC; merged by the reviewer as merge commit `6418e3f` at 2026-09-10 16:50:51 UTC. |
| [PR #44](https://github.com/MacOverlorD/toktickit/pull/44) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested an explicit all-or-nothing migration transaction with failure proof, complete legacy-email syntax preflight, and immutable seed fixture identity. The response added transaction boundaries and rollback coverage, the full Lab 3 email policy check, a reserved unique `fixtureKey`, and an edited-email seed rerun test. Focused tests, full server tests, production build, and repeated populated-database seeds passed. | Changes requested on commit `0d8eeb4`; fixes recorded before merge commit `bb4677f` at 2026-09-11 07:13:15 UTC. No later peer approval is recorded. |
| [PR #45](https://github.com/MacOverlorD/toktickit/pull/45) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested all-status client parsing, transactional current-user checks, safe serialization-conflict handling, global expired rate-bucket cleanup and mandatory-change logout. Commit `e90a518` addressed all five findings and added focused regressions; server 114, client 97 and Playwright 1 passed with the production build. | Changes requested on commit `fe3a4dd`; merged as `f866989` at 2026-09-12 11:42:51 UTC. No later peer approval is recorded. |
| [PR #46](https://github.com/MacOverlorD/toktickit/pull/46) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested migration of the excluded Lab 2 Requester Playwright flow to real cookie/CSRF authentication and stronger session-state coverage for ID, role, version, draft and submission transitions. The response moved the complete lifecycle flow into `e2e/lab-03`, added two isolated authenticated Requester fixtures, removed selector/sessionStorage/spoofable-header use, updated scoped cleanup for the User schema, and expanded the UI regression. Focused API 40, UI 25, Playwright 1 and production build passed. | Changes requested on commit `479b061` at 2026-09-12 15:08:40 UTC; fixes were merged as `fea5799` at 2026-09-13 09:51:40 UTC. No later peer approval is recorded. |
| [PR #47](https://github.com/MacOverlorD/toktickit/pull/47) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested restoration of the authentication UI suite, a protected detail destination, immediate non-search controls, desktop queue columns, Needs assignment warnings and correct out-of-range pagination. The response added ordered authentication/queue mocks, a role-protected scoped detail placeholder, URL-backed immediate controls, an eight-column desktop table with tablet/mobile cards, owner-state warnings and a recoverable page-boundary state with interaction and responsive coverage. Focused UI 16, full client 109 and production build passed; local E2E rerun was blocked because PostgreSQL was offline. | Changes requested on commit `b572882`; fixes committed as `2abb5bd` and merged by the reviewer as `24620a5` at 2026-09-13 14:36:54 UTC. No later peer approval is recorded. |
| [PR #48](https://github.com/MacOverlorD/toktickit/pull/48) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested version-bound Staff operation drafts across communication refreshes, authoritative Requester versions after comments, explicit stale recovery, distinct timeline loading/error/retry states, Unicode code-point limits and correction of the header separator. Commit `3615182` binds Staff drafts to their source version, reloads owned Requester detail after successful or uncertain comments, preserves drafts through explicit reload, adds timeline states/retry, validates astral Unicode boundaries and adds a real two-client browser race. Full client 125, focused UI 16, Playwright 2 and production build passed. | Changes requested on commit `18ca182`; fixes committed as `3615182`, followed by evidence commit `e6923c4`. Merged by the reviewer as `e74f3de` at 2026-09-14 10:58:48 UTC. No later peer approval is recorded. |
| [PR #49](https://github.com/MacOverlorD/toktickit/pull/49) | Titihinan Sobking (`Ohmmykung09`), collaborator | Implements Issue #39 Administrator-only account list/search/filter/create/edit/reset, optimistic versions, session invalidation, current-actor checks, serializable last-admin protection, atomic owner unassignment, responsive UI and real browser coverage. Server 143, client 128, focused API/policy 7, focused UI 3, Playwright 1 and production build passed. | Review requested on commit `fb4caa7`; approval pending. |

Branch flow: feature/3-* -> lab3-staging -> main. Record final-main verification
only after the release exists and its tests actually run.

## Author audit (not peer approval)

Codex reviewed the contract against Lab 3 sections 4-14 and the existing API/data
baseline. Resolved no-op version semantics, credential/session race behavior,
exact assignment errors, attachment list shape, specific conflict UI feedback,
email input policy and table formatting. See [review-readiness.md](./review-readiness.md)
for coverage and verification. The peer-review row above is transcribed from
GitHub's review and merge metadata.

## Review activity on related implementation PRs

On 2026-09-11, MacOverlorD reviewed [PR #37](https://github.com/Ohmmykung09/toktickit/pull/37),
the related User-migration implementation from `Ohmmykung09`. The review comment
identified seed-state overwrites, committed/default credentials, bcrypt hash
provisioning, incomplete canonical-email enforcement, non-isolated migration
tests, and missing Issue 34 schema pieces. The review was posted as a comment;
no approval or merge was recorded.

On 2026-09-11, MacOverlorD reviewed [PR #38](https://github.com/Ohmmykung09/toktickit/pull/38),
the related Lab 3 authentication and mandatory-password-change implementation from
`Ohmmykung09`. The review requested changes for unauthenticated access reaching
protected APIs, non-atomic concurrent failed-login accounting, and a stale-credential
login race that could create a session after a concurrent password change. The three
findings were submitted as blocking inline comments on commit `fbf0326`; no approval
or merge was recorded.
