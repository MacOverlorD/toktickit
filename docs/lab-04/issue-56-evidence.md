# Issue #56 Execution Evidence

Date: 2026-09-28 (Asia/Bangkok)

Scope: complete Actions Taken domain validation and protected REST API.

## Delivered behavior

- Role-scoped list and get endpoints with requester-owned access, non-disclosing missing/wrong-nesting responses, and separate operational/requester DTO allowlists.
- Create with authenticated immutable creator, current Ticket work cycle, eligible optional assignee, canonical SHA-256 request fingerprint, actor/Ticket-scoped UUID idempotency, exact replay, and mismatch conflict.
- Edit, assign/unassign, start, complete, and cancel operations with exact bodies, active Ticket/current-cycle rules, optimistic versions, terminal immutability, and server-owned performer/completion/cancellation facts.
- Serializable mutation transactions revalidate the active operational actor and lock the Ticket and Action rows. Concurrent terminal commands allow one commit and return a conflict for the loser.
- Unicode code-point boundaries, invalid-surrogate rejection, conditional follow-up rules, five-minute future skew, safe JSON/media/query validation, and inactive/wrong-role assignee rejection.

## Automated verification

| Command | Result |
|---|---|
| `npm run build` | Passed |
| `npx vitest run tests/lab-04/action-domain.test.ts tests/lab-04/actions.api.test.ts` | 2 files passed; 9 tests passed |
| `npm test` | 27 files passed; 157 tests passed; 0 failed; 0 skipped; 236.73 seconds |

The focused tests cover every permitted Action lifecycle edge, repeated and terminal commands, exact request validation and text/date boundaries, Staff/Admin operations, Requester mutation denial and safe projection, cross-owner and wrong-Ticket reads, active/inactive assignees, deterministic ordering, canonical replay, key mismatch, stale writes, unsupported media, and a simultaneous complete/cancel race.
