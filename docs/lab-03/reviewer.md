# Lab 3 Review Evidence

Status: Issue #33 reviewed, approved, and merged into `lab3-staging`.

Record real reviewer identity, PR URL, comments, response, resulting change and
approval evidence for each feature PR and the release PR. Do not substitute AI
self-review for a required peer review. Add records as work happens.

| PR | Reviewer | Comment / response / change | Approval evidence |
|---|---|---|---|
| [PR #42](https://github.com/MacOverlorD/toktickit/pull/42) | Titihinan Sobking (`Ohmmykung09`), collaborator | Reviewed the complete lab handout and Lab 2 baseline. Confirmed specification structure, authorization/status rules, data-preserving migration, API/UI contracts, FR/BR/AC traceability, Markdown tables, relative links, whitespace checks, and build after Prisma Client generation. Reported one non-blocking source-section correction; corrected from sections 1-13 to 1-14 in this evidence update. | Approved commit `270bf9a` at 2026-09-10 16:50:34 UTC; merged by the reviewer as merge commit `6418e3f` at 2026-09-10 16:50:51 UTC. |
| [PR #44](https://github.com/MacOverlorD/toktickit/pull/44) | Titihinan Sobking (`Ohmmykung09`), collaborator | Requested an explicit all-or-nothing migration transaction with failure proof, complete legacy-email syntax preflight, and immutable seed fixture identity. The response added transaction boundaries and rollback coverage, the full Lab 3 email policy check, a reserved unique `fixtureKey`, and an edited-email seed rerun test. Focused tests, full server tests, production build, and repeated populated-database seeds passed. | Changes requested on commit `0d8eeb4`; response pushed and re-review pending. |

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