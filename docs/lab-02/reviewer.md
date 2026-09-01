# Lab 2 Peer Review Record

Repository: [MacOverlorD/toktickit](https://github.com/MacOverlorD/toktickit)  
Project: [TokTickIT Individual Sprints](https://github.com/users/MacOverlorD/projects/2)

This file records review evidence as work occurs. Do not add an approval,
response, or outcome until it is visible on GitHub. Update the relevant row in
the same feature branch when practical, or in the final evidence Issue when the
PR cannot update itself after merge.

## 1. Student and Reviewer Identity

| Role | Name | GitHub username |
|---|---|---|
| Student/author | MacOverlorD | [@MacOverlorD](https://github.com/MacOverlorD) |
| Primary peer reviewer | TauForge | [@TauForge](https://github.com/TauForge) |
| Additional reviewer(s) | Pending | Pending |

## 2. Pull Requests Authored for Lab 2

| Issue | Branch | PR to `lab2-staging` | Reviewer | Review received | Author response/change | Approval | Merge commit |
|---|---|---|---|---|---|---|---|
| #11 Engineering contract | `feature/2-01-engineering-contract` | [#20](https://github.com/MacOverlorD/toktickit/pull/20) | [@TauForge](https://github.com/TauForge) | Requested a concrete idempotency/Ticket Number example | Added the example in `c2ab898` and [requested re-review](https://github.com/MacOverlorD/toktickit/pull/20#issuecomment-5492954836) | [Approved](https://github.com/MacOverlorD/toktickit/pull/20#pullrequestreview-5077249024) | `af0e8a9` |
| #12 Data foundation | `feature/2-02-data-foundation` | [#21](https://github.com/MacOverlorD/toktickit/pull/21) | [@TauForge](https://github.com/TauForge) | Blocked case-sensitive Requester email identity | Added canonical application/database enforcement in `3d17277` and [requested re-review](https://github.com/MacOverlorD/toktickit/pull/21#discussion_r3904076246) | [Approved](https://github.com/MacOverlorD/toktickit/pull/21#pullrequestreview-5078034753) | `ea3a21d` |
| #13 UI foundation | `feature/2-03-ui-foundation` | Pending | Pending | Pending | Pending | Pending | Pending |
| #14 Requester context | `feature/2-04-requester-context` | Pending | Pending | Pending | Pending | Pending | Pending |
| #15 Create Ticket | `feature/2-05-create-ticket` | Pending | Pending | Pending | Pending | Pending | Pending |
| #16 My Tickets | `feature/2-06-my-tickets` | Pending | Pending | Pending | Pending | Pending | Pending |
| #17 Ticket Detail | `feature/2-07-ticket-detail` | Pending | Pending | Pending | Pending | Pending | Pending |
| #18 Attachments | `feature/2-08-attachments` | Pending | Pending | Pending | Pending | Pending | Pending |
| #19 E2E/release readiness | `feature/2-09-e2e-release` | Pending | Pending | Pending | Pending | Pending | Pending |
| Release | `lab2-staging` | Pending PR to `main` | Pending | Pending | Pending | Pending | Pending |

## 3. Detailed Comments Received

Add one row per substantive review thread, including non-blocking comments that
identify a real engineering tradeoff.

| Date | PR/thread link | Reviewer | Comment summary | Agreed? | Response and resulting change | Verification |
|---|---|---|---|---|---|---|
| 2026-09-01 | [PR #20 review](https://github.com/MacOverlorD/toktickit/pull/20#pullrequestreview-5077121977) | [@TauForge](https://github.com/TauForge) | Add a short example clarifying idempotent Ticket creation and Ticket Number generation. | Yes | Added first-create, same-key replay, changed-payload conflict, and number-collision behavior in `specification.md`; replied with commit `c2ab898`. | [Approved after re-review](https://github.com/MacOverlorD/toktickit/pull/20#pullrequestreview-5077249024) and merged as `af0e8a9` |
| 2026-09-01 | [PR #21 thread](https://github.com/MacOverlorD/toktickit/pull/21#discussion_r3904006219) | [@TauForge](https://github.com/TauForge) | Prevent case variants of Requester email from becoming distinct owner identities. | Yes | Added shared trim/lowercase normalization, normalized seed writes, a canonical database CHECK migration, and unit/integration coverage in `3d17277`; [replied in thread](https://github.com/MacOverlorD/toktickit/pull/21#discussion_r3904076246). | [Approved after re-review](https://github.com/MacOverlorD/toktickit/pull/21#pullrequestreview-5078034753) and merged as `ea3a21d` |

## 4. Reviews Given to Classmates

| Date | Classmate repository/PR | Author | Files/behavior reviewed | Comment link and summary | Author response/outcome |
|---|---|---|---|---|---|
| Pending | Pending | Pending | Pending | Pending | Pending |

## 5. Approval and Workflow Checklist

- [ ] Every Issue was implemented on its documented feature branch.
- [ ] Every feature PR targeted `lab2-staging`, not `main`.
- [ ] Every feature PR received peer review and approval before merge.
- [ ] Substantive comments received and responses are linked above.
- [ ] Requested changes were verified by tests or a documented manual check.
- [ ] Reviews given to classmates contain actionable engineering feedback.
- [ ] Final integration tests passed on `lab2-staging`.
- [ ] One release PR merged `lab2-staging` into `main`.
- [ ] Final GitHub Project shows all Lab 2 Issues in `Done`.
- [ ] Final rendered `reviewer.md` is included in Answer Part 1 evidence.

## 6. Final Review Summary

Pending until the release PR. Summarize the most important feedback received,
what changed because of it, feedback not adopted and why, and what was learned
from reviewing another PR. Keep links to the source GitHub threads above.
