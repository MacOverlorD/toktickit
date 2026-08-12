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

## Issue 2: API Health Check

| Test ID | Test file | Tool | Test description | Result |
| --- | --- | --- | --- | --- |
| API-01 | `server/tests/lab-01/health.test.ts` | Vitest + Supertest | `GET /api/health` returns HTTP 200 and the expected JSON | Passed |
| UI-02 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | A pending health request displays the loading state and disables the button | Passed |
| UI-HEALTH-01 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | A valid API response displays `System Status: Online` | Passed |
| UI-03 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | An unavailable API displays `System Status: Offline` and a useful error | Passed |
| UI-HEALTH-02 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | A health request that exceeds the timeout is aborted and displays the offline error state | Passed |
| UI-SYSTEM-DB-01 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | A successful health response with a failed category/database request displays `System Status: Offline` | Passed |

## Issue 4: Category List

| Test ID | Test file | Tool | Test description | Result |
| --- | --- | --- | --- | --- |
| API-02 | `server/tests/lab-01/categories.test.ts` | Vitest + Supertest + Prisma | `GET /api/categories` reads PostgreSQL and returns the four seeded categories in ID order | Passed |
| API-ERROR-01 | `server/tests/lab-01/categories.test.ts` | Vitest + Supertest | A category database failure returns HTTP 500 with a safe JSON error response | Passed |
| UI-CATEGORY-01 | `client/tests/lab-01/CategoryList.test.tsx` | Vitest | The category list displays a loading state while the API request is pending | Passed |
| UI-CATEGORY-02 | `client/tests/lab-01/HealthCheck.test.tsx` | Vitest | Check System displays category IDs and names returned by the category API rather than hard-coded values | Passed |
| UI-CATEGORY-03 | `client/tests/lab-01/CategoryList.test.tsx` | Vitest | A category failure displays a useful error and Retry requests another system check | Passed |

## Final Pre-Integration Verification

Verified on the completed `lab1-staging` code before opening the final Pull Request to `main`:

| Command or check | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npx prisma migrate status` | Passed: database schema is up to date |
| `npm run prisma:seed` executed twice | Passed: database still contains exactly 4 categories |
| `npm test --prefix server` | Passed: 3 test files, 4 tests |
| `npm run build --prefix server` followed by `node dist/server.js` | Passed: production server started successfully |
| `GET /api/health` against the built server | Passed: HTTP 200 with the expected JSON |
| `GET /api/categories` against the built server | Passed: HTTP 200 with the four seeded categories in ID order |
| `npm run typecheck --prefix client` | Passed |
| `npm test --prefix client` | Passed: 3 test files, 9 tests |
| `npm run build --prefix client` | Passed |
| `npm audit` in client and server | Passed: 0 vulnerabilities |
