# Issue #55 Execution Evidence

Date: 2026-09-25 (Asia/Bangkok)

Scope: Actions Taken data model, transactional migration, repeatable seed data, and Labs 1-3 regression safety.

## Backup and deployment

- Created a PostgreSQL custom-format backup before deployment: `toktickit-pre-lab4-20260925-011657.dump`.
- Verified the archive with `pg_restore --list`; it contained 151 TOC entries.
- Archive size: 64,137 bytes.
- SHA-256: `F1BA091BF1775D3AC022438CD6CCE6457C15EB2B8D2D58B41478F35EBA056005`.
- The dump is retained under the ignored local `tmp/lab4-backups/` directory and is not committed because database backups may contain private data.
- `prisma migrate status` reported `20260924090000_lab4_actions_data_foundation` pending before deployment.
- `prisma migrate deploy` applied that migration successfully.
- The subsequent status check reported: `Database schema is up to date!`
- `prisma db seed` completed successfully after deployment.

## Automated verification

| Command | Result |
|---|---|
| `npm run build` | Passed |
| `npx vitest run tests/lab-04/migration.test.ts` | 1 file passed; 4 tests passed |
| `npx vitest run tests/lab-03/auth.api.test.ts` | 1 file passed; 8 tests passed |
| `npm test` | 25 files passed; 148 tests passed; 0 failed; 0 skipped; 299.11 seconds |

The Lab 4 migration suite verifies populated Lab 3 preservation, no invented historical Actions or resolution timestamps, repeatable seeds without overwriting a user-edited fixture, zero/one/many and reopened-cycle fixtures, complete transactional rollback after a forced failure, contracted indexes, checks, and restrictive relationships. The full server suite supplies the Labs 1-3 regression evidence.

## Recovery result

The forced-failure test proves that PostgreSQL rolls back all Lab 4 structural changes when the transactional migration fails. The pre-deployment custom-format archive was independently readable by `pg_restore`; the recovery procedure remains the documented new-database restore process in `data-migration.md`, avoiding destructive in-place rollback.
