# Lab 4 Decision Log

Status: approved in PR #63; later changes require a new recorded decision and review.

| ID | Decision | Rationale | State |
|---|---|---|---|
| D-01 | Use Action states PLANNED, IN_PROGRESS, COMPLETED, CANCELLED. | Supports assign/edit/status/complete/cancel rubric behavior without overloading Ticket status. | Approved |
| D-02 | Store immutable backend-derived `createdBy`; keep `performedBy` null until the authenticated completer is recorded; keep optional mutable `assignedTo` for responsibility. | Creator, responsible user, and actual performer are distinct audit facts. | Approved |
| D-03 | Requesters receive a shared-safe projection of all Actions on owned Tickets; operational metadata is omitted. | Reconciles the handout's Requester visibility statements while preserving privacy. | Approved |
| D-04 | Terminal Actions cannot be edited. Corrections require a new Action that references the prior record in its description. | Preserves auditability and avoids silent history rewriting. | Approved |
| D-05 | Formal resolution requires a qualifying COMPLETED Action from the Ticket's current work cycle; REOPENED increments the cycle. | Prevents historical work from satisfying resolution of a reopened problem. | Approved |
| D-06 | Dashboard “recent” uses ten records and one server-captured `now`; storage is UTC and display is Asia/Bangkok. | Prevents inconsistent counts at time boundaries and makes tests deterministic. | Approved |
| D-07 | Administrator uses the operational dashboard and may also see concise account counts. | Avoids a redundant dashboard while matching the Administrator's operational visibility. | Approved |
| D-08 | Action mutations use integer optimistic versions; create uses a UUID key scoped to Ticket/creator and a SHA-256 canonical-payload fingerprint. | Prevents lost updates, duplicate writes, and silent reuse of a key for different data. | Approved |
| D-09 | Migration is additive: legacy Tickets begin at cycle 1 with zero Actions and null `resolvedAt`; backup/restore and populated-data verification are mandatory. | Inventing historical work/time would be misleading; recovery must be deterministic. | Approved |
| D-10 | Staff/Admin may operate on any active Ticket regardless of owner/Action assignee; terminal Tickets expose Actions read-only. | Matches the Lab 3 operational authorization model and gives every Action endpoint a testable rule. | Approved |
| D-11 | Dashboard formulas, seven-day inclusive window, caps, ordering, zero states, and drill-down destinations are normative in `api-spec.md`. | Prevents client/server metric drift and ambiguous boundary results. | Approved |

Peer review must either approve each decision or record a replacement and affected FR/BR/AC/tests before implementation begins.
