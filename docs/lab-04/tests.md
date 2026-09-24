# Lab 4 Test and Traceability Plan

Status: planned. No runtime test in this document is marked passed during Issue #54.

## 1. Test layers

- Domain unit tests: Action validation/lifecycle, Ticket transitions, resolution gate, dashboard definitions.
- API/integration tests: authentication, roles, ownership, DTO projections, idempotency, concurrency, transactions, safe errors, aggregate calculations.
- Migration/seed tests: clean database, populated Lab 3 database, relationship preservation, failure/recovery, repeatable seed.
- UI/component tests: all screen modes, first-invalid focus, pending/deduplication, stale conflict, role controls, accessible names.
- Responsive/style checks: desktop, tablet, mobile, and 320px overflow/overlap/readability.
- E2E: cross-role Action, resolution, dashboard drill-down, and Labs 1-3 regression flows.
- Performance smoke: bounded dashboard/list queries with documented data size and local p95.

## 2. Planned target areas

| ID | Target | Key scenarios |
|---|---|---|
| ACT-DOM | Server Action service tests | field boundaries, conditional note, lifecycle, terminal immutability, assignee rules |
| ACT-API | Ticket Action route tests | list/create/edit/assign/start/complete/cancel, role/owner bypass, projections, ordering |
| ACT-CON | Concurrency/idempotency tests | repeated create, key mismatch, stale edit/transition, simultaneous terminal commands |
| FLOW | Ticket workflow tests | complete transition matrix, resolution gate, Requester indication, reopen/cancel |
| DASH-REQ | Requester dashboard tests | ownership, zero state, counts, time boundary, drill-down semantics |
| DASH-OPS | Operational dashboard tests | unassigned/owned/priority/status/Actions, role denial, Admin behavior |
| MIG | Prisma migration/seed tests | clean/populated/recovery/preservation/repeat execution |
| UI-ACT | Actions UI tests | modes, validation, focus, draft recovery, double submit, responsive |
| UI-DASH | Dashboard UI tests | zero/nonzero/loading/failure/drill-down/role navigation/responsive |
| E2E-4 | Browser flows | Staff Action -> resolve -> Requester view; dashboards; conflict/error paths |
| REG | Labs 1-3 regression | auth, Tickets, attachments, comments, notes, queue, user management |
| PERF | Performance smoke | dashboard/list warmup and samples; no N+1; proposed local p95 <= 500ms |

### 2.1 Concrete server, API, and data cases

| Test ID | Type | Maps to | Scenario | Expected result | Automated file | Status |
|---|---|---|---|---|---|---|
| L4-ACT-001 | Unit | FR-02, BR-04-05, AC-01 | Exercise every Action edge and every omitted/self/terminal edge | Allowed edges reach exact state; all others reject without mutation | `server/tests/lab-04/action-domain.test.ts` | Planned |
| L4-ACT-002 | API/Auth | FR-01-02, BR-19, AC-01/03 | Run list/get/create/edit/assign/start/complete/cancel as Requester, Staff and Admin on owned, cross-owner, unassigned, other-staff-owned and terminal Tickets | Matrix status/code/projection is exact; forbidden/missing responses disclose nothing and write nothing | `server/tests/lab-04/actions.api.test.ts` | Planned |
| L4-ACT-003 | API/Audit | FR-03, BR-02-03, AC-02 | Creator A creates/assigns to B; B completes; C attempts client performer fields | createdBy=A, assignedTo=B, performedBy=B; client actor fields rejected; terminal facts immutable | `server/tests/lab-04/actions.api.test.ts` | Planned |
| L4-ACT-004 | Unit/API | FR-03, BR-06-08, AC-02 | Check blank/max/max+1 Unicode fields, invalid surrogate, optional null/blank, follow-up false with note, invalid/future actionAt, inactive/wrong-role assignee | Exact field error; +5 minute boundary accepted and +1 ms rejected; no partial write | `server/tests/lab-04/action-validation.test.ts` | Planned |
| L4-ACT-005 | Integration | BR-09, AC-04 | Send stale edit plus concurrent complete/cancel at one version | Stale is 409; exactly one terminal command commits; winner data preserved | `server/tests/lab-04/action-concurrency.test.ts` | Planned |
| L4-ACT-006 | Integration | BR-10, AC-04 | Repeat UUID with canonical-equivalent payload, then reuse with changed payload | Replay is 200 same ID/no write; mismatch is 409 `IDEMPOTENCY_KEY_REUSED` | `server/tests/lab-04/action-concurrency.test.ts` | Planned |
| L4-ACT-007 | API/Privacy | BR-11/19, AC-03 | Compare operational and Requester DTOs and attempt wrong Ticket nesting/cross-owner access | Shared-safe allowlist only; assignment/version/control data absent; non-disclosing 404 | `server/tests/lab-04/actions.api.test.ts` | Planned |
| L4-FLOW-001 | Unit/API | FR-05, AC-05 | Execute every Ticket source-target pair for Staff/Admin with owner/confirm variations | All 19 allowed edges succeed only with matrix prerequisites; all other pairs reject no-write | `server/tests/lab-04/ticket-workflow.test.ts` | Planned |
| L4-FLOW-002 | Integration | FR-04, BR-12, AC-05 | Resolve with no Action, planned/cancelled/blank-result/old-cycle Action, then current-cycle qualifying Action | Only current-cycle completed nonblank-result Action permits RESOLVED atomically | `server/tests/lab-04/ticket-workflow.test.ts` | Planned |
| L4-FLOW-003 | Integration | BR-13, AC-05 | Resolve, reopen, and try resolving without new work; then complete new-cycle Action | Reopen increments cycle/clears resolvedAt and indication; old Action cannot qualify; new one can | `server/tests/lab-04/ticket-workflow.test.ts` | Planned |
| L4-MIG-001 | Migration | BR-17, AC-08 | Apply migration to clean DB and populated Lab 3 snapshot | Migration succeeds; old row counts/relations preserved; Tickets cycle=1; no invented Actions/resolvedAt | `server/tests/lab-04/migration.test.ts` | Passed in Issue #55 |
| L4-MIG-002 | Migration/Recovery | BR-17, AC-08 | Force transactional failure, then rehearse documented dump restore after post-check failure | DDL rolls back or restored DB matches preflight counts/relations and prior app smoke works | `server/tests/lab-04/migration.test.ts` | Passed rollback path in Issue #55; verified backup retained locally |
| L4-MIG-003 | Seed | BR-18, AC-08 | Seed twice after user-managed rows exist | Required zero/one/many/cycle/boundary fixtures exist once; IDs/counts/user rows unchanged on rerun | `server/tests/lab-04/migration.test.ts` | Passed in Issue #55 |
| L4-DREQ-001 | API/DB | FR-06, BR-14-16, AC-06 | Query zero/nonzero Requester data at asOf-7d, +/-1 ms, tie times and cross-owner rows | Exact counts, inclusive boundary, ID tie order, cap 10, safe zero and drill-down match direct query | `server/tests/lab-04/dashboard.api.test.ts` | Planned |
| L4-DOPS-001 | API/DB | FR-07, BR-14-16, AC-07 | Query unassigned/owned/status/priority/assigned/performed/recent/urgent/Admin account metrics | Every value/list matches direct query and authenticated actor; all enum keys/zeros present | `server/tests/lab-04/dashboard.api.test.ts` | Planned |
| L4-DASH-002 | API/Auth | FR-06-07, AC-06/07 | Call both dashboards as each role; add userId/query/body/unknown filters | Only role endpoint succeeds; identity injection/unknown input rejected; no cross-role data | `server/tests/lab-04/dashboard.api.test.ts` | Planned |
| L4-PERF-001 | Performance smoke | AC-11 | PostgreSQL 1,000 Tickets/5,000 Actions, five warmups and 30 sequential samples per dashboard | No errors/N+1 and each endpoint p95 <= 500 ms; environment/result recorded | `server/tests/lab-04/dashboard-performance.test.ts` | Planned |

### 2.2 Concrete client, responsive, E2E, and release cases

| Test ID | Type | Maps to | Scenario | Expected result | Automated file | Status |
|---|---|---|---|---|---|---|
| L4-UIA-001 | Component | FR-01-03/08, AC-01/02/09 | Render Actions loading, empty, populated, create/edit/assign/start/complete/cancel, validation, forbidden, missing and safe-failure modes | Correct role/state controls and feedback; creator/assignee/performer labels remain distinct | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| L4-UIA-002 | Component | BR-09-10, AC-04/09 | Double-submit create, recover API failure, and receive stale conflict | One request/key while pending; draft retained; conflict reload/reapply path announced | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| L4-UID-001 | Component | FR-06-08, AC-06/09 | Requester dashboard loading/zero/nonzero/error and every drill-down | Exact labels/values; zero guidance; links preserve formula and owned navigation | `client/tests/lab-04/Dashboards.test.tsx` | Planned |
| L4-UID-002 | Component | FR-07-08, AC-07/09 | Staff/Admin dashboard zero/nonzero/error and role navigation | Actor-specific labels are unambiguous; Admin section only for Admin; links preserve filters | `client/tests/lab-04/Dashboards.test.tsx` | Planned |
| L4-A11Y-001 | Accessibility | FR-08-09, AC-09 | Keyboard traverse forms/cards/dialogs; run semantic-name/live-region checks | Logical order, visible focus, first-invalid focus, dialog focus return, no serious automated violations | `client/tests/lab-04/accessibility-responsive.test.tsx` | Planned |
| L4-RESP-001 | Responsive | FR-09, AC-09 | Render major Lab 4 modes at 1440, 900, 390 and 320 px | No page overflow/clipping/overlap; cards stack; controls remain readable/operable | `e2e/lab-04/responsive-visual.spec.ts` | Planned |
| L4-E2E-001 | E2E | AC-01-05 | Staff creates/assigns; assignee completes; resolves; Requester sees safe Action; reopen and retry resolution | Audit actors correct; requester cannot write; old-cycle Action fails new gate; new Action permits resolution | `e2e/lab-04/actions-workflow.spec.ts` | Planned |
| L4-E2E-002 | E2E | AC-06-07 | Seed boundary data; visit dashboards as Requester/Staff/Admin and follow all drill-downs | Values match fixtures; role isolation/zero states work; destination set matches source metric | `e2e/lab-04/dashboards.spec.ts` | Planned |
| L4-REG-001 | Regression | AC-10 | Run auth, Requester Tickets/Attachments, queue/detail/comments/notes/workflow and user-management suites | Labs 1-3 suites pass without unexplained skip; private/cross-owner data remains protected | `e2e/lab-04/regression.spec.ts` plus existing Lab 1-3 suites | Planned |
| L4-DOC-001 | Document audit | AC-12 | Audit IDs/links/issues/PR/review/AI log/screenshots, final SHA checks and PDF headings | Evidence is real/immutable; exactly Answer Parts 1-9; exactly one submission PDF | `scripts/verify-lab4-docs.mjs` | Planned |

## 3. Acceptance-criterion mapping

| Acceptance criterion | Planned evidence |
|---|---|
| AC-01 | ACT-DOM, ACT-API, E2E-4 |
| AC-02 | ACT-DOM, ACT-API, UI-ACT, E2E-4 |
| AC-03 | ACT-API ownership/role/projection negatives, E2E-4 |
| AC-04 | ACT-CON, UI-ACT repeated-click/conflict recovery |
| AC-05 | FLOW domain/API/UI/E2E matrix |
| AC-06 | DASH-REQ database/API/UI/E2E calculations and drill-down |
| AC-07 | DASH-OPS database/API/UI/E2E calculations and role checks |
| AC-08 | MIG plus final migration status and repeated seed evidence |
| AC-09 | UI-ACT, UI-DASH, automated accessibility and viewport checks |
| AC-10 | REG and complete final integrated commands |
| AC-11 | PERF dataset/query/timing record |
| AC-12 | document audit, issue/PR review links, screenshot inventory, final-PDF audit |

## 4. Requirement mapping

FR-01 through FR-03 map to ACT-DOM/ACT-API/UI-ACT. FR-04 and FR-05 map to FLOW. FR-06 maps to DASH-REQ; FR-07 to DASH-OPS; FR-08 and FR-09 to both UI groups and E2E-4; FR-10 to the document/release audit. BR-01 through BR-13 map to ACT-DOM, ACT-API, ACT-CON, and FLOW. BR-14 through BR-16 map to both dashboard groups. BR-17 and BR-18 map to MIG. BR-19 and BR-20 map to every API negative suite and REG.

## 5. Required negative and boundary coverage

Tests include blank/whitespace/max-length text, invalid date/future skew, follow-up mismatch, missing/inactive/wrong-role assignee, wrong Ticket nesting, requester write, cross-owner reads, arbitrary client actor, invalid/self/terminal transitions, stale versions, repeated keys, key-payload mismatch, direct resolution bypass, empty dashboards, time-boundary records, unsupported filters, database failure, and safe retry.

## 6. Execution record template

For each implementation PR record exact command, commit SHA, environment/database state, pass/fail/skip count, duration, and evidence path. A planned row is never converted to Passed from memory or inference. Issue #61 runs the integrated suite; Issue #62 reruns it on exact final `main`.
