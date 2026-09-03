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
| #13 UI foundation | `feature/2-03-ui-foundation` | [#22](https://github.com/MacOverlorD/toktickit/pull/22) | [@TauForge](https://github.com/TauForge) | [Requested mobile navigation regression coverage](https://github.com/MacOverlorD/toktickit/pull/22#pullrequestreview-5078975485) | Added open/close and route-change coverage in `0869ccc`; [reported verification and requested re-review](https://github.com/MacOverlorD/toktickit/pull/22#issuecomment-5495178643) | [Approved](https://github.com/MacOverlorD/toktickit/pull/22#pullrequestreview-5079070800) | `bd320b8` |
| #14 Requester context | `feature/2-04-requester-context` | [#23](https://github.com/MacOverlorD/toktickit/pull/23) | [@Ohmmykung09](https://github.com/Ohmmykung09) | [Requested changes](https://github.com/MacOverlorD/toktickit/pull/23#pullrequestreview-5088392924) | Addressed in `a6e166a`; [replied to all review threads](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913234033) | [Approved](https://github.com/MacOverlorD/toktickit/pull/23#pullrequestreview-5089525955) | `20f4f23` |
| #15 Create Ticket | `feature/2-05-create-ticket` | [#24](https://github.com/MacOverlorD/toktickit/pull/24) | [@Ohmmykung09](https://github.com/Ohmmykung09) | [Requested four correctness fixes](https://github.com/MacOverlorD/toktickit/pull/24#pullrequestreview-5102433024) | Addressed in `59367af`; [replied to all review threads](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3926527665) | Pending re-review | Pending |
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
| 2026-09-01 | [PR #22 review](https://github.com/MacOverlorD/toktickit/pull/22#pullrequestreview-5078975485) | [@TauForge](https://github.com/TauForge) | Add a regression test for mobile navigation/menu behavior. | Yes | Expanded the accessibility test to verify closed/open state, `aria-expanded`, route navigation, and automatic menu closing in `0869ccc`; [reported 3/3 focused and 24/24 full client tests](https://github.com/MacOverlorD/toktickit/pull/22#issuecomment-5495178643). | [Approved after re-review](https://github.com/MacOverlorD/toktickit/pull/22#pullrequestreview-5079070800) and merged as `bd320b8` |
| 2026-09-02 | [PR #23 storage thread](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913077888) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Handle sessionStorage write failures separately from inactive requesters. | Yes | Clears the stored value, clears in-memory selection, returns a distinct persistence result, and adds a regression test in `a6e166a`; [replied](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913234033). | Focused UI tests passed |
| 2026-09-02 | [PR #23 response-shape thread](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913082845) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Enforce the documented public requester response shape. | Yes | Maps validated items to exactly `id`, `name`, and `email`, with an extra-field regression test in `a6e166a`; [replied](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913233787). | Focused UI tests passed |
| 2026-09-02 | [PR #23 evidence thread](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913088812) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Update the Issue #14 review evidence. | Yes | Updated the Issue #14 row in `reviewer.md`; [replied](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913234105). | Evidence update committed with review-fix follow-up |
| 2026-09-02 | [PR #23 middleware thread](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913103081) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Clarify where requester-context middleware is applied. | Yes | Documented that the exported middleware is intentionally mounted with ticket/attachment routers in Issues #15-18; protected-route harness verifies behavior and client guard is not server enforcement; [replied](https://github.com/MacOverlorD/toktickit/pull/23#discussion_r3913233996). | API context tests passed |
| 2026-09-02 | [PR #23 approval](https://github.com/MacOverlorD/toktickit/pull/23#pullrequestreview-5089525955) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Confirmed the requested requester-context fixes were complete. | Yes | No further code change was requested. | Approved and merged as `20f4f23` |
| 2026-09-03 | [PR #24 idempotency thread](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3924978854) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Resolve an existing same-key intent before mutable active-reference validation. | Yes | Added a pre-reference replay resolver while preserving changed-payload `409` behavior; [replied](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3926527665). | Inactive-reference replay regression passed |
| 2026-09-03 | [PR #24 navigation thread](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3924986232) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Guard Cancel and My Tickets, and prevent every visible exit while creation is pending. | Yes | Centralized draft/submitting navigation protection and applied it to brand, list, requester, and Cancel exits; [replied](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3926527518). | Pending-navigation UI regressions passed |
| 2026-09-03 | [PR #24 malformed JSON thread](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3924991690) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Return a safe client error rather than `500` for malformed JSON. | Yes | Mapped body-parser parse failures to JSON `400 VALIDATION_ERROR`; [replied](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3926527556). | Malformed-body API regression passed |
| 2026-09-03 | [PR #24 field-error thread](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3924996628) | [@Ohmmykung09](https://github.com/Ohmmykung09) | Validate `fieldErrors` before placing server data in React state. | Yes | Added a known-field, non-array, non-empty-string parser and malformed-response tests; [replied](https://github.com/MacOverlorD/toktickit/pull/24#discussion_r3926527304). | Client API regression suite passed |

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
