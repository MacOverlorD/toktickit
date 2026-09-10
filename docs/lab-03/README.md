# Lab 3 Sprint Setup

Status: Setup complete; Issue 01 (#33) approved and merged. Issues 02-09 are Backlog.

## Workflow

- Board: https://github.com/users/MacOverlorD/projects/2
- Label: lab-03; assignee: MacOverlorD.
- Baseline: main at 6a015da569b8f8e276f32ab67071acb891580836.
- Feature branches start from lab3-staging and target lab3-staging through PRs.
- Final release PR targets main after integration/peer review; verify final main again.
- Board statuses: Backlog -> Specified -> Started -> PR Review -> Fixing (when needed) -> Done.
- Only the staging and Issue 01 feature branches are created now; create later feature branches from the then-current staging baseline.

## Nine issues

| Sequence | GitHub issue | Feature branch | Dependencies |
|---|---|---|---|
| 01 | [#33 - Define the engineering contract and test plan](https://github.com/MacOverlorD/toktickit/issues/33) | `feature/3-01-engineering-contract` | None |
| 02 | [#34 - Migrate the data model and seed Lab 3 accounts](https://github.com/MacOverlorD/toktickit/issues/34) | `feature/3-02-data-migration` | #33 |
| 03 | [#35 - Implement authentication, authorization and the application shell](https://github.com/MacOverlorD/toktickit/issues/35) | `feature/3-03-authentication` | #33, #34 |
| 04 | [#36 - Migrate Requester workflows to authenticated identity](https://github.com/MacOverlorD/toktickit/issues/36) | `feature/3-04-requester-regression` | #33, #34, #35 |
| 05 | [#37 - Implement the IT Staff Ticket Queue](https://github.com/MacOverlorD/toktickit/issues/37) | `feature/3-05-staff-queue` | #33, #34, #35 |
| 06 | [#38 - Implement Ticket Detail, workflow and communication](https://github.com/MacOverlorD/toktickit/issues/38) | `feature/3-06-staff-ticket-detail` | #33, #34, #35, #36, #37 |
| 07 | [#39 - Implement Administrator User Management](https://github.com/MacOverlorD/toktickit/issues/39) | `feature/3-07-user-management` | #33, #34, #35 |
| 08 | [#40 - Complete integrated testing and visual verification](https://github.com/MacOverlorD/toktickit/issues/40) | `feature/3-08-integrated-verification` | #33, #34, #35, #36, #37, #38, #39 |
| 09 | [#41 - Integrate the release and prepare submission evidence](https://github.com/MacOverlorD/toktickit/issues/41) | `feature/3-09-release-submission` | #33, #34, #35, #36, #37, #38, #39, #40 |

## Issue 01 completion

The [specification](./specification.md) has 11 sections, ten FRs, twenty-six
BRs and seventeen ACs. The [test plan](./tests.md) maps all ACs to planned test
files and concrete positive/negative/boundary scenarios. API and UI contracts
now define endpoint DTOs, role/session/CSRF policy, queue queries, screen modes
and feedback. D-01 through D-07 have proposed decisions with rationale.

Merged PR: https://github.com/MacOverlorD/toktickit/pull/42
Authoring, document validation, collaborator approval, and merge are complete.
See [review-readiness.md](./review-readiness.md) and [reviewer.md](./reviewer.md).
Runtime feature tests remain Planned because Issue 01 is documentation-only;
document validation covers structure, traceability, local links and whitespace.

## Evidence requirements

Maintain reviewer.md and ai-use.md as the sprint progresses. Feature issues own
their tests; Issue 08 verifies the integrated product. Issue 09 collects genuine
final-main and review evidence into exactly one PDF, Answer Part 1 through
Answer Part 9. Do not mark Issue 09 Done until its final deliverables exist.
