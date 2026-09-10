# Lab 3 Test Plan and Traceability

Status: Initial plan before implementation. All tests below are Planned, not executed.
Paths are proposed targets, not files that already exist. Expand boundary cases
and Given/When/Then details as the Issue #33 contract is completed.

| Test ID | Type | Acceptance criteria | Planned file | Coverage | Status |
|---|---|---|---|---|---|
| AUTH-01 | API | AC-01, AC-02, AC-03 | server/tests/lab-03/auth.api.test.ts | Credentials, inactive users, password-change gate, expiry/logout and session policy | Planned |
| AUTHZ-01 | API/security | AC-04, AC-05 | server/tests/lab-03/authorization.api.test.ts | Direct role denial, spoofing, cross-owner resources and private-note leakage | Planned |
| REG-01 | API/regression | AC-05, AC-06 | server/tests/lab-03/requester-regression.api.test.ts | Authenticated Lab 2 ticket/idempotency/attachment behavior | Planned |
| QUEUE-01 | API | AC-07 | server/tests/lab-03/staff-queue.api.test.ts | Query controls, paging, invalid input and authorization | Planned |
| DETAIL-01 | API | AC-08, AC-09 | server/tests/lab-03/staff-ticket-detail.api.test.ts | Assignment, priority, transitions, resolution indication and conflicts | Planned |
| COMM-01 | API | AC-10 | server/tests/lab-03/comments-notes.api.test.ts | Visibility, append-only author/time, limits and rendering payloads | Planned |
| ADMIN-01 | API | AC-11, AC-12, AC-13 | server/tests/lab-03/users-admin.api.test.ts | Search/CRUD scope/reset/duplicates/one role and concurrent last-admin protection | Planned |
| MIG-01 | Integration | AC-06, AC-14 | server/tests/lab-03/migration.test.ts | Populated Lab 2 and clean migration, relationships and repeated seed safety | Planned |
| UI-01 | UI component | AC-01, AC-15 | client/src/tests/lab-03/Login.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-02 | UI component | AC-02, AC-15 | client/src/tests/lab-03/ChangePassword.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-03 | UI component | AC-03, AC-04, AC-15 | client/src/tests/lab-03/RoleNavigation.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-04 | UI component | AC-05, AC-06, AC-09, AC-10, AC-15 | client/src/tests/lab-03/RequesterRegression.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-05 | UI component | AC-07, AC-15 | client/src/tests/lab-03/StaffTicketQueue.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-06 | UI component | AC-08, AC-09, AC-10, AC-15 | client/src/tests/lab-03/StaffTicketDetail.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UI-07 | UI component | AC-11, AC-12, AC-13, AC-15 | client/src/tests/lab-03/UserManagement.test.tsx | Controls, validation, feedback and role behavior | Planned |
| UNIT-01 | Unit | AC-01, AC-02, AC-09, AC-10, AC-13 | server/tests/lab-03/business-rules.test.ts | Validation boundaries and allowed transitions; supplement real DB concurrency tests | Planned |
| STYLE-01 | UI/style | AC-15, AC-16 | client/src/tests/lab-03/ZenGreen.test.tsx | Tokens, shared components and editable/read-only presentation | Planned |
| E2E-01 | E2E | AC-01, AC-02, AC-03, AC-04 | e2e/lab-03/authentication.spec.ts | Full login/change-password/logout and direct-access flow | Planned |
| E2E-02 | E2E | AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 | e2e/lab-03/staff-ticket-flow.spec.ts | Requester/staff ticket, attachments and communication | Planned |
| E2E-03 | E2E | AC-11, AC-12, AC-13 | e2e/lab-03/user-administration.spec.ts | User lifecycle and safety rules | Planned |
| VIS-01 | Responsive/accessibility/visual | AC-15, AC-16 | e2e/lab-03/visual-evidence.spec.ts | Desktop/tablet/mobile screenshots plus manual keyboard/focus and visual inspection | Planned |
| REL-01 | Release verification | AC-17 | docs/lab-03/reviewer.md; final-main CI/command evidence | Passing suites, peer reviews, traceability and nine-part PDF review | Planned |

## Existing commands

- `npm run test:server`
- `npm run test:client`
- `npm run test:e2e`
- `npm run build`

Confirm Lab 3 test discovery and E2E setup during implementation. Existing E2E
uses local PostgreSQL and creates/deletes scoped test records; do not reset the
development database to obtain evidence. No tests have run for this setup-only change.

## Completion evidence

Replace proposed paths with actual paths, record exact commands, commit SHA,
results and artifacts. Every final AC needs at least one test. Retain feature-level
tests in Issues 3-7; Issue 8 adds integrated verification rather than delaying TDD.
