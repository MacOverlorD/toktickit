# TokTickIT

TokTickIT is a full-stack IT service desk project for CPE334. The repository contains a React client and an Express API backed by PostgreSQL through Prisma. Lab 3 adds authenticated role-based workflows on top of the Lab 2 requester ticket lifecycle.

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
|       `-- lab-03/
|-- e2e/lab-03/        Authenticated browser and responsive evidence tests
|-- artifacts/lab-03/  Reviewed Lab 3 screenshots
|-- output/pdf/        The single Lab 3 submission PDF
`-- docs/
    |-- lab-01/
    |-- lab-02/
    `-- lab-03/         Engineering contract and evidence
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

4. Apply all database migrations and seed the Lab 3 reference data:

   ```powershell
   npm run prisma:generate --prefix server
   npm run prisma:deploy --prefix server
   npm run prisma:seed --prefix server
   ```

   The repeatable seed maintains the reference Categories and Related Systems,
   Requester/IT Staff/Administrator accounts, and realistic Tickets across all
   eight workflow states without resetting existing user-managed values. For a
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

## Verification

```powershell
npm run prisma:generate --prefix server
npm run test:server
npm run test:client
npm run build
npm run test:e2e
npm run prisma:seed --prefix server
```

The root `npm test` command also runs server tests, client tests, and the complete
Chromium E2E suite. Playwright always starts fresh isolated services at
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
