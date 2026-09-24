# Lab 4 API Contract

Status: proposed for Issue #54; exact DTO names may change only through an approved decision update.

## 1. Common rules

- Base path: `/api`; JSON unless an existing attachment route specifies otherwise.
- Authentication uses the existing secure session. Role and identity come from the session.
- Mutations use the existing CSRF policy and validate `Content-Type`.
- IDs are opaque server identifiers. Unknown and unauthorized cross-owner resources use the existing non-disclosing missing-resource behavior.
- Validation errors use the repository's field-error envelope; conflicts use HTTP 409; forbidden operations use 403; unauthenticated requests use 401.
- No response exposes password data, session values, stack traces, internal notes to Requesters, or raw database errors.

## 2. Action Taken representation

Operational response fields: `id`, `ticketId`, `actionAt`, `description`, `result`, `status`, `performedBy`, `assignedTo`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `version`, `createdAt`, `updatedAt`, `completedAt`, `cancelledAt`.

Requester shared-safe response fields: `id`, `actionAt`, `description`, `result`, `status`, `performedBy.displayName`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `createdAt`, `updatedAt`, `completedAt`. Assignment and internal concurrency/control fields are omitted.

Create input: `actionAt`, `description`, optional `result`, optional `assignedToUserId`, `followUpRequired`, conditional `followUpNote`, optional `attachmentNotes`. `performedBy`, timestamps, status, Ticket ID, and version are server-owned. `Idempotency-Key` is required for create.

Update input: editable fields plus required `version`. Status transitions use dedicated commands rather than accepting an arbitrary status in a general edit.

## 3. Action endpoints

| Method | Route | Role | Result |
|---|---|---|---|
| GET | `/api/tickets/:ticketId/actions` | Accessible Requester/Staff/Admin | Deterministically ordered Action list with role projection |
| POST | `/api/tickets/:ticketId/actions` | Staff/Admin | Create PLANNED Action or return prior idempotent result |
| GET | `/api/tickets/:ticketId/actions/:actionId` | Accessible Requester/Staff/Admin | One role-projected Action |
| PATCH | `/api/tickets/:ticketId/actions/:actionId` | Staff/Admin | Edit non-terminal Action after version check |
| PATCH | `/api/tickets/:ticketId/actions/:actionId/assignment` | Staff/Admin | Assign/unassign eligible active operational user |
| POST | `/api/tickets/:ticketId/actions/:actionId/start` | Staff/Admin | PLANNED -> IN_PROGRESS |
| POST | `/api/tickets/:ticketId/actions/:actionId/complete` | Staff/Admin | Allowed non-terminal -> COMPLETED with required result |
| POST | `/api/tickets/:ticketId/actions/:actionId/cancel` | Staff/Admin | Allowed non-terminal -> CANCELLED |

Transition commands require `version`. They are atomic: reload the Action and Ticket, verify access/state/version/assignee rules in the transaction, perform one update, and return the refreshed representation.

## 4. Ticket workflow endpoint

The existing Ticket status mutation remains the single formal workflow entry point. When target status is Resolved, the service verifies at transaction time that the Ticket contains a COMPLETED, non-cancelled Action with a trimmed nonblank result. A failed gate returns 409 with a stable safe code such as `RESOLUTION_ACTION_REQUIRED`; no Ticket change occurs.

Requester resolution indication remains a separate advisory operation and cannot set Resolved or Closed.

## 5. Dashboard endpoints

### GET `/api/dashboard/requester`

Requester only. Identity is session-derived. Response:

```json
{
  "asOf": "2026-09-24T00:00:00.000Z",
  "counts": { "open": 0, "waitingForRequester": 0, "recentlyResolved": 0 },
  "recentTickets": [],
  "attentionTickets": []
}
```

Lists are capped at ten and contain only safe Ticket summary fields and approved drill-down query metadata.

### GET `/api/dashboard/operations`

IT Staff and Administrator only. Current-user figures are session-derived. Response includes `unassigned`, `ownedByMe`, counts by Ticket status and IT priority, current-user Action counts, and capped recent/urgent lists. Administrator-only account counts may appear in a separate `administration` object.

## 6. Dashboard definitions

- Open excludes Closed and Cancelled; whether Resolved is included is fixed in the approved contract and database-query tests.
- Waiting-for-Requester is the existing `WAITING_FOR_REQUESTER` status.
- Recently resolved is a deterministic bounded window/count based on the approved time rule and one captured `asOf` instant.
- Unassigned means active nonterminal Ticket with no owner.
- Owned-by-me means active nonterminal Ticket whose owner ID equals the authenticated user.
- Current-user Actions use `assignedToId` for responsibility and `performedById` for performed-work figures; labels must state which measure is shown.

## 7. Validation and errors

Text is trimmed, Unicode-safe, bounded by schema constants, and safely rendered. `actionAt` must be a valid instant and may not exceed the approved future-skew allowance. Follow-up note is required only when follow-up is true and is cleared/rejected consistently when false. Assignee must exist, be active, and have an operational role.

Stable error codes include validation, authentication, forbidden, not found, inactive/ineligible assignee, invalid transition, stale version, resolution Action required, duplicate/idempotency mismatch, and safe unexpected failure. Tests assert both status and absence of sensitive data.

## 8. Query and performance policy

Dashboard endpoints do not accept arbitrary user IDs. Filters and sort values use allowlists. Queries use bounded selects and indexes; no row-per-item follow-up query is permitted. Performance smoke records dataset size, environment, warm-up, samples, and a proposed local p95 target of 500 ms rather than claiming production capacity.
