# Issue #59 Execution Evidence

Date: 2026-10-08 (Asia/Bangkok)

Scope: deliver the authenticated Requester Dashboard, authoritative metrics and bounded lists, owner-safe drill-downs, role navigation, feedback states, responsive behavior, and regression evidence.

## Delivered behavior

- Added `GET /api/dashboard/requester` for Requesters only. Identity is derived exclusively from the authenticated session; the endpoint rejects every query parameter, including attempted client-supplied user identity.
- Captures one server `asOf` instant and calculates all counts and lists inside one repeatable-read transaction. Open, waiting-for-Requester, and recently resolved figures follow BR-14 through BR-16 and the approved inclusive seven-day window.
- Returns at most ten recent and attention records, ordered by `updatedAt DESC, id DESC`, using a shared-safe Ticket projection. Empty accounts return explicit zero counts and empty arrays with HTTP 200.
- Extended My Tickets with allowlisted `open` and `recently-resolved` scopes plus every approved exact status. Recently resolved requires the returned canonical ISO `asOf`; scope/status conflicts and malformed input return safe 400 responses.
- Added `/dashboard`, Requester-only route protection, active Dashboard navigation, metric cards, attention and recent lists, exact drill-down links, loading, retryable safe failure, and useful zero-state Create Ticket guidance.
- Preserved the earlier post-login Requester landing route (`/tickets`) to avoid Lab 2/3 regression while making Dashboard directly available in the primary navigation.
- Added single-column mobile, two-column tablet, and balanced desktop layouts with semantic sections, visible native links/buttons, non-color badge labels, long-text wrapping, and no page-level overflow at 320 px.

## Automated verification

| Command | Result |
|---|---|
| `npm run build --prefix server` | Passed |
| `npm run build --prefix client` | Passed |
| `npm test --prefix server -- --run tests/lab-04/dashboard.api.test.ts` | 1 file passed; 5 tests passed |
| `npm test --prefix client -- --run tests/lab-04/Dashboards.test.tsx tests/lab-02/MyTickets.test.tsx` | 2 files passed; 12 tests passed |
| `npm test --prefix server -- --run` | 29 files passed; 180 tests passed; JSON reporter recorded zero failures |
| `npm test --prefix client -- --run` | 21 files passed; 158 tests passed; JSON reporter recorded zero failures |
| `npm run test:e2e:lab4` | Passed (`.last-run.json` status `passed`); 5 collected tests, including the 3 dashboard/drill-down/responsive/forbidden cases |

The API suite compares bounded ordering against a direct database query, covers exact seven-day, minus-one-millisecond, and plus-one-millisecond resolution boundaries, verifies zero results, role denial, unauthenticated access, identity injection rejection, owner isolation, and formula-equivalent My Tickets drill-downs. Component coverage exercises loading, nonzero, zero, safe failure/retry, role protection, navigation, and exact links. Browser coverage follows Dashboard to My Tickets and Ticket Detail, checks staff direct-route denial, and verifies 1440, 768, 390, and 320 px widths without horizontal page overflow.
