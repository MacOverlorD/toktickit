# Lab 4 Product Specification

Status: proposed engineering contract for Issue #54. Peer approval is required before implementation issues are considered Specified.

## 1. Purpose

Lab 4 completes TokTickIT with an auditable Actions Taken record, a fully enforced Ticket workflow, role-specific dashboards, and final cross-lab hardening. The backend remains authoritative for identity, authorization, workflow, timestamps, and dashboard calculations.

## 2. Baseline and scope

The baseline is the merged Lab 3 application at commit `6e327a799531e9814101c0ef8309bf70d1e05064`. Existing authentication, Requester Tickets and Attachments, Staff Queue, Ticket Detail, Public Comments, Internal Notes, and Administrator User Management must continue to work.

In scope: Actions Taken, resolution prerequisite, Requester and operational dashboards, migration/seed changes, responsive/accessibility work, regression, review, and final evidence. Out of scope: external notification delivery, SLA automation, billing, inventory, multi-tenant support, and deletion of historical audit records.

## 3. Roles and authorization

| Capability | Requester | IT Staff | Administrator |
|---|---|---|---|
| Read owned Ticket | Yes | Yes | Yes |
| Read Actions on accessible Ticket | Proposed: shared-safe view on owned Ticket | Yes | Yes |
| Create/update/assign/transition Action | No | Yes | Yes |
| Formally resolve or close Ticket | No | Yes, when workflow permits | Yes, when workflow permits |
| Requester dashboard | Own data only | No | No |
| Operational dashboard | No | Yes | Yes |
| User administration | No | No | Yes |

All protected API decisions are based on the authenticated session. Client-supplied actor, Requester, performer, or current-user identifiers are ignored or rejected as defined by the API contract.

## 4. Functional requirements

- **FR-01 Actions list:** An accessible Ticket exposes its Actions Taken in deterministic newest-first order with an ID tie-breaker.
- **FR-02 Actions lifecycle:** Authorized operational users can create, assign, edit, start, complete, and cancel an Action under the approved state rules.
- **FR-03 Action fields:** Each Action records action date/time, description, result, performer, follow-up flag, conditional follow-up note, and attachment notes.
- **FR-04 Resolution gate:** A Ticket cannot enter the formal Resolved state until the approved qualifying Action prerequisite is satisfied.
- **FR-05 Final workflow:** The eight Lab 3 Ticket statuses and permitted role transitions remain backend-enforced, including reopen and cancel behavior.
- **FR-06 Requester dashboard:** A Requester sees only own open, waiting, recently updated, and recently resolved Ticket information with useful drill-downs.
- **FR-07 Operational dashboard:** IT Staff sees unassigned work, own work, status/priority distribution, own Actions, and recent/urgent items; Administrator behavior follows D-07.
- **FR-08 Feedback:** Every new screen or mutation has loading, empty, validation, success, forbidden, missing, conflict, and safe-failure behavior where applicable.
- **FR-09 Responsive access:** Lab 4 screens work with keyboard and at desktop, tablet, mobile, and 320px widths without page-level horizontal overflow.
- **FR-10 Evidence:** Requirements, tests, review, screenshots, AI use, final checks, and nine answer parts remain traceable to immutable repository evidence.

## 5. Business rules

- **BR-01:** An Action belongs to exactly one Ticket and cannot be moved to another Ticket.
- **BR-02:** `performedBy` is assigned by the backend from the authenticated creator and is never client-selectable.
- **BR-03:** `assignedTo` is distinct from `performedBy`; only an active IT Staff or Administrator may be assigned.
- **BR-04:** Proposed Action states are `PLANNED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`.
- **BR-05:** Proposed transitions are PLANNED -> IN_PROGRESS/COMPLETED/CANCELLED and IN_PROGRESS -> COMPLETED/CANCELLED. Terminal states do not transition.
- **BR-06:** Description is required after trimming. Result is required on completion. Follow-up note is required exactly when follow-up is true.
- **BR-07:** Server time is authoritative for created/updated/completed/cancelled timestamps; action date/time is validated but may represent the actual work time.
- **BR-08:** Completed or cancelled Actions are immutable except through an explicitly approved correction policy; the proposed policy is no edits to terminal Actions.
- **BR-09:** Every Action update uses optimistic concurrency. A stale version returns conflict and does not overwrite newer data.
- **BR-10:** Duplicate create submissions using the same actor, Ticket, and idempotency key return the original result.
- **BR-11:** Proposed Requester visibility is a shared-safe projection of every Action on an owned Ticket, excluding assignment/internal control metadata. This resolves the handout's broad “all actions” wording without exposing operational-only fields.
- **BR-12:** Formal resolution requires at least one completed, non-cancelled Action with a nonblank result on the Ticket.
- **BR-13:** The Requester's “problem appears resolved” indication remains advisory and cannot perform the formal resolution transition.
- **BR-14:** Dashboard identity and all aggregates are derived on the backend from the authenticated actor and a single query-time timestamp.
- **BR-15:** “Recent” means the latest ten accessible records ordered by `updatedAt DESC, id DESC`; the display uses Asia/Bangkok while stored instants remain UTC.
- **BR-16:** Dashboard zero states are successful empty results, never errors.
- **BR-17:** Migration is additive, transactional where supported, preserves all Lab 1-3 rows/relations, and documents recovery before execution.
- **BR-18:** Seed execution is idempotent and does not overwrite user-managed state.
- **BR-19:** Errors do not disclose credentials, session tokens, stack traces, internal notes, cross-owner existence, or database details.
- **BR-20:** Historical audit/communication records remain append-only; no feature hard-deletes them.

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

The proposed `ActionTaken` record has: ID, Ticket relation, actionAt, description, result, status, performedBy relation, optional assignedTo relation, followUpRequired, optional followUpNote, optional attachmentNotes, version, createdAt, updatedAt, completedAt, and cancelledAt. Indexes support Ticket ordering, assignee/status work lists, performer recency, and dashboard queries. Exact Prisma names and nullability are finalized in Issue #54 and implemented in #55.

## 8. API and UI summary

The API uses protected Ticket-nested Action resources plus role dashboards; see [api-spec.md](./api-spec.md). Ticket Detail gains a role-aware Actions section and the application shell gains one dashboard entry appropriate to the current role; see [ui-spec.md](./ui-spec.md).

## 9. Quality and test strategy

Test-driven changes cover domain rules, protected APIs, migration/seed behavior, React states, responsive/accessibility rules, and complete browser flows. [tests.md](./tests.md) maps every acceptance criterion to planned evidence. Performance smoke is diagnostic and bounded; it is not presented as production load certification.

## 10. Product Definition of Done

An issue is Done only when its acceptance criteria, tests, docs, review findings, and Project status are current. Lab 4 is Done only after reviewed feature work is integrated, the exact final `main` commit passes required checks, screenshots are readable and reproducible, no known high-severity defect remains, and exactly one nine-part PDF is prepared.

## 11. Risks, decisions, and approval

The primary risks are ambiguous visibility, conflating performer with assignee, resolution bypass, stale dashboard definitions, migration damage, and fabricated evidence. Proposed resolutions are tracked in [decisions.md](./decisions.md). Until real peer approval is recorded in [reviewer.md](./reviewer.md), this contract remains proposed.
