# TokTickIT

TokTickIT is a full-stack IT service desk project for CPE334. The repository contains a React client and an Express API backed by PostgreSQL through Prisma. Labs 1-3 establish the secure, role-based Ticket lifecycle; Lab 4 adds auditable Actions Taken, final workflow rules, and role-specific dashboards.

## Prerequisites

- Node.js 22.12 or later
- npm 10 or later
- PostgreSQL

## Project structure

```text
toktickit/
|-- client/             React, TypeScript, Vite, React Router, Bootstrap
|-- server/             Express, TypeScript, Prisma
|   |-- prisma/
|   |-- src/
|   `-- tests/
|       |-- lab-01/
|       |-- lab-02/
|       |-- lab-03/
|       `-- lab-04/
|-- e2e/lab-03/        Labs 1-3 authenticated browser regression tests
|-- e2e/lab-04/        Lab 4 Actions, dashboards, a11y, visual, and regression tests
|-- artifacts/lab-03/  Reviewed Lab 3 screenshots
|-- artifacts/lab-04/  Reviewed Lab 4 screenshots
|-- output/pdf/        The current single submission PDF
`-- docs/
    |-- lab-01/
    |-- lab-02/
    |-- lab-03/         Lab 3 engineering contract and evidence
    `-- lab-04/         Lab 4 engineering contract and evidence
```

## Setup

1. Create local environment files:

   ```powershell
   Copy-Item client/.env.example client/.env
   Copy-Item server/.env.example server/.env
   ```

2. Update `DATABASE_URL` in `server/.env` for your PostgreSQL installation.

   `UPLOAD_DIR` controls private attachment storage and defaults to `uploads`
   relative to the server process. Keep this directory outside any static web
   root; it is ignored by Git.

   A local PostgreSQL container can be started with:

   ```powershell
   docker run -d --name toktickit-postgres `
     -e POSTGRES_USER=postgres `
     -e POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD `
     -e POSTGRES_DB=toktickit `
     -p 127.0.0.1:5432:5432 postgres:16-alpine
   ```

   Use the same password in `server/.env`. Binding to `127.0.0.1` keeps the development database local to this computer.
   If the container already exists after a restart, use `docker start toktickit-postgres`.

3. Install dependencies:

   ```powershell
   npm install
   npm install --prefix client
   npm install --prefix server
   npx playwright install chromium
   ```

4. Apply all database migrations and seed the repeatable Lab 3/Lab 4 reference data:

   ```powershell
   npm run prisma:generate --prefix server
   npm run prisma:deploy --prefix server
   npm run prisma:seed --prefix server
   ```

   The repeatable seed maintains the reference Categories and Related Systems,
   Requester/IT Staff/Administrator accounts, realistic Tickets across all
   workflow states, and zero/one/many Action fixtures without resetting
   existing user-managed values. For a
   populated Lab 2 database, backup, migration, verification, and guarded local
   password setup are documented in
   [Lab 3 Data Migration and Local Accounts](docs/lab-03/data-migration.md).

## Development

Run the API and client in separate terminals:

```powershell
npm run dev --prefix server
npm run dev --prefix client
```

The client runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## API

### Health check

`GET /api/health`

```json
{
  "status": "ok",
  "service": "TokTickIT API"
}
```

### Request categories

`GET /api/categories`

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

### Authentication

`POST /api/auth/login` accepts an email and password and establishes an opaque
HttpOnly browser-session cookie. `GET /api/auth/me` restores the current user
and in-memory CSRF token. `POST /api/auth/change-password` rotates all sessions,
and `POST /api/auth/logout` invalidates the current session.

Provision local initial passwords after migration with the guarded command
documented in [Lab 3 Data Migration and Local Accounts](docs/lab-03/data-migration.md).
Users with an initial password must replace it before using normal application
routes. Protected mutations require the exact configured Origin and the
`X-CSRF-Token` returned by login or current-user restoration.

### Related Systems

`GET /api/related-systems` returns active Related Systems ordered by
`displayOrder` and then ID. `GET /api/categories` follows the same active-only
ordering contract.

### Create Ticket

`POST /api/tickets` requires an authenticated Requester session, the CSRF
headers described above, and one UUID `Idempotency-Key` header. The JSON body accepts only `categoryId`,
`relatedSystemId`, `summary`, `requestedPriority`, and `description`.
Requester ownership, Ticket Number, creation date, and initial `NEW` status are
assigned by the server.

Repeating the same normalized intent with the same authenticated requester and key returns
the original Ticket without creating a duplicate. Attachment selection is
validated by the client in Issue #15; file persistence belongs to Issue #18.

### My Tickets

`GET /api/tickets` requires the requester header and returns only tickets owned
by that active requester. It supports case-insensitive `search` across Ticket
Number, Summary, and Description; exact `categoryId`, `relatedSystemId`,
`status`, and `priority` filters; allowlisted `sortBy`/`sortOrder` values; and
1-based `page` pagination with `pageSize` 10, 20, or 50. Invalid, unknown,
repeated, or empty-present query values return safe JSON `400 INVALID_QUERY`.

The My Tickets screen presents a table at desktop width and flat ticket items at
tablet/mobile widths. It provides separate empty and no-results states, Retry,
Clear Filters, requester switching, and links to create or open a ticket.

### Ticket Detail

`GET /api/tickets/:ticketNumber` requires the requester header and returns only
an owned ticket. Missing and cross-owner tickets use the same safe
`404 RESOURCE_NOT_FOUND` response. The allowlisted response contains the
read-only requester-facing fields plus active and removed attachment metadata;
stored filenames, paths, internal notes, and staff-only data are excluded.

The Ticket Detail screen groups Request, Classification, Requester, and
Attachments information. It preserves description line breaks, distinguishes
active and removed attachments, provides explicit loading/not-found/failure
states with Retry, and clears prior detail when the requester changes.

### Attachments

Owned Ticket attachment endpoints support listing, single-file multipart
upload, protected inline/download content, and soft removal:

```text
GET    /api/tickets/:ticketNumber/attachments
POST   /api/tickets/:ticketNumber/attachments
GET    /api/tickets/:ticketNumber/attachments/:attachmentId/content
DELETE /api/tickets/:ticketNumber/attachments/:attachmentId
```

Uploads accept the `file` field and allow JPEG, PNG, WEBP, or PDF files up to
5 MiB, with at most five active attachments per Ticket. The server verifies
the file signature, MIME type, and extension; uses randomized private stored
names; and compensates partial storage/database failures. Removal requires a
5-250 character reason and retains metadata while blocking later content
access. All endpoints require the active requester context and enforce Ticket
ownership.

### Lab 4 Actions, workflow, and dashboards

Authenticated IT Staff and Administrators manage formal work history through
`/api/staff/tickets/:ticketNumber/actions` and its edit, assignment, start,
complete, and cancel operations. The server derives creator and performer from
the session, enforces optimistic concurrency and idempotent creation, and keeps
Requester projections read-only and free of operational-only fields.

Final Ticket transitions are validated by the server. Resolution requires a
completed Action with a nonblank result in the current work cycle; reopening
starts a new work cycle, so an older Action cannot satisfy a later resolution.

`GET /api/dashboard/requester` returns owner-scoped Requester metrics, while
`GET /api/dashboard/operations` returns Staff/Administrator queue, Action, and
account metrics. Dashboard identity always comes from the authenticated
session, and every drill-down uses the equivalent Ticket/Action filter.

## Verification

```powershell
npm run prisma:generate --prefix server
npm run test:server:isolated
npm run test:client
npm run build
npm run test:e2e
npm run test:e2e:lab4
npm run prisma:seed --prefix server
```

The root `npm test` command runs client tests, the isolated server suite,
production builds, and both Labs 1-3 and Lab 4 Chromium E2E configurations.
`npm run test:server:isolated` creates a uniquely named PostgreSQL schema,
deploys all migrations, seeds it, runs the server tests sequentially, and drops
only that generated schema in cleanup. `DATABASE_URL` in `server/.env` must
allow creating schemas. To run only the performance smoke, use
`npm run test:performance:lab4`. It verifies the seed baseline of 12 Tickets
and 4 Actions before adding 1,000 Tickets and 5,000 Actions; global endpoints
therefore measure exactly 1,012 Tickets and 5,004 Actions. Ordinary direct
server runs containing this smoke fail with instructions to use isolation.
The measured counts and p95 values are written to the ignored
`artifacts/lab-04/performance-results/latest.json` for inspection. This path is
separate from Playwright's cleared output directory, so the aggregate run
preserves the performance result.

Playwright always starts fresh isolated services at
`http://localhost:5174` (client) and `http://localhost:3100` (API), using
`client/.env.e2e` so normal development ports can remain independent. If either
E2E port is occupied, the run fails instead of reusing a potentially stale app.

E2E tests use `DATABASE_URL` from `server/.env`, create records whose summaries
start with `[E2E]`, and delete only those records plus their test attachments
before and after the suite. They do not reset or truncate the development
database, and they only verify that the required seed records already exist.
Cleanup ignores an already-missing attachment file but surfaces every other
filesystem failure.

Normal runs write temporary visual captures to the ignored
`artifacts/lab-03/test-results/visual-captures/` directory. Promote a reviewed
visual run to the tracked evidence directory explicitly:

```powershell
$env:PROMOTE_E2E_EVIDENCE='1'
npx playwright test e2e/lab-03/visual-evidence.spec.ts
Remove-Item Env:PROMOTE_E2E_EVIDENCE
```

Approved screenshots live in `artifacts/lab-03/screenshots/`; the local HTML
report is written to `artifacts/lab-03/playwright-report/index.html`.

Lab 4 normal runs keep reports and visual captures ignored. Promote a reviewed
four-viewport evidence run explicitly:

```powershell
$env:PROMOTE_LAB4_EVIDENCE='1'
npm run test:e2e:lab4 -- --grep "captures"
Remove-Item Env:PROMOTE_LAB4_EVIDENCE
```

The 1440, 768, 390, and 320 px screenshots are stored under
`artifacts/lab-04/screenshots/`. See
[Lab 4 integrated hardening evidence](docs/lab-04/issue-61-evidence.md) for the
executed commands, performance samples, accessibility audit, and evidence
inventory.

### Lab 4 release and submission

`npm run audit:docs:lab4` checks the concrete test paths, numbered contract,
student reflection/prompt log, real peer-review snapshot, completed dependency
issues, and viewport PNG inventory. It is not a final-release certificate.

After the reviewed staging-to-main release is merged, install from lockfiles
in a clean worktree at the fetched `origin/main` SHA and run
`npm run verify:release:lab4`. The runner rejects a dirty or non-main source,
captures migration/status, repeated seed and the complete aggregate test
output, and verifies that main did not advance during the run. Results and
their hashes remain ignored so the source commit stays unchanged. Use
`-- --candidate` only for a clearly labelled pre-release rehearsal. See the
[release checklist](docs/lab-04/release-checklist.md) for genuine peer review,
exact-main verification, the single nine-part PDF, and final Project gates.
