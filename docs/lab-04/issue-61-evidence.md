# Issue #61 Integrated Hardening Evidence

Status: implementation checks passed on `feature/4-08-integrated-hardening`.
Peer review and merge remain required; the exact-final-`main` release and PDF
audit belongs to Issue #62.

## Environment and database gate

- Windows development host, Node.js 22+, Chromium via Playwright, and local
  PostgreSQL `toktickit` database on `127.0.0.1:5432`.
- `npm run prisma:generate --prefix server`: passed.
- `npm run prisma:deploy --prefix server`: passed; 6 migrations found and no
  pending migration.
- `npm run prisma:status --prefix server`: passed; database schema up to date.
- `npm run prisma:seed --prefix server` executed twice consecutively: both
  passed, confirming the normal repeatable seed path.

## Build and automated regression

| Command | Observed result |
|---|---|
| `npm run build` | Passed server TypeScript build, client typecheck, and Vite production build (1,867 modules) |
| `npm test --prefix server -- --run` | 30 files, 186 tests passed; 0 failed/skipped |
| `npm test --prefix client -- --run` | 21 files, 163 tests passed; 0 failed/skipped |
| `npm run test:e2e` | 10 Labs 1-3 Chromium tests passed; 0 failed/skipped |
| `npm run test:e2e:lab4` | 13 Lab 4 Chromium tests passed; 0 failed/skipped |

The Labs 1-3 browser run exposed two stale assumptions in its Staff visual
test after the final Lab 4 UI/workflow landed: an ambiguous text locator and
state inherited from the preceding workflow test. The test now uses semantic
heading locators, establishes its own OPEN/unassigned precondition, and sends a
tampered IN_PROGRESS transition to verify the server-side owner guard. The
isolated test and then the complete suite were rerun after the correction.

The Lab 4 regression test additionally walks critical Requester, Staff, and
Administrator routes, verifies safe forbidden states, checks the integrated
Ticket sections, and rejects unexpected browser errors or HTTP failures.

A production-source audit found no TODO/FIXME/placeholder copy or empty hash
links. The sole JSX `placeholder` is the descriptive Ticket search hint. The
remaining server console calls are intentional startup and attachment-cleanup
operational logs; the browser regression reported no console/page errors. The
screen audit found no obsolete Lab 3 control duplicated by the new Actions or
dashboard UI, and error/success feedback stays in the existing alert/status
patterns.

## Accessibility and responsive audit

`e2e/lab-04/accessibility.spec.ts` ran axe-core on the Requester dashboard and
Ticket detail, Staff dashboard and Ticket detail, and Administrator dashboard
and user management. All three role tests passed with no serious or critical
violations. Keyboard entry also produced a visible `:focus-visible` target with
a nonzero outline.

The browser suites assert no horizontal document overflow for Actions and both
dashboards at 1440 x 900, 768 x 1024, 390 x 844, and 320 x 700. The promoted
320 px Action/Ticket detail and operational dashboard were manually inspected:
controls stack within the viewport, labels remain readable, and Ticket/Action
states include text/icons rather than relying on color alone.

## Dashboard performance smoke

`server/tests/lab-04/dashboard-performance.test.ts` creates an isolated
PostgreSQL workload of 1,000 Tickets and 5,000 Actions, performs five warmups,
then records 30 sequential samples for each dashboard and key list endpoint.
Lists use page 1 with the maximum supported 50-row page; the Staff queue uses
the indexed active scope. The local gate is p95 <= 500 ms per endpoint.

| Endpoint | Observed p95 | Gate |
|---|---:|---:|
| Requester dashboard | 54.09 ms | <= 500 ms |
| Operations dashboard | 117.29 ms | <= 500 ms |
| My Tickets (`page=1&pageSize=50`) | 50.61 ms | <= 500 ms |
| Staff queue (`scope=active&page=1&pageSize=50`) | 59.97 ms | <= 500 ms |

The test passed and removes its Action, Ticket, Session, and User fixtures in
cleanup. It is part of the full server suite so later changes retain the gate.

## Reviewed visual inventory

The PowerShell promotion command documented in the root README passed 2/2
tests with `PROMOTE_LAB4_EVIDENCE=1` and produced 16 PNG files:

- `artifacts/lab-04/screenshots/requester-dashboard/`: four nonzero Requester
  dashboard views.
- `artifacts/lab-04/screenshots/operations-dashboard/`: four nonzero queue,
  assigned-Action, recent-work, status, and priority views.
- `artifacts/lab-04/screenshots/actions/`: four populated Action and operation
  views.
- `artifacts/lab-04/screenshots/ticket-workflow/`: four complete Staff Ticket
  workflow views.

Ordinary generated reports, traces, and temporary captures remain ignored.
Promoted screenshots are committed only through the explicit environment flag.

## Requirement conclusion

Issue #61 supplies the integrated AC-09 accessibility/responsive evidence,
AC-10 Labs 1-3 regression evidence, and AC-11 measured performance evidence.
It also verifies production builds, migration status, repeatable seeding,
role-isolated critical navigation, absence of unexpected browser errors, and
current setup/test documentation. AC-12's immutable links, final SHA, peer
approval, reflection, and single nine-part submission PDF remain intentionally
open for Issue #62 after this PR is reviewed and merged.
