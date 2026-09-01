# TokTickIT

TokTickIT is a full-stack IT service desk project for CPE334. The repository contains a React client and an Express API backed by PostgreSQL through Prisma. Lab 2 requester-ticketing features are being integrated through the `lab2-staging` workflow.

## Prerequisites

- Node.js 22.12 or later
- npm 10 or later
- PostgreSQL

## Project structure

```text
toktickit/
|-- client/             React, TypeScript, Vite, Bootstrap
|-- server/             Express, TypeScript, Prisma
|   |-- prisma/
|   |-- src/
|   `-- tests/
|       |-- lab-01/
|       `-- lab-02/
`-- docs/
    |-- lab-01/
    `-- lab-02/         Engineering contract and evidence
```

## Setup

1. Create local environment files:

   ```powershell
   Copy-Item client/.env.example client/.env
   Copy-Item server/.env.example server/.env
   ```

2. Update `DATABASE_URL` in `server/.env` for your PostgreSQL installation.

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
   npm install --prefix client
   npm install --prefix server
   ```

4. Apply all database migrations and seed the Lab 2 reference data:

   ```powershell
   npm run prisma:migrate --prefix server
   npm run prisma:seed --prefix server
   ```

   The repeatable seed maintains the four required Categories, seven Related Systems, four active Development Requesters, and one inactive Development Requester without creating duplicates.

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

## Verification

```powershell
npm run build --prefix client
npm run typecheck --prefix client
npm test --prefix client
npm run build --prefix server
npm test --prefix server
npm run prisma:generate --prefix server
npm run prisma:seed --prefix server
```
