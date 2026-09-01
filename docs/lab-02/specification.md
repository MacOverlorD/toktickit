# Lab 2 Sprint Engineering Specification

Status: Approved for implementation by the student on 2026-09-01  
Issue: [#11 - Define the Sprint 2 engineering contract](https://github.com/MacOverlorD/toktickit/issues/11)  
Implementation baseline: `lab2-staging` at `eeae843`

This document is the product contract for Lab 2. The implementation documents
`api-spec.md`, `ui-spec.md`, and `tests.md` are normative extensions of this
specification. When documents conflict, the stricter safety or ownership rule
applies until the contract is deliberately updated and reviewed.

## 1. Sprint Goal

Deliver a professional, responsive Requester-facing ticketing MVP. A seeded
Development Requester can create an IT support ticket, locate and inspect only
their own tickets, and safely add, download, preview, and soft-remove permitted
attachments. The sprint also establishes a reusable Zen Green UI foundation.

The Development Requester context simulates multiple users for testing. It is
not authentication and provides no security guarantee. Real authentication is
deferred to Lab 3.

## 2. Stakeholder Request Interpretation

The sprint converts the stakeholder request into these engineering decisions:

- PostgreSQL is the source of truth for requesters, reference data, tickets,
  attachment metadata, ownership, and soft-removal state.
- The backend derives ticket ownership from a validated Development Requester
  context. A request body cannot choose or replace the owner.
- A requester can read or mutate only tickets and attachments they own. A
  cross-owner lookup behaves as not found to avoid exposing another ticket.
- Ticket creation and attachment upload are separate operations. A successfully
  created ticket remains valid if a later upload fails, and the UI allows retry.
- Search, filters, sorting, and pagination run on the server and are limited to
  the current requester's data.
- Success, failure, loading, empty, no-results, validation, and boundary states
  are part of the product rather than optional polish.
- The API uses predictable JSON success bodies and one safe JSON error shape.

## 3. Scope

### Included

- Active Development Requester retrieval, selection, session-scoped storage,
  current-requester display, and requester switching.
- Active Category and Related System reference data.
- Create Ticket with server-generated identity, date, status, validation,
  ownership, and duplicate-submission protection.
- Requester-owned My Tickets with search, filters, sorting, and pagination.
- Read-only Requester Ticket Detail.
- Attachment upload for new or existing tickets, metadata retrieval, protected
  preview/download, confirmation, reason capture, and soft removal.
- Zen Green application shell and reusable responsive UI conventions.
- Unit, API/integration, UI component, UI style, responsive, visual, and E2E
  tests with acceptance-criterion traceability.
- Idempotent Lab 2 seed data and documented setup/test commands.

### Excluded

- Login, logout, passwords, hashing, sessions, tokens, authenticated identities,
  authorization roles, and every other real authentication mechanism.
- IT Staff dashboard/queue, claiming, assignment, reassignment, and IT Priority.
- Public Comments, Internal Notes, Actions Taken, and collaboration workflows.
- Status changes after the initial `NEW` state, including resolve, close, reopen,
  cancel, or resolution confirmation.
- Administrator management of users, roles, requesters, or reference data.
- Malware scanning, cloud object storage, email notifications, and audit reports.

## 4. Functional Requirements

- **FR-01 Requester discovery:** The system shall retrieve active Development
  Requesters from PostgreSQL and exclude inactive records.
- **FR-02 Requester context:** The user shall select a Development Requester
  before entering ticket screens. The application shall restore a valid choice
  for the current browser tab and provide Change Requester.
- **FR-03 Reference data:** The system shall retrieve active Categories and
  Related Systems from PostgreSQL in stable display order.
- **FR-04 Create Ticket form:** The form shall display Ticket Number, Ticket
  Date, Requester, Category, Related System, Ticket Summary, Requested Priority,
  Description, and Attachments, with generated values visibly read-only.
- **FR-05 Ticket creation:** The backend shall validate and create a requester-
  owned ticket with a unique official number, creation date, and `NEW` status.
- **FR-06 Duplicate prevention:** The client and server shall prevent an
  accidental repeated submission from creating a second ticket.
- **FR-07 My Tickets:** The current requester shall see only their own tickets.
- **FR-08 Ticket list controls:** My Tickets shall support documented search,
  Category, Related System, status, and priority filters; allowlisted sorting;
  and 1-based pagination.
- **FR-09 Ticket Detail:** The requester shall open a read-only detail view for
  an owned ticket and receive a safe not-found state otherwise.
- **FR-10 Attachment upload:** The requester shall add a permitted attachment to
  an owned existing ticket while respecting type, size, and active-count limits.
- **FR-11 Attachment access:** The requester shall inspect metadata and preview
  or download an active attachment belonging to an owned ticket.
- **FR-12 Attachment removal:** The requester shall confirm removal, provide a
  reason, and soft-remove an active owned attachment.
- **FR-13 State handling:** Required screens shall expose accessible loading,
  validation, empty/no-results, submitting, success, not-found, and safe failure
  states without discarding recoverable user input.
- **FR-14 Responsive UI:** All workflows shall remain usable on desktop, tablet,
  and mobile without unintended horizontal page scrolling.
- **FR-15 Safe API behavior:** Validation and expected failures shall use the
  documented status codes and JSON error body; unexpected details shall not be
  leaked to clients.

## 5. Business Rules

- **BR-01:** The backend generates every official Ticket Number. It is unique
  and has format `TKT-YYYYMMDD-XXXXXXXX`, where the suffix is eight uppercase
  hexadecimal characters generated with cryptographically strong randomness.
  A uniqueness collision is retried up to three times before a safe `500`.
- **BR-02:** A new Ticket starts with Current Status `NEW`. Lab 2 cannot change it.
- **BR-03:** Lab 2 uses a Development Requester selector instead of login. The
  selected identity is a testing mechanism, not authentication.
- **BR-04:** Only active Requesters appear in the selector. A missing, inactive,
  malformed, or stale requester context cannot access ticket operations.
- **BR-05:** The browser stores only the selected numeric requester ID in
  `sessionStorage` under `toktickit.devRequesterId`; closing the tab ends the
  browser context. The current requester is revalidated against the API.
- **BR-06:** Ticket and attachment APIs receive the testing context in the
  `X-Development-Requester-Id` header. The backend never trusts `requesterId`
  from a request body or query string for ownership.
- **BR-07:** Switching requester clears requester-owned query caches, draft
  ownership state, open detail state, and the prior ticket list before loading
  the new context. Unsaved form input requires confirmation before switching.
- **BR-08:** Cross-requester Ticket and Attachment reads or mutations return the
  same `404 RESOURCE_NOT_FOUND` behavior as a missing resource.
- **BR-09:** Category and Related System selections must exist and be active at
  submission time. Inactive references remain valid on historical ticket views.
- **BR-10:** Ticket Summary and Description are trimmed on client and server.
  Summary is required and 5-120 characters; Description is required and
  10-5,000 characters after trimming.
- **BR-11:** Requested Priority is required and one of `LOW`, `MEDIUM`, `HIGH`,
  or `URGENT`. This requester-provided value is not the excluded IT Priority.
- **BR-12:** Ticket Number, Ticket Date, Requester, and Current Status are
  generated or derived values and cannot be overridden by submitted JSON.
- **BR-13:** Each create intent uses a UUID `Idempotency-Key` header. The database
  has a unique `(requesterId, submissionKey)` constraint. Repeating the same key
  and equivalent normalized payload returns the existing ticket with `200` and
  `replayed: true`; reusing it with different data returns `409`.
- **BR-14:** A client disables submission while a request is pending. Network or
  server failure preserves editable form values and the same idempotency key so
  retry cannot duplicate a ticket. A changed form creates a new key.
- **BR-15:** My Tickets searches case-insensitively across Ticket Number, Summary,
  and Description. The trimmed search value is 1-100 characters when present.
- **BR-16:** List filters are exact-match `categoryId`, `relatedSystemId`,
  `status`, and `priority`. An omitted filter means all permitted values.
- **BR-17:** Sort fields are `createdAt`, `ticketNumber`, `summary`, and
  `requestedPriority`. Default sorting is `createdAt desc`, with `id desc` as a
  deterministic secondary sort. Client-provided field names are allowlisted.
- **BR-18:** Pagination is 1-based. Default `page=1`, default `pageSize=10`, and
  permitted page sizes are 10, 20, and 50. A page beyond the result set returns
  an empty `items` array with valid metadata rather than an error.
- **BR-19:** No tickets and no matching filtered results are distinct UI states.
  The latter provides Clear Filters; neither is represented as an API failure.
- **BR-20:** Attachments are optional. Allowed MIME/extension pairs are JPEG
  (`image/jpeg`, `.jpg`/`.jpeg`), PNG (`image/png`, `.png`), WEBP
  (`image/webp`, `.webp`), and PDF (`application/pdf`, `.pdf`). Both MIME and
  normalized extension must match a server-inspected file signature. Empty,
  unrecognized, or signature-mismatched files are rejected.
- **BR-21:** Maximum attachment size is 5 MiB (`5,242,880` bytes) per file. A
  Ticket may have at most five attachments with `removedAt = null`. Concurrent
  uploads serialize the owner/Ticket count check and metadata insert; a
  serialization conflict is retried or safely rejected without exceeding five.
- **BR-22:** Upload accepts one multipart field named `file` per request. The UI
  may queue up to five files and uploads sequentially so each result is visible
  and independently retryable.
- **BR-23:** The server never uses a client filename as a filesystem path. It
  generates a UUID stored name, keeps upload storage outside static web roots,
  and stores original name, stored name, MIME, byte size, ticket, uploader,
  creation time, and soft-removal metadata in PostgreSQL.
- **BR-24:** A successful Ticket creation commits before optional uploads begin.
  If an upload fails, the Ticket and prior successful uploads remain. The UI
  shows failed files and lets the requester retry without resubmitting Ticket.
- **BR-25:** Upload writes a temporary file, validates it, moves it to final
  storage, and creates metadata. If metadata creation fails, the moved file is
  deleted. If final movement fails, no metadata is committed. Cleanup failures
  are logged server-side and never expose internal paths.
- **BR-26:** Only the owning selected requester may add, access, or remove an
  attachment. An active attachment may be served inline or as a download using
  safe `Content-Type`, `Content-Length`, and `Content-Disposition` headers.
- **BR-27:** Removal requires explicit confirmation and a trimmed reason of
  5-250 characters. It atomically sets `removedAt`, `removalReason`, and
  `removedByRequesterId`; it does not delete the file or metadata in Lab 2.
- **BR-28:** Removed attachment metadata stays visible and is labeled Removed,
  but its content endpoint returns `410 ATTACHMENT_REMOVED`. Repeated removal
  returns `409 ATTACHMENT_ALREADY_REMOVED`.
- **BR-29:** The UI shall not display raw stack traces, SQL, filesystem paths,
  internal exception text, or another requester's data.
- **BR-30:** Lab 3 may replace the development header with an authenticated
  identity. Ownership foreign keys use a Requester record that can later be
  associated with a real user without changing Ticket ownership.
- **BR-31:** Requester email is a canonical natural key. Every write trims and
  lowercases it before persistence, and PostgreSQL rejects non-canonical values.
  The unique constraint therefore treats casing variants as one identity.

### Ticket identity and idempotency example

Requester 7 submits a valid normalized payload with
`Idempotency-Key: 6f5723c2-e520-4ef3-ab0d-999a48ef2679`. The backend generates,
for example,
`TKT-20260901-A1B2C3D4`, persists one Ticket, and returns `201` with
`replayed: false`. If a timeout causes the client to retry the same requester,
key, and normalized payload, the backend returns that same Ticket Number with
`200` and `replayed: true`; it does not create another row. Reusing the key with
a changed Summary, Description, reference, or priority returns `409`. A genuine
new create intent uses a new key. If the generated Ticket Number already exists,
the backend generates another suffix and retries as defined by BR-01.

## 6. UI Specification Summary

The complete contract is in [ui-spec.md](./ui-spec.md).

- Use Zen Green primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`,
  page background `#F5F7F6`, white surfaces, and dark charcoal-green text.
- Provide Requester Selection, Create Ticket, My Tickets, and Requester Ticket
  Detail routes inside one responsive application shell.
- Keep editable and read-only controls visually distinguishable. Place field
  errors immediately below their control and never rely on color alone.
- Use desktop tables and mobile ticket cards for My Tickets. Use responsive
  single-column forms and stacked actions on small screens.
- The UI must support keyboard operation, visible focus, semantic labels, live
  status announcements, and meaningful text in addition to badges/icons.

## 7. Data Changes

### Prisma models and fields

| Model | Required fields |
|---|---|
| `Requester` | `id Int @id @default(autoincrement())`, `name String`, `email String @unique`, `isActive Boolean @default(true)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `tickets Ticket[]`, upload/removal relations |
| `Category` | Existing `id`, `name`, `createdAt`; add `isActive Boolean @default(true)`, `displayOrder Int`, `updatedAt DateTime @updatedAt`, `tickets Ticket[]` |
| `RelatedSystem` | `id Int @id @default(autoincrement())`, `name String @unique`, `isActive Boolean @default(true)`, `displayOrder Int`, timestamps, `tickets Ticket[]` |
| `Ticket` | `id Int @id @default(autoincrement())`, `ticketNumber String @unique`, `submissionKey String`, `requesterId`, `categoryId`, `relatedSystemId`, `summary String`, `requestedPriority RequestedPriority`, `description String`, `status TicketStatus @default(NEW)`, `createdAt`, `updatedAt`, relations |
| `Attachment` | `id Int @id @default(autoincrement())`, `ticketId`, `originalName`, `storedName String @unique`, `mimeType`, `sizeBytes Int`, `uploadedByRequesterId`, `createdAt`, nullable `removedAt`, `removalReason`, `removedByRequesterId`, relations |

Enums are `RequestedPriority { LOW MEDIUM HIGH URGENT }` and
`TicketStatus { NEW }`. A future migration may extend `TicketStatus`; Lab 2 has
no status mutation API.

### Relationships and constraints

- `Requester 1--* Ticket`; Ticket requester is required and uses `Restrict` on
  deletion.
- `Category 1--* Ticket` and `RelatedSystem 1--* Ticket`; references are required
  and use `Restrict` so historical tickets cannot lose meaning.
- `Ticket 1--* Attachment` with required ownership through Ticket.
- `Requester` relates to attachment uploader and optional remover.
- Unique constraints: Requester email, Category name, Related System name,
  Ticket number, Attachment stored name, and Ticket
  `@@unique([requesterId, submissionKey])`.
- Indexes: Ticket `(requesterId, createdAt, id)`, `(requesterId, categoryId)`,
  `(requesterId, relatedSystemId)`, `(requesterId, status)`,
  `(requesterId, requestedPriority)`, and Attachment `(ticketId, removedAt)`.

The composite ownership/time index is justified because every list request is
owner-scoped and defaults to newest first. Separate owner/filter indexes reduce
scans for the required filters. Case-insensitive substring search may use
PostgreSQL `contains` initially; the seeded/lab-sized dataset does not justify a
full-text index yet.

### Migration and seed decisions

- Add one named Lab 2 migration; never edit the applied Lab 1 migration.
- Existing Categories are updated idempotently with stable display order:
  Account and Access, Hardware, Software, Network.
- Seed at least six active Related Systems: Email, Campus Wi-Fi, VPN, LEB2 App,
  Grade Submission App, Printer, and Corporate Laptop.
- Seed at least four active and one inactive Requester using unique emails.
- Use `upsert` by unique natural keys so repeated seeding creates no duplicates.
- Do not seed uploaded files. Runtime storage is ignored by Git.

## 8. API Contract

The complete endpoint, payload, status, ownership, and error contract is in
[api-spec.md](./api-spec.md). Required capabilities are:

- `GET /api/development-requesters`
- `GET /api/categories`
- `GET /api/related-systems`
- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:ticketNumber`
- `GET /api/tickets/:ticketNumber/attachments`
- `POST /api/tickets/:ticketNumber/attachments`
- `GET /api/tickets/:ticketNumber/attachments/:attachmentId/content`
- `DELETE /api/tickets/:ticketNumber/attachments/:attachmentId`

All ticket/attachment endpoints require the development requester header. API
errors use `{ "error": { "code": string, "message": string,
"fieldErrors"?: Record<string, string> } }` and never return HTML.

## 9. Acceptance Criteria

- **AC-01:** Given active and inactive seeded requesters, when the selector
  loads, then only active requesters appear in stable name order.
- **AC-02:** Given no valid requester selection, when ticket routes are opened,
  then the user is redirected to selection; a valid session choice is restored
  and visibly identified as testing-only.
- **AC-03:** Given requester A is active, when switching to requester B, then A's
  list/detail state is cleared and B's data is loaded; stale/inactive choices
  return safely to selection.
- **AC-04:** Given the Create Ticket screen, when reference data loads, then all
  required fields appear, active database values populate selectors, and
  generated/derived fields are visibly read-only.
- **AC-05:** Given invalid create values, when submitted, then client and server
  enforce the same required, enum, reference, trim, and length rules and show
  field-level messages without creating a Ticket.
- **AC-06:** Given valid values and requester context, when submitted, then one
  owned Ticket is persisted with a unique official number, backend date, and
  `NEW` status, and success displays the returned number.
- **AC-07:** Given an in-flight or retried create intent, when submission repeats,
  then controls prevent double click and the idempotency contract prevents a
  second Ticket.
- **AC-08:** Given create API failure, when the response or network fails, then a
  safe error appears and editable form values remain available for retry.
- **AC-09:** Given requester A has tickets, when My Tickets loads, then only A's
  tickets appear with correct total and pagination metadata.
- **AC-10:** Given list controls, when search, filters, sorting, page, or page size
  change, then the documented owner-scoped server query is applied
  deterministically; invalid parameters return safe `400` errors.
- **AC-11:** Given no owned tickets versus no filtered matches, when the list
  renders, then distinct empty and no-results states appear with appropriate
  Create Ticket or Clear Filters actions.
- **AC-12:** Given an owned Ticket Number, when detail is opened, then all
  approved fields and attachment metadata render read-only with a route back to
  My Tickets.
- **AC-13:** Given a missing or requester-B Ticket while A is selected, when A
  opens it directly, then no protected data is returned and a safe not-found
  state appears.
- **AC-14:** Given a valid owned ticket and valid file, when uploaded, then one
  active attachment with safe stored-name metadata is persisted and displayed.
- **AC-15:** Given an unsupported, mismatched, empty, oversized, or sixth active
  file, when upload is attempted, then it is rejected without corrupt metadata
  or inaccessible orphan state.
- **AC-16:** Given Ticket creation succeeded but an optional upload failed, when
  failure is shown, then the Ticket and successful uploads remain and the failed
  file can be retried without recreating the Ticket.
- **AC-17:** Given an active owned attachment, when preview/download is requested,
  then the expected bytes and safe headers are returned; cross-owner access is
  indistinguishable from not found.
- **AC-18:** Given an active owned attachment, when removal is confirmed with a
  valid reason, then removal metadata is recorded atomically and the item is
  displayed as Removed.
- **AC-19:** Given a removed attachment, when content or repeated removal is
  requested, then content is blocked and documented `410`/`409` errors result.
- **AC-20:** Given API loading, empty, validation, submitting, success, failure,
  and not-found scenarios, when screens render, then each required state is
  accessible, stable, and does not expose internal errors.
- **AC-21:** Given desktop, tablet, and mobile viewports, when each workflow is
  used, then content remains legible and operable without clipping, overlap, or
  unintended horizontal page scrolling.
- **AC-22:** Given keyboard and assistive-technology use, when controls and status
  changes are encountered, then labels, focus, semantic state, and non-color
  indicators communicate the workflow.
- **AC-23:** Given a clean PostgreSQL database, when migration and seed run one or
  more times, then the required relationships/data exist and no duplicates are
  introduced.
- **AC-24:** Given the final integrated `main`, when documented test commands and
  the E2E flow run, then all required test levels pass without unexplained skips
  and every AC has traceable evidence.

## 10. Definition of Done

### Product completion

- All FR, BR, and AC items in the approved contract are implemented or the
  contract is explicitly revised and peer-reviewed before implementation.
- Prisma migration and repeatable seed succeed on a clean PostgreSQL database.
- Development Requester, Create Ticket, My Tickets, Ticket Detail, and complete
  Attachment workflows satisfy owner isolation and all boundary/failure rules.
- API payloads, HTTP statuses, validation, errors, and pagination match
  `api-spec.md`; no Express HTML error response leaks from `/api` routes.
- UI states, responsive layouts, accessibility, and Zen Green tokens match
  `ui-spec.md` at desktop, tablet, and mobile viewports.
- Unit, API/integration, UI component, UI style, responsive, visual, and E2E
  evidence in `tests.md` passes from documented commands on final `main`.
- Every AC maps to at least one test; no required test is skipped, disabled,
  commented out, unrelated, or accepted while flaky.
- Unexpected failures preserve data as specified and expose only safe messages.
- README setup, environment, migration, seed, run, storage, and test instructions
  are current. Secrets, runtime uploads, dependencies, and generated outputs are
  not committed.
- A final manual visual inspection finds no unreadable text, clipping, overlap,
  incorrect field state, or unintended horizontal overflow.

### Course delivery requirements

- Each Issue uses its documented feature branch from `lab2-staging`; no feature
  development occurs directly on `main` or `lab2-staging`.
- Every feature enters `lab2-staging` through a peer-reviewed, approved PR.
- Review comments, responses, changes, approvals, and PR links are recorded in
  `reviewer.md`; required Project items finish in `Done`.
- After integration testing, one release PR merges `lab2-staging` into `main`.
- `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, and
  `ai-use.md` are complete and rendered correctly.
- The submission is exactly one concise PDF with working links and headings
  `Answer Part 1` through `Answer Part 9` in order, with readable required
  screenshots and final-main evidence.

## 11. Assumptions and Decisions

| ID | Decision | Reason |
|---|---|---|
| AD-01 | Development context uses a numeric request header plus `sessionStorage`. | It enables deterministic multi-requester tests without pretending to provide authentication. |
| AD-02 | Cross-owner resources return `404`, while an invalid requester header returns `400`. | It avoids exposing ticket existence and keeps malformed context distinguishable. |
| AD-03 | Create Ticket is JSON; attachments upload after creation through multipart endpoints. | A valid Ticket survives upload failure and compensation remains simple and testable. |
| AD-04 | Upload accepts one file per request and the UI queues files sequentially. | Per-file status and retries are clearer, while the fixed active-count rule remains enforceable transactionally. |
| AD-05 | Ticket numbers use date plus random hexadecimal suffix. | The number is backend-generated, human-readable, independent of exposed database IDs, and uniqueness is enforced by PostgreSQL. |
| AD-06 | Idempotency is keyed per requester and payload. | Network retry cannot duplicate a Ticket while legitimate similar tickets remain possible with a new key. |
| AD-07 | Related System is independent of Category in Lab 2. | The stakeholder requires both selections but does not define a category-system compatibility matrix. |
| AD-08 | Requester Priority has four values including `URGENT`. | It captures user impact without implementing the explicitly excluded IT Priority workflow. |
| AD-09 | Removed files remain physically stored for Lab 2. | The fixed rule requires soft removal and blocked access; physical retention keeps metadata/content cleanup outside this sprint. |
| AD-10 | Dates are stored as UTC and rendered in the browser locale. | It avoids timezone ambiguity while presenting understandable local dates. |

Any change to an AD, validation boundary, API shape, ownership rule, or status
code requires updating all affected documents and planned tests in the same PR.
