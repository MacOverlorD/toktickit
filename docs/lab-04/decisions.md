# Lab 4 Decision Log

Status: proposed; peer review pending.

| ID | Decision | Rationale | State |
|---|---|---|---|
| D-01 | Use Action states PLANNED, IN_PROGRESS, COMPLETED, CANCELLED. | Supports assign/edit/status/complete/cancel rubric behavior without overloading Ticket status. | Proposed |
| D-02 | Separate immutable backend-derived `performedBy` from optional mutable `assignedTo`. | The person recording work and the person responsible for next work are different domain concepts. | Proposed |
| D-03 | Requesters receive a shared-safe projection of all Actions on owned Tickets; operational metadata is omitted. | Reconciles the handout's Requester visibility statements while preserving privacy. | Proposed |
| D-04 | Terminal Actions cannot be edited. Corrections require a new Action that references the prior record in its description. | Preserves auditability and avoids silent history rewriting. | Proposed |
| D-05 | Formal resolution requires at least one COMPLETED Action with a trimmed nonblank result. | Makes the resolution prerequisite objectively testable and enforced at the backend. | Proposed |
| D-06 | Dashboard “recent” uses ten records and one server-captured `now`; storage is UTC and display is Asia/Bangkok. | Prevents inconsistent counts at time boundaries and makes tests deterministic. | Proposed |
| D-07 | Administrator uses the operational dashboard and may also see concise account counts. | Avoids a redundant dashboard while matching the Administrator's operational visibility. | Proposed |
| D-08 | Action mutations use integer optimistic versions; create uses an idempotency key scoped to actor and Ticket. | Prevents lost updates and repeated-submit duplicates. | Proposed |
| D-09 | Migration is additive with no Action backfill; legacy Tickets validly begin with zero Actions. | Inventing historical work would be misleading and unnecessary. | Proposed |

Peer review must either approve each decision or record a replacement and affected FR/BR/AC/tests before implementation begins.
