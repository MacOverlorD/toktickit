# Lab 1 Test Evidence

## Issue 1: Project Foundation

| Test ID | Test file or command | Tool | Description | Result |
| --- | --- | --- | --- | --- |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | TokTickIT heading renders | Passed: 1 test |
| API-FOUNDATION | `server/tests/lab-01/foundation.test.ts` | Vitest + Supertest | Express application starts and returns its service name | Passed: 1 test |
| CLIENT-TYPE | `npm run typecheck --prefix client` | TypeScript | Client source and tests type-check | Passed |
| CLIENT-BUILD | `npm run build --prefix client` | Vite | Client production bundle builds | Passed |
| SERVER-BUILD | `npm run build --prefix server` | TypeScript | Server production JavaScript builds | Passed |
| DB-01 | `SELECT 1` through `prisma db execute` | Prisma + PostgreSQL | Prisma reaches the local PostgreSQL database | Passed |
| PRISMA-01 | `npx prisma validate` | Prisma | Prisma PostgreSQL schema is initialized and valid | Passed |
| AUDIT-01 | `npm audit` in client and server | npm | Installed dependencies contain no known audit findings | Passed: 0 vulnerabilities |

Issue 2 and Issue 4 will add the required health, loading, category success, and API failure tests.
