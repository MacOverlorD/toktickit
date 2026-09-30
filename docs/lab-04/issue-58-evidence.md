# Issue #58 Execution Evidence

Date: 2026-09-30 (Asia/Bangkok)

Scope: finalize the eight-state Ticket lifecycle, atomic resolution gate, reopen work-cycle behavior, UI feedback, and transition verification.

## Delivered behavior

- Preserved the approved 19-edge Ticket transition matrix for IT Staff and Administrators; Requesters remain unable to call operational routes.
- Status mutation revalidates the operational actor, locks the Ticket row, checks the optimistic Ticket version before state/gate disclosure, and revalidates active owner eligibility inside one serializable transaction.
- `RESOLVED` requires a current-work-cycle `COMPLETED` Action with a nonblank result, performer, and completion timestamp in the same transaction; direct API calls cannot bypass the gate.
- Resolving sets authoritative `resolvedAt`. Reopening increments `workCycle` and clears `resolvedAt` plus the advisory Requester resolution indication. Closing preserves the resolution timestamp and historical Actions remain append-only.
- PostgreSQL raw-query serialization/deadlock conflicts are retried alongside Prisma write conflicts and become safe 409 responses instead of internal errors.
- Staff Ticket Detail now refreshes and displays authoritative status, version, work cycle, and resolved time. It offers only current permitted transitions and explains the current-cycle completion prerequisite and gate rejection.
- Review follow-up filters owner-required targets against the current eligible-owner list, associates resolution guidance with the status select, treats exhausted concurrent transactions as reloadable conflicts, and focuses the Actions Taken region after a resolution-gate rejection.

## Automated verification

| Command | Result |
|---|---|
| `npm run build` | Passed |
| `npm test --prefix server -- --run tests/lab-04/ticket-workflow.test.ts tests/lab-03/ticket-domain.test.ts tests/lab-03/staff-ticket-detail.api.test.ts` | 3 files passed; 14 tests passed |
| `npm test --prefix client -- --run tests/lab-04/TicketWorkflow.test.tsx tests/lab-03/StaffTicketDetail.test.tsx tests/lab-04/ActionsTaken.test.tsx` | 3 files passed; 26 tests passed after review fixes |
| `npm test --prefix server -- --run` | 28 files passed; 161 tests passed |
| `npm test --prefix client -- --run` | 20 files passed; 153 tests passed after review fixes |
| `npm run test:e2e:lab4` | 2 tests passed, including complete -> resolve -> reopen -> old-cycle gate rejection -> new-cycle complete -> resolve |

The API coverage executes the full eight-by-eight source/target matrix, owner and confirmation rules, no-write failures, nonqualifying and old-cycle Actions, authoritative timestamps, reopen clearing, inactive owners, and simultaneous version-bound writers. The component coverage checks permitted controls, actionable gate feedback, focus recovery, and summary refresh. The browser flow proves the current-cycle gate through both failure and subsequent success while preserving Requester read-only Action visibility.
