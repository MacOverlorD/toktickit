# Lab 4 Product Specification

Status: approved by `Ohmmykung09` on PR #63 at commit `f38ae64`; merged to `lab4-staging` as `51af4c3`.

## 1. Purpose

Lab 4 completes TokTickIT with an auditable Actions Taken record, a fully enforced Ticket workflow, role-specific dashboards, and final cross-lab hardening. The backend remains authoritative for identity, authorization, workflow, timestamps, and dashboard calculations.

## 2. Baseline and scope

The baseline is the merged Lab 3 application at commit `6e327a799531e9814101c0ef8309bf70d1e05064`. Existing authentication, Requester Tickets and Attachments, Staff Queue, Ticket Detail, Public Comments, Internal Notes, and Administrator User Management must continue to work.

In scope: Actions Taken, resolution prerequisite, Requester and operational dashboards, migration/seed changes, responsive/accessibility work, regression, review, and final evidence. Out of scope: external notification delivery, SLA automation, billing, inventory, multi-tenant support, and deletion of historical audit records.

## 3. Roles and authorization

An **accessible Ticket** is defined exactly as follows: a Requester may access a Ticket only when `ticket.requesterId` equals the authenticated user ID; IT Staff and Administrators may access every Ticket, including unassigned Tickets and Tickets owned by another operational user. Ticket ownership does not grant or remove operational authorization. All checks use the authenticated active user inside the mutation transaction; client-supplied actor, Requester, creator, performer, or current-user IDs never grant authority.

| Action operation | Requester | IT Staff | Administrator | Ticket/Action state rule |
|---|---|---|---|---|
| List/get | Owned Ticket, shared-safe projection | Any Ticket, operational projection | Any Ticket, operational projection | Allowed in every Ticket and Action state |
| Create | No | Any Ticket | Any Ticket | Ticket must be NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, or REOPENED; creates PLANNED |
| Edit fields | No | Any Ticket | Any Ticket | Active Ticket; Action PLANNED or IN_PROGRESS only |
| Assign/unassign | No | Any Ticket | Any Ticket | Active Ticket; Action PLANNED or IN_PROGRESS; target active IT Staff/Admin or null |
| Start | No | Any Ticket | Any Ticket | Active Ticket; PLANNED -> IN_PROGRESS |
| Complete | No | Any Ticket | Any Ticket | Active Ticket; PLANNED/IN_PROGRESS -> COMPLETED |
| Cancel | No | Any Ticket | Any Ticket | Active Ticket; PLANNED/IN_PROGRESS -> CANCELLED |

For this matrix, active Ticket states are NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, and REOPENED. RESOLVED, CLOSED, and CANCELLED Tickets are read-only for Actions. Requesters always receive 403 `FORBIDDEN` for an Action mutation after authentication and before resource lookup. A missing Ticket/Action, an Action nested under the wrong Ticket, and a Requester's cross-owner read all return the identical 404 `RESOURCE_NOT_FOUND` body. An inactive/expired session returns 401 `UNAUTHENTICATED`. Operational reads and writes do not require the actor to own the Ticket or be the Action assignee.

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Formal Ticket transition | No | Any Ticket, subject to matrix | Any Ticket, subject to matrix |
| Requester dashboard | Own data only | No | No |
| Operational dashboard | No | Yes | Yes |
| User administration | No | No | Yes |

## 4. Functional requirements

- **FR-01 Actions list:** An accessible Ticket exposes its Actions Taken in deterministic newest-first order with an ID tie-breaker.
- **FR-02 Actions lifecycle:** Authorized operational users can create, assign, edit, start, complete, and cancel an Action under the approved state rules.
- **FR-03 Action fields:** Each Action records action date/time, description, result, immutable creator, completion-time performer, optional assignee, follow-up flag, conditional follow-up note, and attachment notes.
- **FR-04 Resolution gate:** A Ticket cannot enter the formal Resolved state until the approved qualifying Action prerequisite is satisfied.
- **FR-05 Final workflow:** The eight Lab 3 Ticket statuses and permitted role transitions remain backend-enforced, including reopen and cancel behavior.
- **FR-06 Requester dashboard:** A Requester sees only own open, waiting, recently updated, and recently resolved Ticket information with useful drill-downs.
- **FR-07 Operational dashboard:** IT Staff sees unassigned work, own work, status/priority distribution, own Actions, and recent/urgent items; Administrator behavior follows D-07.
- **FR-08 Feedback:** Every new screen or mutation has loading, empty, validation, success, forbidden, missing, conflict, and safe-failure behavior where applicable.
- **FR-09 Responsive access:** Lab 4 screens work with keyboard and at desktop, tablet, mobile, and 320px widths without page-level horizontal overflow.
- **FR-10 Evidence:** Requirements, tests, review, screenshots, AI use, final checks, and nine answer parts remain traceable to immutable repository evidence.

## 5. Business rules

- **BR-01:** An Action belongs to exactly one Ticket and cannot be moved to another Ticket.
- **BR-02:** `createdBy` is the authenticated creator, set by the backend at create and immutable. `performedBy` is null until completion, then is set by the backend to the authenticated user who successfully completes the Action and becomes immutable. A cancelled Action has no performer.
- **BR-03:** `assignedTo` is distinct from creator and performer; it may be null or an active IT Staff/Administrator. Assignment expresses responsibility but does not authorize or prove performance.
- **BR-04:** Action states are `PLANNED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`.
- **BR-05:** Transitions are PLANNED -> IN_PROGRESS/COMPLETED/CANCELLED and IN_PROGRESS -> COMPLETED/CANCELLED. COMPLETED and CANCELLED are terminal and immutable.
- **BR-06:** Description is required after trimming. Result is required on completion. Follow-up note is required exactly when follow-up is true.
- **BR-07:** Server time is authoritative for created/updated/completed/cancelled timestamps; action date/time is validated but may represent the actual work time.
- **BR-08:** Completed or cancelled Actions are immutable. A correction is a new Action whose description references the prior Action ID; history is never overwritten.
- **BR-09:** Every Action update uses optimistic concurrency. A stale version returns conflict and does not overwrite newer data.
- **BR-10:** Duplicate create submissions using the same actor, Ticket, and idempotency key return the original result.
- **BR-11:** A Requester receives the shared-safe projection of every Action on an owned Ticket, including creator and performer display names; assignee, versions, idempotency data, work-cycle/control fields, and user IDs are omitted.
- **BR-12:** Formal resolution requires at least one COMPLETED Action with a trimmed nonblank result whose `ticketWorkCycle` equals the Ticket's current `workCycle`.
- **BR-13:** REOPENED atomically increments Ticket.workCycle and clears resolvedAt and the Requester resolution indication, so prior-cycle Actions cannot satisfy a later resolution. The Requester indication remains advisory and never performs a formal transition.
- **BR-14:** Dashboard identity and all aggregates are derived on the backend from the authenticated actor and a single query-time timestamp.
- **BR-15:** Recent lists contain at most ten records ordered by updatedAt descending then ID descending. Seven-day metrics use one server asOf instant and an inclusive 604800000 ms window. Storage is UTC; display is Asia/Bangkok.
- **BR-16:** Dashboard zero states are successful empty results, never errors.
- **BR-17:** Migration is additive, transactional where supported, preserves all Lab 1-3 rows/relations, and documents recovery before execution.
- **BR-18:** Seed execution is idempotent and does not overwrite user-managed state.
- **BR-19:** Errors do not disclose credentials, session tokens, stack traces, internal notes, cross-owner existence, or database details.
- **BR-20:** Historical audit/communication records remain append-only; no feature hard-deletes them.

### 5.1 Final Ticket transition matrix

Both operational roles (IT Staff and Administrator) may execute every permitted edge on any Ticket. Requesters execute none. `Owner required` means the Ticket must have an active IT Staff/Administrator owner at transaction time; the actor need not be that owner. `Confirm` means `confirmed: true` is mandatory. Every omitted edge, including self-transitions, is rejected with 409 `INVALID_TRANSITION` and no write.

| Source | Target | Roles | Owner required | Confirm | Additional effect/gate |
|---|---|---|---|---|---|
| NEW | OPEN | Staff/Admin | No | No | Preserve work cycle |
| NEW | CANCELLED | Staff/Admin | No | Yes | Terminal; Actions become read-only |
| OPEN | IN_PROGRESS | Staff/Admin | Yes | No | Preserve work cycle |
| OPEN | WAITING_FOR_REQUESTER | Staff/Admin | Yes | No | Clear Requester resolution indication |
| OPEN | CANCELLED | Staff/Admin | No | Yes | Terminal; Actions become read-only |
| IN_PROGRESS | WAITING_FOR_REQUESTER | Staff/Admin | Yes | No | Clear Requester resolution indication |
| IN_PROGRESS | RESOLVED | Staff/Admin | Yes | Yes | Require current-cycle qualifying Action; set `resolvedAt=now` |
| IN_PROGRESS | CANCELLED | Staff/Admin | No | Yes | Terminal; Actions become read-only |
| WAITING_FOR_REQUESTER | IN_PROGRESS | Staff/Admin | Yes | No | Preserve work cycle |
| WAITING_FOR_REQUESTER | RESOLVED | Staff/Admin | Yes | Yes | Require current-cycle qualifying Action; set `resolvedAt=now` |
| WAITING_FOR_REQUESTER | CANCELLED | Staff/Admin | No | Yes | Terminal; Actions become read-only |
| RESOLVED | CLOSED | Staff/Admin | Yes | Yes | Preserve `resolvedAt` and work cycle |
| RESOLVED | REOPENED | Staff/Admin | No | Yes | Increment work cycle; clear `resolvedAt` and indication |
| CLOSED | REOPENED | Staff/Admin | No | Yes | Increment work cycle; clear `resolvedAt` and indication |
| REOPENED | OPEN | Staff/Admin | No | No | Preserve new work cycle |
| REOPENED | IN_PROGRESS | Staff/Admin | Yes | No | Preserve new work cycle |
| REOPENED | WAITING_FOR_REQUESTER | Staff/Admin | Yes | No | Clear indication |
| REOPENED | CANCELLED | Staff/Admin | No | Yes | Terminal; Actions become read-only |
| CANCELLED | REOPENED | Staff/Admin | No | Yes | Increment work cycle; clear `resolvedAt` and indication |

Resolution eligibility is evaluated inside the same transaction as the Ticket update. A qualifying Action has status COMPLETED, nonblank `result`, non-null `performedById` and `completedAt`, and `ticketWorkCycle = Ticket.workCycle`. Historical Actions remain visible after reopen but never qualify a later cycle. Status mutations retain the Lab 3 positive `expectedVersion` rule; stale writes return 409 `STALE_RESOURCE` before state/gate details are disclosed.

## 6. Acceptance criteria

- **AC-01:** Operational users can complete the approved Action lifecycle and invalid roles/transitions produce no write.
- **AC-02:** All required Action fields, conditional rules, timestamps, performer, assignee eligibility, ordering, and terminal behavior are enforced in API and UI.
- **AC-03:** Requesters cannot mutate Actions and cannot access another Requester's Ticket or Action data.
- **AC-04:** Repeated creates are idempotent and stale updates return a recoverable conflict.
- **AC-05:** Every allowed Ticket transition succeeds; every forbidden transition and direct resolution-gate bypass fails without a write.
- **AC-06:** Requester dashboard figures match authoritative database queries and drill down without changing ownership meaning.
- **AC-07:** Staff/Admin dashboard figures match authoritative database queries and current-user metrics use the session actor.
- **AC-08:** Clean and populated migrations preserve Lab 1-3 data; seed reruns do not duplicate fixtures.
- **AC-09:** New UI covers all relevant states, keyboard operation, visible focus, semantic labels, non-color cues, and required viewports.
- **AC-10:** Labs 1-3 automated and manual regressions pass on the integrated release without unexplained skips.
- **AC-11:** Key dashboard/list endpoints meet the documented performance-smoke threshold and query assumptions.
- **AC-12:** Issue, PR, reviewer, AI-use, test, screenshot, and final-PDF evidence is truthful, complete, and linkable.

## 7. Data and migration summary

The normative [data and migration contract](./data-migration.md) fixes every Prisma field/type/nullability, relation and `onDelete: Restrict` rule; ordered indexes; database checks; work-cycle and resolved-time changes; idempotency-key fingerprint storage; populated-database backup, deploy, verification and recovery steps; and repeatable seed fixtures. Legacy Tickets begin at work cycle 1 with zero Actions and no invented `resolvedAt` value.

## 8. API and UI summary

The API uses protected Ticket-nested Action resources plus role dashboards; see [api-spec.md](./api-spec.md). Ticket Detail gains a role-aware Actions section and the application shell gains one dashboard entry appropriate to the current role; see [ui-spec.md](./ui-spec.md).

## 9. Quality and test strategy

Test-driven changes cover domain rules, protected APIs, migration/seed behavior, React states, responsive/accessibility rules, and complete browser flows. [tests.md](./tests.md) maps every acceptance criterion to planned evidence. Performance smoke is diagnostic and bounded; it is not presented as production load certification.

## 10. Product Definition of Done

An issue is Done only when its acceptance criteria, tests, docs, review findings, and Project status are current. Lab 4 is Done only after reviewed feature work is integrated, the exact final `main` commit passes required checks, screenshots are readable and reproducible, no known high-severity defect remains, and exactly one nine-part PDF is prepared.

## 11. Risks, decisions, and approval

The primary risks are ambiguous visibility, conflating performer with assignee, resolution bypass, stale dashboard definitions, migration damage, and fabricated evidence. Approved resolutions are tracked in [decisions.md](./decisions.md), and the completed review is recorded in [reviewer.md](./reviewer.md). Later contract changes require an explicit decision update and review.
