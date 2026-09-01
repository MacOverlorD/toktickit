# Lab 2 AI Use Record

## 1. Tools Used

| Tool/model | Use in Lab 2 | Responsibility retained by student |
|---|---|---|
| OpenAI Codex coding agent | Read the Labsheet, analyze requirements, organize Issues, draft the engineering contract, implement later scoped Issues, and run verification commands | Review and approve requirements, understand decisions, inspect every change, operate Git commits/PRs, demonstrate behavior, and accept final accountability |

Exact model/version should be added from the Codex session information available
at submission time if required by the course evidence.

## 2. Selected Key Prompts

The final submission requires 6-10 selected prompts. Record concise prompts that
changed a specification, implementation, test, or review decision. Do not paste
the full chat transcript or include secrets.

| # | Date | Phase | Selected prompt (concise) | AI contribution | Student review/decision | Evidence |
|---|---|---|---|---|---|---|
| 1 | 2026-09-01 | Specification discovery | Read `docs/lab-02/Lab_02_labsheet.pdf` closely and explain the required work sequence in detail. | Extracted scope, workflow, documentation, test levels, UI, API, database, and submission requirements. | Requested clarification before implementation and used the Labsheet as source of truth. | Issue decomposition and this contract |
| 2 | 2026-09-01 | Sprint setup | Set up everything required so the repository is ready before Issue 1. | Created `lab2-staging`, Lab 2 label, nine scoped Issues, dependencies, and Project backlog entries. | Confirmed feature work must not start on staging/main and asked to proceed only after setup. | [Project board](https://github.com/users/MacOverlorD/projects/2), Issues #11-#19 |
| 3 | 2026-09-01 | Engineering contract | Start Issue 1 and make it ready according to the Lab 2 workflow and requirements. | Moved #11 to Started, created its feature branch, audited the baseline, resolved open engineering decisions, and drafted six required documents. | Reviewed the summarized decisions and approved the contract for implementation on 2026-09-01. | `docs/lab-02/*.md` and Issue #11 |
| 4 | 2026-09-01 | Data foundation | Continue with the next Lab 2 Issue after the engineering-contract PR was approved and merged. | Created the required branch from updated staging; implemented the Prisma models, migration checks, repeatable seed, Ticket Number/idempotency service, and focused database tests. | Kept the work inside Issue #12, preserved the approved contract, and required migration plus regression verification before review. | Issue #12 branch, migration, and `server/tests/lab-02/` |
| 5 | 2026-09-01 | UI foundation | Continue after the data-foundation PR was approved and merged. | Created the required branch from updated staging; implemented the Zen Green shell, route foundation, reusable fields/actions/badges/feedback states, and style/accessibility tests. | Kept requester API behavior outside Issue #13, required exact design tokens and breakpoints, and verified client plus server regressions before review. | Issue #13 branch and `client/tests/lab-02/` |
| 6 | Pending | Create Ticket | Pending selected prompt | Pending | Pending | Pending |
| 7 | Pending | My Tickets/detail | Pending selected prompt | Pending | Pending | Pending |
| 8 | Pending | Attachments/E2E | Pending selected prompt | Pending | Pending | Pending |

Before submission, keep 6-10 strongest completed rows and remove unused Pending
rows. Preserve original meaning; minor shortening for readability is acceptable.

## 3. Important AI-Assisted Decisions

| Decision | AI recommendation | Student approval/status |
|---|---|---|
| Development identity transport | `X-Development-Requester-Id` plus tab-scoped `sessionStorage`; explicitly not authentication | Approved 2026-09-01 |
| Ownership failure | Return the same `404` for missing and cross-owner Ticket/Attachment | Approved 2026-09-01 |
| Duplicate creation | Client busy guard plus UUID `Idempotency-Key` and database uniqueness | Approved 2026-09-01 |
| Attachment transaction boundary | Create Ticket first, upload one file per request, retain Ticket on upload failure, compensate file/metadata failures | Approved 2026-09-01 |
| List contract | Owner-scoped search/filter/sort and 1-based pages with sizes 10/20/50 | Approved 2026-09-01 |
| UI system | Zen Green tokens, flat work-focused surfaces, table desktop/cards mobile, explicit accessible states | Approved 2026-09-01 |

## 4. Verification and Corrections

- The agent's work is checked against the Labsheet, Issue acceptance criteria,
  current repository state, and GitHub Project workflow.
- Generated contract documents must be read and approved by the student before
  implementation. Ambiguities are resolved in the documents, not silently in code.
- For implementation Issues, record tests run, failures found, review feedback,
  and corrections. Do not record an AI claim of `done` as evidence by itself.
- Never include `.env` values, credentials, tokens, private student data, or raw
  production records in prompts or this document.

## 5. My Reflection

Pending student-authored reflection before submission. In a short paragraph,
state where AI improved specification or testing quality, one place its output
needed correction or stronger judgment, and how you verified the final work.
This section must be written in the student's own words.
