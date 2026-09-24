# Lab 4 Sprint Setup

Status: setup complete and [PR #63](https://github.com/MacOverlorD/toktickit/pull/63) is ready for peer review. Issue [#54](https://github.com/MacOverlorD/toktickit/issues/54) is in PR Review; Issues #55-#62 are Backlog. No peer approval or runtime completion is claimed yet.

## Workflow

- Source: `SE+Lab+4.pdf` in this directory.
- Board: https://github.com/users/MacOverlorD/projects/2
- Label: `lab-04`; assignee: `MacOverlorD`.
- Baseline: `main` at `6e327a799531e9814101c0ef8309bf70d1e05064`.
- Integration branch: `lab4-staging`.
- Feature branches start from the current `lab4-staging` and target it through reviewed pull requests.
- Final release PR targets `main`; all required checks are rerun on the exact merged commit.
- Board flow: Backlog -> Specified -> Started -> PR Review -> Fixing -> Done.

## Nine issues

| Seq. | Issue | Branch | Depends on |
|---|---|---|---|
| 01 | [#54 Engineering Contract and Requirement Baseline](https://github.com/MacOverlorD/toktickit/issues/54) | `feature/4-01-engineering-contract` | None |
| 02 | [#55 Actions Taken Data Model, Migration, and Seed](https://github.com/MacOverlorD/toktickit/issues/55) | `feature/4-02-actions-data` | #54 |
| 03 | [#56 Actions Taken Domain and REST API](https://github.com/MacOverlorD/toktickit/issues/56) | `feature/4-03-actions-api` | #54, #55 |
| 04 | [#57 Actions Taken Ticket Detail UI](https://github.com/MacOverlorD/toktickit/issues/57) | `feature/4-04-actions-ui` | #56 |
| 05 | [#58 Final Ticket Workflow and Resolution Gate](https://github.com/MacOverlorD/toktickit/issues/58) | `feature/4-05-ticket-workflow` | #54, #56 |
| 06 | [#59 Requester Dashboard](https://github.com/MacOverlorD/toktickit/issues/59) | `feature/4-06-requester-dashboard` | #54, #55 |
| 07 | [#60 IT Staff and Administrator Dashboard](https://github.com/MacOverlorD/toktickit/issues/60) | `feature/4-07-staff-dashboard` | #54, #55 |
| 08 | [#61 Integrated Regression and Final Hardening](https://github.com/MacOverlorD/toktickit/issues/61) | `feature/4-08-final-hardening` | #55-#60 |
| 09 | [#62 Release Integration and Submission Evidence](https://github.com/MacOverlorD/toktickit/issues/62) | `feature/4-09-release-submission` | #54-#61 |

Issues #59 and #60 may proceed in parallel only after their shared contract and data dependencies are approved.

## Contract documents

- [Product specification](./specification.md)
- [API contract](./api-spec.md)
- [UI contract](./ui-spec.md)
- [Test and traceability plan](./tests.md)
- [Data and migration contract](./data-migration.md)
- [Decision log](./decisions.md)
- [Glossary](./glossary.md)
- [Review readiness](./review-readiness.md)
- [Peer-review record](./reviewer.md)
- [AI-use record](./ai-use.md)

## Evidence policy

Feature issues own implementation-level tests. Issue #61 verifies the integrated Labs 1-4 system and captures responsive/accessibility evidence. Issue #62 records genuine review and final-main results, then produces exactly one submission PDF containing Answer Part 1 through Answer Part 9. Planned checks are never recorded as passed until they have actually run.
