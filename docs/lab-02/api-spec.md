# Lab 2 REST API Specification

Status: Approved for implementation by the student on 2026-09-01  
Base URL: `http://localhost:3000/api`  
Related contract: [specification.md](./specification.md)

## 1. Conventions

- Request and response media type is `application/json` except multipart upload
  and attachment content.
- Timestamps are ISO 8601 UTC strings, for example `2026-09-01T08:30:00.000Z`.
- IDs are positive base-10 integers. Ticket routes use the official Ticket Number.
- Unknown JSON properties are rejected with `400 VALIDATION_ERROR`.
- API responses never contain HTML, stack traces, SQL, server paths, stored file
  paths, or internal exception messages.
- Lists use stable ordering. Empty successful lists return `[]`, not `404`.

## 2. Development Requester Context

Ticket and attachment endpoints require:

```http
X-Development-Requester-Id: 1
```

This header is a Lab 2 testing context, not authentication. The server parses one
positive integer and verifies that the Requester exists and is active.

| Case | Status and code |
|---|---|
| Header missing, repeated, malformed, zero, or negative | `400 INVALID_REQUESTER_CONTEXT` |
| Requester missing or inactive | `400 INVALID_REQUESTER_CONTEXT` |
| Owned resource missing or belongs to another requester | `404 RESOURCE_NOT_FOUND` |

The public reference endpoints do not require the header:
`/health`, `/development-requesters`, `/categories`, and `/related-systems`.

## 3. Common Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Review the highlighted fields.",
    "fieldErrors": {
      "summary": "Summary must contain 5 to 120 characters."
    }
  }
}
```

`fieldErrors` is present only for field-addressable validation. Allowed general
statuses are:

| Status | Use |
|---|---|
| `400` | Malformed JSON/header/query or failed field validation |
| `404` | Missing or non-owned Ticket/Attachment |
| `409` | Idempotency conflict, active-count conflict, or repeated removal |
| `410` | Removed attachment content is no longer available |
| `413` | File exceeds 5 MiB |
| `415` | Unsupported or mismatched attachment type |
| `500` | Safe unexpected server/storage/database failure |

Unexpected API failures return:

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again." } }
```

## 4. Shared Resource Shapes

### Requester

```json
{ "id": 1, "name": "Anan Wong", "email": "anan.wong@example.test" }
```

`isActive` is intentionally omitted because this endpoint returns active records
only.

### Reference item

```json
{ "id": 1, "name": "Hardware" }
```

### Attachment metadata

```json
{
  "id": 7,
  "originalName": "battery-report.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 184221,
  "createdAt": "2026-09-01T08:30:00.000Z",
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null
}
```

Stored filename and server path are never returned.

### Ticket summary

```json
{
  "ticketNumber": "TKT-20260901-A1B2C3D4",
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "status": "NEW",
  "createdAt": "2026-09-01T08:30:00.000Z",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "activeAttachmentCount": 1
}
```

### Ticket detail

Ticket detail extends the summary with:

```json
{
  "ticketNumber": "TKT-20260901-A1B2C3D4",
  "ticketDate": "2026-09-01T08:30:00.000Z",
  "requester": { "id": 1, "name": "Anan Wong", "email": "anan.wong@example.test" },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "Battery capacity drops from full to empty in one hour.",
  "status": "NEW",
  "createdAt": "2026-09-01T08:30:00.000Z",
  "updatedAt": "2026-09-01T08:30:00.000Z",
  "attachments": []
}
```

## 5. Reference Endpoints

### `GET /api/development-requesters`

Returns active Requesters ordered by case-insensitive `name asc`, then `id asc`.

- Success: `200` with `Requester[]`.
- No active records: `200 []`.
- Database failure: `500 INTERNAL_ERROR`.

### `GET /api/categories`

Returns active Categories ordered by `displayOrder asc`, then `id asc`.

- Success: `200` with reference items.
- No active records: `200 []`.
- Database failure: `500 INTERNAL_ERROR`.

### `GET /api/related-systems`

Returns active Related Systems ordered by `displayOrder asc`, then `id asc`.

- Success: `200` with reference items.
- No active records: `200 []`.
- Database failure: `500 INTERNAL_ERROR`.

## 6. Create Ticket

### `POST /api/tickets`

Required headers:

```http
Content-Type: application/json
X-Development-Requester-Id: 1
Idempotency-Key: 6f5723c2-e520-4ef3-ab0d-999a48ef2679
```

The key must be one valid UUID. It represents the current normalized create
intent. It is never accepted from the JSON body.

Request:

```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "Battery capacity drops from full to empty in one hour."
}
```

Validation:

| Field | Rule |
|---|---|
| `categoryId` | Required positive integer; referenced Category exists and is active |
| `relatedSystemId` | Required positive integer; referenced Related System exists and is active |
| `summary` | Required string; trim; 5-120 characters |
| `requestedPriority` | `LOW`, `MEDIUM`, `HIGH`, or `URGENT` |
| `description` | Required string; trim; 10-5,000 characters |

`requesterId`, `ticketNumber`, `ticketDate`, `createdAt`, `status`, and attachments
are rejected if supplied.

First creation returns `201`:

```json
{
  "data": {
    "ticketNumber": "TKT-20260901-A1B2C3D4",
    "ticketDate": "2026-09-01T08:30:00.000Z",
    "status": "NEW",
    "requesterId": 1
  },
  "replayed": false
}
```

Repeating an equivalent normalized payload with the same requester/key returns
the existing result with `200` and `replayed: true`. Reusing the key with a
different normalized payload returns `409 IDEMPOTENCY_KEY_REUSED`.

Other failures:

- `400 VALIDATION_ERROR` with field errors.
- `400 INVALID_REQUESTER_CONTEXT`.
- `500 INTERNAL_ERROR` after exhausted Ticket Number collision retries or a
  database failure. No partial Ticket is committed.

## 7. My Tickets

### `GET /api/tickets`

Requires requester context. Every query is owner-scoped before search/filter.

| Query | Type/default | Contract |
|---|---|---|
| `search` | optional string | Trimmed 1-100 chars; case-insensitive contains on Ticket Number, Summary, or Description |
| `categoryId` | optional positive integer | Exact Category ID within PostgreSQL `Int` range |
| `relatedSystemId` | optional positive integer | Exact Related System ID within PostgreSQL `Int` range |
| `status` | optional enum | Lab 2 accepts `NEW` |
| `priority` | optional enum | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `sortBy` | `createdAt` | `createdAt`, `ticketNumber`, `summary`, `requestedPriority` |
| `sortOrder` | `desc` | `asc` or `desc` |
| `page` | `1` | Positive 1-based integer whose calculated offset remains within PostgreSQL `Int` range |
| `pageSize` | `10` | Exactly 10, 20, or 50 |

Unknown, repeated, malformed, empty-present, or non-allowlisted query parameters
return `400 INVALID_QUERY`. Reference filter IDs need not currently be active;
they are parsed as IDs so historical tickets remain filterable.

Response `200`:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasPreviousPage": false,
    "hasNextPage": false
  },
  "query": {
    "search": null,
    "categoryId": null,
    "relatedSystemId": null,
    "status": null,
    "priority": null,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  },
  filterOptions: {
    categories: [],
    relatedSystems: []
  }
}
```

Results use the requested primary sort and `id` in the same direction as a
deterministic secondary sort. A page beyond `totalPages` succeeds with empty
`items` and reports the requested page plus accurate totals.

Each `items[]` entry contains `ticketNumber`, ISO `createdAt`, `summary`,
`requestedPriority`, `status`, Category `{ id, name }`, Related System
`{ id, name }`, and non-negative `attachmentCount`. The attachment count includes
active attachments only (`removedAt is null`). Reference names remain available
for historical tickets even if those records later become inactive.

`filterOptions` is loaded in the same owner-scoped request as the list. It
contains every active reference plus inactive references used by at least one
Ticket owned by the selected requester. Each option contains `id`, `name`, and
`isActive`. A requester never receives an inactive historical option used only
by another requester.

## 8. Ticket Detail

### `GET /api/tickets/:ticketNumber`

`ticketNumber` is trimmed, converted to uppercase, and must match
`^TKT-\d{8}-[A-F0-9]{8}$`; malformed input returns `400 INVALID_TICKET_NUMBER`.

- Owned Ticket: `200` with Ticket detail and all active/removed Attachment metadata.
- Missing or non-owned Ticket: `404 RESOURCE_NOT_FOUND` with message
  `Ticket was not found.`
- Unexpected failure: `500 INTERNAL_ERROR`.

No endpoint in Lab 2 updates Ticket fields or status.

## 9. Attachment Metadata and Upload

### `GET /api/tickets/:ticketNumber/attachments`

Returns `200 Attachment[]` for an owned Ticket, ordered by `createdAt asc`, then
`id asc`. Removed metadata is included. Missing/non-owned Ticket is `404`.

### `POST /api/tickets/:ticketNumber/attachments`

Requires requester context and `multipart/form-data` with exactly one field
named `file`. Unknown text/file fields, missing file, multiple files, and an
empty file return `400 ATTACHMENT_INVALID`.

Validation order:

1. validate requester context and owned Ticket;
2. enforce fewer than five active attachments within the metadata transaction;
3. enforce maximum 5,242,880 bytes;
4. inspect the file signature, normalize the final extension, and require a
   permitted signature/extension/MIME combination;
5. store under a generated UUID name and persist metadata using the documented
   compensation strategy.

The active-count check and metadata insert run in a serializable transaction (or
with an equivalent Ticket-scoped database lock) so concurrent uploads cannot
produce more than five active attachments. Serialization conflicts are retried
within a small fixed bound and otherwise return `409 ATTACHMENT_LIMIT_REACHED`
or a safe `500` without retaining the just-written file.

Success returns `201` with Attachment metadata. Failures:

| Case | Result |
|---|---|
| Missing/non-owned Ticket | `404 RESOURCE_NOT_FOUND` |
| Five active attachments | `409 ATTACHMENT_LIMIT_REACHED` |
| More than 5 MiB | `413 ATTACHMENT_TOO_LARGE` |
| Unsupported/mismatched MIME or extension | `415 ATTACHMENT_TYPE_UNSUPPORTED` |
| Storage/database failure | `500 ATTACHMENT_UPLOAD_FAILED` |

No failed response may leave client-accessible metadata for a missing file. A
cleanup failure is logged for maintenance but remains a safe `500` response.

## 10. Attachment Content

### `GET /api/tickets/:ticketNumber/attachments/:attachmentId/content`

Optional query `disposition` is `inline` (default) or `attachment`. Unknown or
repeated query parameters return `400 INVALID_QUERY`.

For active owned content, returns `200` bytes with:

- persisted permitted `Content-Type`;
- exact `Content-Length`;
- `Content-Disposition` using `inline` or `attachment` and an RFC 5987 encoded,
  sanitized original filename;
- `X-Content-Type-Options: nosniff`;
- `Cache-Control: private, no-store`.

Failures:

- malformed Attachment ID: `400 INVALID_ATTACHMENT_ID`;
- missing/non-owned Ticket or Attachment: `404 RESOURCE_NOT_FOUND`;
- removed attachment: `410 ATTACHMENT_REMOVED`;
- metadata exists but file is unavailable: `500 ATTACHMENT_CONTENT_UNAVAILABLE`.

## 11. Soft Removal

### `DELETE /api/tickets/:ticketNumber/attachments/:attachmentId`

Request:

```json
{ "reason": "Uploaded the wrong document" }
```

Reason is required, trimmed, and 5-250 characters. On success, one database
transaction sets `removedAt`, `removalReason`, and `removedByRequesterId` and
returns `200` with updated Attachment metadata. File content remains stored but
becomes inaccessible through the API.

- invalid reason: `400 VALIDATION_ERROR`;
- missing/non-owned Ticket or Attachment: `404 RESOURCE_NOT_FOUND`;
- already removed: `409 ATTACHMENT_ALREADY_REMOVED`;
- database failure: `500 INTERNAL_ERROR` with no partial removal metadata.

## 12. CORS, Parsing, and Error Middleware

- Development CORS allows only configured `CLIENT_URL`, methods used by this
  contract, `Content-Type`, `X-Development-Requester-Id`, and `Idempotency-Key`.
- JSON request size uses a conservative configured limit; oversized JSON is a
  safe JSON `413 PAYLOAD_TOO_LARGE`.
- Invalid JSON is `400 INVALID_JSON`.
- Multer/storage errors are translated into this JSON error contract.
- A final not-found middleware returns `404 ROUTE_NOT_FOUND` for unknown API
  routes, followed by one final JSON error middleware.

## 13. Acceptance and Test Links

| Capability | Requirements | Acceptance criteria | Planned tests |
|---|---|---|---|
| Requester context | FR-01, FR-02, BR-03-BR-08 | AC-01-AC-03 | API-01, API-02, UI-01, UI-02, E2E-01 |
| Create Ticket | FR-03-FR-06, BR-09-BR-14 | AC-04-AC-08 | UNIT-01, UNIT-02, API-03-API-06, UI-03-UI-05, E2E-02 |
| My Tickets | FR-07, FR-08, BR-15-BR-19 | AC-09-AC-11 | API-07-API-09, UI-06-UI-08, E2E-03 |
| Ticket Detail | FR-09 | AC-12, AC-13 | API-10, UI-09, E2E-04 |
| Attachments | FR-10-FR-12, BR-20-BR-28 | AC-14-AC-19 | UNIT-03, API-11-API-15, UI-10-UI-12, E2E-05 |
| Safe errors | FR-13, FR-15, BR-29 | AC-20 | API-16, UI-13 |
