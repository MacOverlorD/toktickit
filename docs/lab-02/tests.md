# Lab 2 Test Plan and Results

Status: Implementation in progress
Contract: [specification.md](./specification.md)  
API: [api-spec.md](./api-spec.md)  
UI: [ui-spec.md](./ui-spec.md)

## 1. Test Strategy

Lab 2 uses a test pyramid plus explicit visual evidence:

- **Unit:** pure validation, ticket-number/idempotency logic, query parsing, and
  attachment policy without network or database.
- **API/integration:** Express + Supertest + isolated PostgreSQL test data for
  persistence, ownership, status, safe errors, and compensation boundaries.
- **UI component:** Vitest + Testing Library for visible behavior, accessibility,
  preserved state, and API interactions.
- **UI style:** computed class/token and semantic-state assertions for reusable
  conventions. These do not replace screenshots.
- **Responsive:** Playwright at representative desktop, tablet, and mobile sizes,
  including overflow and bounding-box assertions.
- **Visual:** deterministic screenshots and a completed human checklist against
  `ui-spec.md`.
- **E2E:** Playwright through the real frontend, API, and PostgreSQL database for
  the complete multi-requester Ticket/Attachment lifecycle.

API tests must isolate data and clean only records they create. File tests use a
temporary test upload directory and verify cleanup. No test uses production
credentials or relies on execution order. Network-independent unit/UI tests mock
only their boundary; E2E does not mock product APIs.

## 2. Planned Tests

Status values are `Planned`, `Passing`, `Failing`, or `Deferred (approved reason)`.
No required test may remain deferred at release.

### Unit tests

| ID | Scenario | Actual test-file path | Status |
|---|---|---|---|
| UNIT-01 | Ticket input trimming, lengths, enums, and unknown-field rejection | `server/tests/lab-02/ticket-validation.unit.test.ts` | Planned |
| UNIT-02 | Ticket Number UTC format, random suffix, pattern, and invalid-date handling | `server/tests/lab-02/ticket-identity.unit.test.ts` | Passing (Issue #12) |
| UNIT-03 | Extension/MIME pairs, empty/size/count limits, safe stored filename | `server/tests/lab-02/attachment-policy.unit.test.ts` | Planned |
| UNIT-04 | Ticket-list allowlisted query parsing, defaults, and invalid parameters | `server/tests/lab-02/ticket-query.unit.test.ts` | Planned |
| UNIT-05 | Requester email trimming, lowercasing, and idempotent normalization | `server/tests/lab-02/requester-email.unit.test.ts` | Passing (Issue #12 review fix) |

### API and database integration tests

| ID | Scenario | Actual test-file path | Status |
|---|---|---|---|
| API-01 | Active requesters only, deterministic order, empty and DB-failure responses | `server/tests/lab-02/requesters.api.test.ts` | Passing (Issue #14) |
| API-02 | Missing/malformed/inactive context and requester-switch isolation | `server/tests/lab-02/requester-context.api.test.ts` | Passing (Issue #14) |
| API-03 | Active Category/Related System retrieval and inactive-reference rejection | `server/tests/lab-02/create-ticket.api.test.ts` | Passing (Issue #15) |
| API-04 | Valid create persists backend owner, number/date/status and normalized values | `server/tests/lab-02/create-ticket.api.test.ts` | Passing (Issue #15) |
| API-05 | Required/length/enum/reference/unknown-property failures create no Ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Passing (Issue #15) |
| API-06 | Same idempotency key replay versus changed-payload conflict | `server/tests/lab-02/create-ticket.api.test.ts` | Passing (Issue #15) |
| API-07 | Owner-only list and cross-requester isolation | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-08 | Search and exact filters combine correctly and remain owner scoped | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-09 | Sort/page metadata, deterministic ties, beyond-last page, invalid query | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-10 | Owned detail with metadata; malformed, missing, and cross-owner safe not found | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-11 | Valid upload writes safe file/metadata and returns no internal storage data | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-12 | Missing/multiple/empty/type mismatch/unsupported/oversized/sixth upload failures | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-13 | Storage or metadata failure compensation leaves no inconsistent accessible state | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-14 | Active content inline/download bytes and headers; cross-owner access rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-15 | Valid soft removal, reason validation, retained metadata, blocked content/repeat | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-16 | Invalid JSON, unknown API route, parser/storage errors, and exceptions stay JSON-safe | `server/tests/lab-02/create-ticket.api.test.ts` and `server/tests/lab-02/error-contract.api.test.ts` | Passing for malformed JSON (Issue #15); remaining final error cases planned |
| DB-01 | Migration relationships, constraints, indexes, and enum/default behavior | `server/tests/lab-02/data-foundation.integration.test.ts` | Passing (Issue #12) |
| DB-02 | Seed contains required active/inactive records and rerun creates no duplicates | `server/tests/lab-02/data-foundation.integration.test.ts` | Passing (Issue #12) |
| DB-03 | Same-key replay, changed-payload conflict, concurrent submit, and Ticket Number collision retry/exhaustion | `server/tests/lab-02/data-foundation.integration.test.ts` | Passing (Issue #12) |
| DB-04 | Requester email canonical database constraint and case-insensitive identity uniqueness | `server/tests/lab-02/data-foundation.integration.test.ts` | Passing (Issue #12 review fix) |

### UI component and style tests

| ID | Scenario | Actual test-file path | Status |
|---|---|---|---|
| UI-01 | Selector loading, active options, disabled Continue, empty, failure, Retry | `client/tests/lab-02/RequesterSelection.test.tsx` | Passing (Issue #14) |
| UI-02 | Session restoration, testing-only label, shell identity, switch and stale context | `client/tests/lab-02/RequesterContext.test.tsx` | Passing (Issue #14) |
| UI-03 | Create fields, active references, read-only values, initial/loading states | `client/tests/lab-02/CreateTicket.test.tsx` | Passing (Issue #15) |
| UI-04 | Field validation, focus/message linkage, invalid attachment selection | `client/tests/lab-02/CreateTicket.test.tsx` | Passing (Issue #15) |
| UI-05 | Busy/double-click guard, success number, preserved failure values, upload retry | `client/tests/lab-02/CreateTicket.test.tsx` | Passing for ticket creation; upload retry remains Issue #18 |
| UI-06 | Owner list table/card data and requester switch clears old content | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-07 | Search/filter/sort/page controls produce documented API query/reset page | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-08 | Loading, empty, no-results/Clear Filters, failure/Retry states | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-09 | Owned detail, read-only fields, attachments, loading/not-found/failure/back | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-10 | Attachment queue active/uploading/invalid/failed states and five-file limit | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-11 | Preview/download actions and removed metadata without content actions | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-12 | Removal confirmation/reason validation/busy/failure/focus-return behavior | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-13 | Shared safe loading/error/success/empty/not-found live-region semantics | `client/tests/lab-02/FeedbackStates.test.tsx` | Planned |
| UI-14 | Development Requester response is validated and mapped to the public shape | `client/tests/lab-02/development-requesters.test.ts` | Passing (Issue #14) |
| UI-15 | Create API client validates context headers and safe field-error response shapes | `client/tests/lab-02/tickets-api.test.ts` | Passing (Issue #15 review fix) |
| STYLE-01 | Zen Green token values and editable/read-only/invalid/focus conventions | `client/tests/lab-02/zen-green.style.test.tsx` | Passing (Issue #13) |
| STYLE-02 | Button hierarchy, busy dimensions, badge non-color labels, active navigation | `client/tests/lab-02/zen-green.style.test.tsx` | Passing (Issue #13) |
| A11Y-01 | Labels, headings, landmarks, dialog semantics, keyboard focus, accessible names | `client/tests/lab-02/accessibility.test.tsx` | Passing for shared shell/components (Issue #13); feature dialogs remain planned |

### Responsive, visual, and E2E tests

| ID | Scenario | Actual test-file path | Status |
|---|---|---|---|
| RESP-01 | Create Ticket at 1280x800, 834x1112, and 390x844; no overflow/overlap | `e2e/lab-02/responsive-layout.spec.ts` | Planned |
| RESP-02 | My Tickets desktop table and tablet/mobile cards, controls and long values | `e2e/lab-02/responsive-layout.spec.ts` | Planned |
| RESP-03 | Ticket Detail/attachments/dialog fit and remain operable at all viewports | `e2e/lab-02/responsive-layout.spec.ts` | Planned |
| VIS-01 | Required Create Ticket, My Tickets, and Detail screenshots match UI checklist | `e2e/lab-02/visual-evidence.spec.ts` | Planned |
| E2E-01 | Select/restore/change requester and recover from requester API failure | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | Create invalid then valid Ticket, preserve failure draft, official DB values | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | Find created Ticket using search/filter/sort/page; B cannot list A's Ticket | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-04 | Open owned detail; B direct URL sees safe not found | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-05 | Upload, preview/download, remove with reason, metadata retained/content blocked | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| Acceptance criterion | Planned evidence |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-02, UI-01, UI-02, E2E-01 |
| AC-03 | API-02, UI-02, UI-06, E2E-01, E2E-03 |
| AC-04 | API-03, UI-03, STYLE-01, E2E-02 |
| AC-05 | UNIT-01, API-05, UI-04, E2E-02 |
| AC-06 | UNIT-02, DB-03, API-04, UI-05, E2E-02 |
| AC-07 | DB-03, API-06, UI-05, E2E-02 |
| AC-08 | API-16, UI-05, UI-15, E2E-02 |
| AC-09 | API-07, UI-06, E2E-03 |
| AC-10 | UNIT-04, API-08, API-09, UI-07, E2E-03 |
| AC-11 | API-09, UI-08, E2E-03 |
| AC-12 | API-10, UI-09, E2E-04 |
| AC-13 | API-10, UI-09, E2E-04 |
| AC-14 | UNIT-03, API-11, UI-10, E2E-05 |
| AC-15 | UNIT-03, API-12, API-13, UI-10, E2E-02, E2E-05 |
| AC-16 | API-13, UI-05, UI-10, E2E-02 |
| AC-17 | API-14, UI-11, E2E-05 |
| AC-18 | API-15, UI-12, E2E-05 |
| AC-19 | API-15, UI-11, UI-12, E2E-05 |
| AC-20 | API-16, UI-01, UI-03, UI-08, UI-09, UI-13 |
| AC-21 | RESP-01, RESP-02, RESP-03, VIS-01 |
| AC-22 | A11Y-01, STYLE-01, STYLE-02, RESP-01-RESP-03 |
| AC-23 | DB-01, DB-02, DB-04 |
| AC-24 | All required test IDs plus final command output and visual checklist |

Every AC maps to automated evidence. VIS-01 additionally supplies the required
human-reviewed screenshot evidence; it is not the sole proof for any behavior.

## 4. Responsive and Visual Checklist

The source checklist and exact screenshot paths are in `ui-spec.md`. During Issue
09, replace Pending with Pass/Fail and add links below.

| Item | Desktop 1280x800 | Tablet 834x1112 | Mobile 390x844 | Evidence |
|---|---|---|---|---|
| Zen Green palette/hierarchy | Pending | Pending | Pending | Pending |
| Editable versus read-only fields | Pending | Pending | Pending | Pending |
| Field-level validation placement | Pending | Pending | Pending | Pending |
| Button hierarchy and stable busy state | Pending | Pending | Pending | Pending |
| No clipping or incoherent overlap | Pending | Pending | Pending | Pending |
| No unintended horizontal overflow | Pending | Pending | Pending | Pending |
| Table/card responsive representation | Pending | Pending | Pending | Pending |
| Attachment states/dialog layout | Pending | Pending | Pending | Pending |
| Keyboard focus and non-color indicators | Pending | Pending | Pending | Pending |

Playwright overflow assertion for every page root:

```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth))
  .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth))
```

Element bounding boxes must also remain inside the viewport; the page-width
assertion alone does not detect overlap.

## 5. Test Commands

### Current baseline

```powershell
cd server
npm test
npm run build

cd ..\client
npm test
npm run typecheck
npm run build
```

### Lab 2 targeted tests after implementation

```powershell
cd server
npm test -- tests/lab-02

cd ..\client
npm test -- tests/lab-02

cd ..
npx playwright test e2e/lab-02
```

The final implementation shall add documented root/E2E scripts so a clean test
database, server, client, and Playwright run can be started reproducibly. Exact
environment variables and database reset strategy must be recorded in README
before release.

## 6. Final Results

Issue #11 defines planned tests only; implementation test results must not be
fabricated. Update this table in each implementation PR and finalize on `main`.

| Test level | Final command | Pass/fail counts | Date/commit | Result |
|---|---|---|---|---|
| Unit | Pending | Pending | Pending | Planned |
| API/integration | `npm test --prefix server` | 41 passed, 0 failed | 2026-09-03 / Issue #15 review fix | Passing for implemented scope |
| UI component/style/accessibility | `npm test --prefix client` | 54 passed, 0 failed | 2026-09-03 / Issue #15 review fix | Passing for implemented scope |
| Responsive | Pending | Pending | Pending | Planned |
| Visual | Pending | Pending | Pending | Planned |
| E2E | Pending | Pending | Pending | Planned |

## 7. Known Limitations or Deferred Tests

- Real authentication/authorization, IT Staff workflows, post-creation Ticket
  status transitions, malware scanning, and cloud storage are excluded product
  scope and therefore not deferred Lab 2 tests.
- Browser-specific matrix testing beyond the Playwright course environment is
  not required; Chromium is the minimum E2E target unless the implementation
  introduces browser-sensitive behavior.
- Physical purge of soft-removed files is not implemented or tested in Lab 2.
- Performance/load testing is not graded; deterministic pagination and owner-
  scoped query behavior are still covered by API tests.

No in-scope required test is currently approved for deferral.
