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
