# Lab 4 API Contract

Status: approved in PR #63; DTO names, fields, statuses, validation and errors below are normative for implementation.

## 1. Common rules

- Base path is `/api`; these endpoints accept/return JSON, use the Lab 3 session/Origin/CSRF policy, 64 KiB JSON limit, `Cache-Control: no-store`, and ISO-8601 UTC timestamps.
- Success envelopes are exactly `{item: ActionDto}`, `{items: ActionDto[]}`, or the documented dashboard object. Unknown body fields, query fields, coercions, nulls not explicitly allowed, and repeated query keys are rejected.
- Errors preserve `{error:{code,message,fieldErrors?}}`. Relevant codes are 400 `VALIDATION_ERROR`/`INVALID_QUERY`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`/`CSRF_INVALID`, 404 `RESOURCE_NOT_FOUND`, 409 `ACTION_NOT_EDITABLE`/`INELIGIBLE_ASSIGNEE`/`INVALID_ACTION_TRANSITION`/`INVALID_TRANSITION`/`STALE_RESOURCE`/`IDEMPOTENCY_KEY_REUSED`/`OWNER_REQUIRED`/`RESOLUTION_ACTION_REQUIRED`, 415 `UNSUPPORTED_MEDIA_TYPE`, and safe 500 `INTERNAL_ERROR`.
- Authentication/role is checked before lookup. Requester ownership scopes reads before lookup. Thus missing, wrong nesting, and cross-owner reads share 404; Requester mutations return 403 without confirming resource existence.
- No response exposes password/session data, idempotency key/fingerprint, stack trace, SQL, database details, or Internal Notes to Requesters.

## 2. Action Taken representation

Operational `ActionDto` fields are `id`, `ticketNumber`, `ticketWorkCycle`, `actionAt`, `description`, `result`, `status`, `createdBy:{id,name}`, `performedBy:{id,name}|null`, `assignedTo:{id,name,role}|null`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `version`, `createdAt`, `updatedAt`, `completedAt`, and `cancelledAt`.

Requester `ActionDto` fields are `id`, `actionAt`, `description`, `result`, `status`, `createdBy:{name}`, `performedBy:{name}|null`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `createdAt`, `updatedAt`, and `completedAt`. Ticket cycle, assignment, version, cancellation time, IDs inside user summaries, and idempotency/control data are omitted.

Create body is exactly `{actionAt?:string|null,description:string,result?:string|null,assignedToUserId?:number|null,followUpRequired:boolean,followUpNote?:string|null,attachmentNotes?:string|null}` and requires a UUID `Idempotency-Key`. It creates PLANNED; creator/Ticket/cycle/status/performer/version/timestamps are server-owned.

Edit body is exactly `{actionAt?:string|null,description?:string,result?:string|null,followUpRequired?:boolean,followUpNote?:string|null,attachmentNotes?:string|null,expectedVersion:number}` with at least one editable field. Assignment body is `{assignedToUserId:number|null,expectedVersion:number}`. Start/cancel body is `{expectedVersion:number}`. Complete body is `{expectedVersion:number,result:string,actionAt?:string|null}`; null/omitted actionAt uses server completion time.

Text is trimmed and counted as Unicode code points: description 1-2000; result, when present, 1-4000 and required by complete; follow-up note 1-1000 and required exactly when follow-up is true; attachment notes 1-1000 when present. If follow-up is false, a non-null/nonblank note is rejected and omission/null stores null. Optional blank strings are rejected rather than coerced to null. `actionAt` is null or a valid instant no later than server `now + 5 minutes`; complete guarantees a non-null stored action time. IDs/versions are positive safe integers. Assignee must be active IT Staff/Admin.

## 3. Action endpoints

Routes use the existing normalized `:ticketNumber` (`TKT-YYYYMMDD-XXXXXXXX`) and positive integer `:actionId`. List order is `createdAt DESC, id DESC`; no query parameters or pagination are introduced for the bounded lab history.

| Method/path | Exact request | Success | Endpoint-specific failures |
|---|---|---|---|
| GET `/tickets/:ticketNumber/actions` | No body/query | 200 `{items:ActionDto[]}` role projection | 404 missing/cross-owner Ticket |
| POST `/staff/tickets/:ticketNumber/actions` | Create body + UUID header | 201 `{item}` new; 200 `{item}` exact replay | 409 key reused; 409 Ticket not active; 409 ineligible assignee |
| GET `/tickets/:ticketNumber/actions/:actionId` | No body/query | 200 `{item}` role projection | 404 missing/cross-owner/wrong nesting |
| PATCH `/staff/tickets/:ticketNumber/actions/:actionId` | Edit body | 200 `{item}` and version +1 | 409 stale/not editable/Ticket not active |
| PATCH `/staff/tickets/:ticketNumber/actions/:actionId/assignment` | Assignment body | 200 `{item}`; current-value no-op preserves version/time | 409 stale/not editable/ineligible assignee |
| POST `/staff/tickets/:ticketNumber/actions/:actionId/start` | `{expectedVersion}` | 200 `{item}` IN_PROGRESS, version +1 | 409 stale/invalid transition/Ticket not active |
| POST `/staff/tickets/:ticketNumber/actions/:actionId/complete` | Complete body | 200 `{item}` COMPLETED, performer=actor, server completedAt, version +1 | 409 stale/invalid transition/Ticket not active |
| POST `/staff/tickets/:ticketNumber/actions/:actionId/cancel` | `{expectedVersion}` | 200 `{item}` CANCELLED, server cancelledAt, version +1 | 409 stale/invalid transition/Ticket not active |

All mutations run in one serializable transaction: revalidate actor, lock/reload Ticket and Action, verify nesting/current work cycle/Ticket state/version/transition/assignee, and then write. Validation order after authentication/resource scope is body shape, expected version, state/transition, then target eligibility. Concurrent terminal commands permit exactly one success. Create canonicalization/fingerprinting and replay behavior are normative in [data-migration.md](./data-migration.md).

## 4. Ticket workflow endpoint

The existing `PATCH /api/staff/tickets/:ticketNumber/status` with `{status,expectedVersion,confirmed?}` remains the single formal workflow entry point. The complete edge/role/owner/confirmation matrix is in specification section 5.1. When target status is RESOLVED, the same transaction requires a qualifying current-cycle Action; failure is 409 `RESOLUTION_ACTION_REQUIRED` with no write. REOPENED increments `workCycle` and clears `resolvedAt`/resolution indication. RESOLVED sets `resolvedAt` to server time; CLOSED preserves it.

Requester resolution indication remains a separate advisory operation and cannot set Resolved or Closed.

## 5. Dashboard endpoints

### GET `/api/dashboard/requester`

Requester only; no body/query. Exact response top level is `{asOf,counts,drillDown,recentTickets,attentionTickets}`. `drillDown` is `{open,waitingForRequester,recentlyResolved}` containing the server-generated paths defined below. Example with empty lists:

```json
{
  "asOf": "2026-09-24T00:00:00.000Z",
  "counts": { "open": 0, "waitingForRequester": 0, "recentlyResolved": 0 },
  "drillDown": {
    "open": "/tickets?scope=open",
    "waitingForRequester": "/tickets?status=WAITING_FOR_REQUESTER",
    "recentlyResolved": "/tickets?scope=recently-resolved&asOf=2026-09-24T00%3A00%3A00.000Z"
  },
  "recentTickets": [],
  "attentionTickets": []
}
```

Identity is session-derived. Ticket summary is `{ticketNumber,summary,status,requestedPriority,updatedAt}`. Every formula includes `requesterId = actor.id` and uses one returned `asOf` instant.

| Value | Authoritative predicate/order | Empty | Drill-down |
|---|---|---|---|
| `open` | status in NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED | 0 | `/tickets?scope=open` |
| `waitingForRequester` | status = WAITING_FOR_REQUESTER | 0 | `/tickets?status=WAITING_FOR_REQUESTER` |
| `recentlyResolved` | status in RESOLVED,CLOSED and `resolvedAt >= asOf-7d AND resolvedAt <= asOf` | 0 | `/tickets?scope=recently-resolved&asOf=<returned-asOf>` |
| `recentTickets` | `updatedAt <= asOf`, order updatedAt DESC,id DESC, limit 10 | `[]` | Each row -> owned Ticket Detail |
| `attentionTickets` | WAITING_FOR_REQUESTER and `updatedAt <= asOf`, same order, limit 10 | `[]` | Each row -> owned Ticket Detail |

My Tickets adds allowlisted `scope=open|recently-resolved`; `scope` cannot combine with `status`. Recently-resolved requires the dashboard's ISO `asOf` and applies the identical inclusive seven-day window.

### GET `/api/dashboard/operations`

IT Staff and Administrator only; no body/query and current-user identity is session-derived. Returns 200 `{asOf,counts,byStatus,byPriority,myActions,recentTickets,urgentTickets,administration?}`. `counts` is `{unassigned,ownedByMe,myAssignedActions,myPerformedLast7Days}`. `byStatus` has all eight Ticket enum keys; `byPriority` has LOW/MEDIUM/HIGH/URGENT. `myActions` items are `{id,ticketNumber,description,status,assignedTo,updatedAt}`; Ticket-list items are `{ticketNumber,summary,status,itPriority,owner,updatedAt}`. Administrator receives `administration:{activeRequesters,activeStaff,activeAdministrators,inactiveAccounts}`; Staff omits it.

Operational formulas use active Ticket states NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED unless stated otherwise:

| Value | Authoritative predicate/order | Empty/drill-down |
|---|---|---|
| `unassigned` | active status and `ownerId IS NULL` | 0; queue `ownerId=unassigned` |
| `ownedByMe` | active status and `ownerId=actor.id` | 0; queue `ownerId=me`, resolved by server |
| `byStatus` | all Tickets grouped by exact status | all keys 0; queue exact status |
| `byPriority` | active Tickets grouped by `itPriority` | all keys 0; queue exact priority |
| `myAssignedActions` | current-cycle PLANNED/IN_PROGRESS Actions with `assignedToId=actor.id` and active parent Ticket | 0; scroll to `myActions` |
| `myPerformedLast7Days` | COMPLETED with `performedById=actor.id` and `completedAt >= asOf-7d AND <= asOf` | 0; rows link to Action anchors |
| `myActions` | same assigned predicate, Action updatedAt DESC,id DESC, limit 10 | `[]`; each -> `/staff/tickets/:number#action-:id` |
| `recentTickets` | all Tickets with `updatedAt <= asOf`, order updatedAt DESC,id DESC, limit 10 | `[]`; each -> Staff Ticket Detail |
| `urgentTickets` | active status and `itPriority=URGENT`, same order, limit 10 | `[]`; queue `itPriority=URGENT` |

Administration counts group all Users by active state/role in the same database snapshot; absent groups return zero.

## 6. Dashboard definitions

- The service captures one UTC `asOf` immediately before a repeatable-read transaction; all aggregates/lists come from that snapshot and exclude records after `asOf`.
- Seven days means exactly 604800000 milliseconds. Both `asOf - 7 days` and `asOf` are included; one millisecond before/after is excluded.
- Open/active excludes RESOLVED, CLOSED, and CANCELLED. Zero-result responses are HTTP 200 with explicit zero keys and empty arrays.
- Responsibility figures use `assignedToId`; performed-work figures use `performedById` plus COMPLETED/completedAt. UI labels may not collapse these into one ambiguous count.
- List ties always use numeric ID descending. Drill-down values are server-generated from allowlisted routes/filters and never contain a user-supplied identity.

## 7. Validation and errors

Section 2 bounds/null behavior and section 1 stable errors are normative for every Action route. The server rejects unpaired UTF-16 surrogates and counts Unicode code points consistently with existing Lab 3 validation. Tests assert status/code/field errors, no write on failure, and absence of sensitive data.

## 8. Query and performance policy

Dashboard endpoints do not accept arbitrary user IDs. Filters/sorts use allowlists. Queries use bounded selects and the indexes in `data-migration.md`; no row-per-item follow-up query is permitted. Performance smoke uses PostgreSQL with 1,000 Tickets/5,000 Actions, five warm-ups and 30 measured sequential requests per endpoint on the documented local environment. Each endpoint must have p95 <= 500 ms with no error; this is a local regression threshold, not production load certification.
