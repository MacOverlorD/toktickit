# Lab 4 Peer-Review Record

Status: contract and eight implementation PRs approved and merged to staging. Issue #62 preparation/release reviews are not yet completed.

## Contract review

- Issue: [#54](https://github.com/MacOverlorD/toktickit/issues/54)
- Pull request: [#63](https://github.com/MacOverlorD/toktickit/pull/63), targeting `lab4-staging`.
- Reviewer: `Ohmmykung09` (repository collaborator).
- Review decision: CHANGES_REQUESTED on 2026-09-24 at 07:58:55 UTC against `dac4c23`.
- Response commit: `60ba944`; review evidence record commit: `f38ae64`.
- Approval: `Ohmmykung09` approved `f38ae64` on 2026-09-24 at 15:44:16 UTC.
- Merge: `Ohmmykung09` merged PR #63 on 2026-09-24 at 15:44:45 UTC as `51af4c38843206c0bb130114c90b81a88693f857`.

## Required review focus

The reviewer must check requirement coverage, Actions lifecycle, performer/assignee separation, Requester visibility, terminal edit policy, resolution gate, dashboard definitions/time boundaries, migration safety, test traceability, and the absence of invented evidence.

## Findings log

| Date/time | Reviewer | Location | Finding | Response/decision | Resolution link |
|---|---|---|---|---|---|
| 2026-09-24 | Ohmmykung09 | specification roles | Action operation authorization/Ticket access incomplete | Added eight-operation role/state matrix and non-disclosing outcomes | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091228985) |
| 2026-09-24 | Ohmmykung09 | specification workflow | Complete Ticket matrix absent | Added all 19 edges with roles, owner, confirm, side effects and gate | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091230433) |
| 2026-09-24 | Ohmmykung09 | Action actors | Creator incorrectly treated as performer | Separated immutable creator, completion-time performer and optional assignee across contracts | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091231634) |
| 2026-09-24 | Ohmmykung09 | resolution | Prior Action could resolve a reopened Ticket | Added Ticket work cycle; reopen increments it and gate requires current-cycle Action | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091232879) |
| 2026-09-24 | Ohmmykung09 | data/migration | Schema, indexes, idempotency and recovery deferred | Added exact data-migration.md schema/check/index/fingerprint/backup/restore/seed contract | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091234549) |
| 2026-09-24 | Ohmmykung09 | Action API | REST bodies/envelopes/status/errors/bounds incomplete | Defined exact DTOs, route requests, responses, codes, bounds, null and transaction rules | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091236515) |
| 2026-09-24 | Ohmmykung09 | dashboards | Formulas/time boundaries/drill-downs unresolved | Defined predicates, inclusive seven-day window, caps, order, zeros and destinations | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091238751) |
| 2026-09-24 | Ohmmykung09 | test plan | Broad groups lacked executable inventory | Added 24 Planned cases with type, requirement/AC, scenario, expected result and file path | [thread](https://github.com/MacOverlorD/toktickit/pull/63#discussion_r4091241912) |

## Approval log

Re-review completed successfully. [Approval review](https://github.com/MacOverlorD/toktickit/pull/63#pullrequestreview-5306718193) covers head `f38ae64`; [PR #63](https://github.com/MacOverlorD/toktickit/pull/63) is merged. Issue #54 may move to Done and Issue #55 may begin.

Later feature and release reviews append separate sections; an earlier approval does not automatically approve later code.

## Implementation review and approval history

Reviewer for every approval below: `Ohmmykung09`. Responses were posted by `MacOverlorD`. All PRs target `lab4-staging`; each first received CHANGES_REQUESTED and subsequently an APPROVED decision. Full original comments, every reply, exact timestamps and full commit IDs are preserved in [the GitHub API snapshot](../../artifacts/lab-04/review-history.json).

| Issue / PR | Findings and implemented response | Approved head / approval | Staging merge |
|---|---|---|---|
| #55 / [#64](https://github.com/MacOverlorD/toktickit/pull/64) | Rollback now fails after partial DDL; populated fixtures preserve Attachments, Notes and Sessions; test-plan status corrected. | `9ba028b` / [approval](https://github.com/MacOverlorD/toktickit/pull/64#pullrequestreview-5335032621), 2026-09-28 07:05:48 UTC | `58a9897`, 07:05:56 UTC |
| #56 / [#65](https://github.com/MacOverlorD/toktickit/pull/65) | Disabling follow-up clears an omitted note; actionAt requires a timezone-qualified ISO instant; explicit date-format tests added. | `0936b4a` / [approval](https://github.com/MacOverlorD/toktickit/pull/65#pullrequestreview-5341948667), 2026-09-28 16:53:28 UTC | `8f9e9a5`, 16:53:48 UTC |
| #57 / [#66](https://github.com/MacOverlorD/toktickit/pull/66) | Controls respect parent/cycle state; Bangkok time round-trip; editor targets remount; invalid date focus; optional whitespace rejected. | `ca014dd` / [approval](https://github.com/MacOverlorD/toktickit/pull/66#pullrequestreview-5348740516), 2026-09-29 06:50:58 UTC | `3558702`, 06:51:08 UTC |
| #58 / [#67](https://github.com/MacOverlorD/toktickit/pull/67) | Resolution guidance associated with status select; concurrent conflicts recover through Reload latest; gate failure focuses Actions. | `8f8dab7` / [approval](https://github.com/MacOverlorD/toktickit/pull/67#pullrequestreview-5368258028), 2026-09-30 15:15:33 UTC | `c54c5d6`, 15:31:42 UTC |
| #59 / [#68](https://github.com/MacOverlorD/toktickit/pull/68) | Dashboard fixture timestamps all derive from fixedAsOf, preserving deterministic window and order assertions. | `13ea274` / [approval](https://github.com/MacOverlorD/toktickit/pull/68#pullrequestreview-5458116852), 2026-10-08 14:24:41 UTC | `304f0e9`, 14:24:50 UTC |
| #60 / [#69](https://github.com/MacOverlorD/toktickit/pull/69) | Active queue filters preserve count formulas; completed work gets a distinct performer projection; Action anchors focus after loading. | `918f9ad` / [approval](https://github.com/MacOverlorD/toktickit/pull/69#pullrequestreview-5468697739), 2026-10-09 10:12:31 UTC | `1cd25be`, 10:12:42 UTC |
| #61 / [#70](https://github.com/MacOverlorD/toktickit/pull/70) | Root tests include both E2E suites; loaded-state visual/axe waits; 768px overflow fixed; performance uses a fresh asserted schema; archived evidence survives regression. | `0b95dbc` / [approval](https://github.com/MacOverlorD/toktickit/pull/70#pullrequestreview-5473467473), 2026-10-09 17:46:02 UTC | `c0ec977`, 17:46:09 UTC |

## Finding-to-response index

Each pair links the actual review finding and the author's response; response text is not substituted for independent approval.

| PR | Finding | Response |
|---|---|---|
| #64 | [Partial-DDL rollback](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4111803241) | [regression and rollback assertions](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4118292823) |
| #64 | [Legacy relationships](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4111803366) | [expanded pre/post fixture](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4118292942) |
| #64 | [Test status](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4111804457) | [execution wording](https://github.com/MacOverlorD/toktickit/pull/64#discussion_r4118293033) |
| #65 | [Follow-up clear](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4120092710) | [omitted-field regression](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4124803928) |
| #65 | [ISO validation](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4120096728) | [timezone/calendar validation](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4124804206) |
| #65 | [Missing test](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4120099202) | [concrete rejection cases](https://github.com/MacOverlorD/toktickit/pull/65#discussion_r4124804451) |
| #66 | [Parent state](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4125552381) | [state/cycle gating](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4126646476) |
| #66 | [Time zone](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4125555668) | [Bangkok round-trip](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4126647137) |
| #66 | [Editor target](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4125559922) | [keyed forms](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4126647790) |
| #66 | [Invalid date focus](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4125561825) | [focus map](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4126648372) |
| #66 | [Optional whitespace](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4125564093) | [blank versus empty](https://github.com/MacOverlorD/toktickit/pull/66#discussion_r4126649112) |
| #67 | [Guidance placement](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142341171) | [accessible association](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142558863) |
| #67 | [Concurrent conflict](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142344763) | [reload path](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142559250) |
| #67 | [Gate focus](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142348273) | [Actions focus](https://github.com/MacOverlorD/toktickit/pull/67#discussion_r4142559681) |
| #68 | [Fixed fixture time](https://github.com/MacOverlorD/toktickit/pull/68#discussion_r4219832963) | [timestamp correction](https://github.com/MacOverlorD/toktickit/pull/68#discussion_r4220070577) |
| #69 | [Active predicate](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4221406335) | [matching queue totals](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4223109659) |
| #69 | [Performed drill-down](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4221816233) | [performer projection](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4223110730) |
| #69 | [Async anchor](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4221829543) | [post-load focus](https://github.com/MacOverlorD/toktickit/pull/69#discussion_r4223111457) |
| #70 | [Aggregate suite](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232051061) | [both E2E configs](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232757365) |
| #70 | [Loaded visual layout](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232054368) | [ready-state capture](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232757691) |
| #70 | [Completed-state axe](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232057456) | [populated fixtures](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232757893) |
| #70 | [Controlled performance](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232061076) | [fresh-schema measurement](https://github.com/MacOverlorD/toktickit/pull/70#discussion_r4232758097) |

## Release review

Pending. The Issue #62 preparation PR must be reviewed into staging and the subsequent complete staging-to-main release must receive its own peer approval. Exact release PR, reviewer, reviewed SHA, decision and merge SHA will be recorded from GitHub, not invented in advance.
