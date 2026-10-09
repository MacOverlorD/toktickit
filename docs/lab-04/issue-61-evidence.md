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
| `npm test` | Passed end-to-end: client 163, isolated server 186, Labs 1-3 browser 10, Lab 4 browser 13 tests (372 total), plus builds; exit code 0 |
| `npm run build` | Passed server TypeScript build, client typecheck, and Vite production build (1,867 modules) |
| `npm run test:server:isolated` | Fresh migrated/seeded schema; 30 files, 186 tests passed; 0 failed/skipped |
| `npm test --prefix client -- --run` | 21 files, 163 tests passed; 0 failed/skipped |
| `npm run test:e2e` | 10 Labs 1-3 Chromium tests passed; 0 failed/skipped |
| `npm run test:e2e:lab4` | 13 Lab 4 Chromium tests passed; 0 failed/skipped |

The Labs 1-3 browser run exposed two stale assumptions in its Staff visual
test after the final Lab 4 UI/workflow landed: an ambiguous text locator and
state inherited from the preceding workflow test. The test now uses semantic
heading locators, establishes its own OPEN/unassigned precondition, and sends a
tampered IN_PROGRESS transition to verify the server-side owner guard. The
isolated test and then the complete suite were rerun after the correction.

The fresh-schema server run also exposed a historical frozen date in the
dashboard API tests. Newly seeded records had timestamps after that cutoff,
so snapshot counts excluded records that live queue lists included. The tests
now freeze a relative cutoff after seed creation; the focused eight-test run
passed while retaining the inclusive/exclusive seven-day boundary assertions.

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

Readiness now checks the loaded dashboard summary, an actual populated Action
record for both Ticket-detail roles, and an Administrator account result.
The audit also waits for both page and Action loading indicators to disappear.
The accessibility Action fixture is removed after that suite, so it does not
alter later workflow tests.

The browser suites assert no horizontal document overflow for Actions and both
dashboards at 1440 x 900, 768 x 1024, 390 x 844, and 320 x 700. The promoted
320 px Action/Ticket detail and operational dashboard were manually inspected:
controls stack within the viewport, labels remain readable, and Ticket/Action
states include text/icons rather than relying on color alone.

The header allows navigation and identity content to wrap, uses a flexible
name column, and gives Change password and Log out their own grid columns.
After resizing, visual checks wait for final content, loading completion,
fonts, and two animation frames before asserting overflow and taking images.
The three tablet full-page images now measure exactly 768 px wide; all
full-page images measure 1440/768/390/320 px as named. Region screenshots are
narrower than their viewport. The regenerated desktop operational dashboard
contains metrics and Action records rather than a loading shell.

## Dashboard performance smoke

`npm run test:performance:lab4` runs
`server/tests/lab-04/dashboard-performance.test.ts` in a new uniquely named
PostgreSQL schema. The runner deploys all six migrations and the standard seed
before testing, and drops only its generated schema in cleanup. The smoke
asserts a baseline of exactly 12 seeded Tickets and 4 seeded Actions before
adding 1,000 Tickets and 5,000 Actions. Global endpoints therefore measure
exactly 1,012 Tickets and 5,004 Actions without existing development records.
It performs five warmups,
then records 30 sequential samples for each dashboard and key list endpoint.
Lists use page 1 with the maximum supported 50-row page; the Staff queue uses
the indexed active scope. The local gate is p95 <= 500 ms per endpoint.

| Endpoint | Observed p95 | Gate |
|---|---:|---:|
| Requester dashboard | 44.22 ms | <= 500 ms |
| Operations dashboard | 119.57 ms | <= 500 ms |
| My Tickets (`page=1&pageSize=50`) | 54.77 ms | <= 500 ms |
| Staff queue (`scope=active&page=1&pageSize=50`) | 52.63 ms | <= 500 ms |

Captured at `2026-10-09T17:06:25.252Z` on Node `v22.18.0` during the
aggregate run. These controlled-schema results replace the earlier
development-database measurements.
The [promoted performance result](../../artifacts/lab-04/performance-smoke.json)
preserves the observed JSON from that run.

The test removes its Action, Ticket, Session, and User fixtures in cleanup.
The runner drops the temporary schema in a finally block. Direct execution
without the matching isolated-schema environment fails with instructions
instead of measuring uncontrolled data. The corrected measurements are also
written to ignored `artifacts/lab-04/performance-results/latest.json` with the
timestamp, Node version, baseline/fixture/total counts, sample counts, budget,
and per-endpoint p95. Root `npm test` includes this isolated server suite,
client tests, builds, and both browser configurations.
The performance-result directory is separate from Playwright's output
directory so browser startup cannot clear the server measurement artifact.
After that path correction, the isolated performance smoke passed again and
both visual tests passed; the performance JSON's SHA-256 remained unchanged
across the browser run.

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
