# Lab 4 Data and Migration Contract

Status: proposed for peer approval in Issue #54; normative for Issue #55.

## 1. Exact schema changes

Add `ActionStatus { PLANNED IN_PROGRESS COMPLETED CANCELLED }`.

Add `Ticket.workCycle Int @default(1)`, `Ticket.resolvedAt DateTime? @db.Timestamptz(3)`, and `Ticket.actions ActionTaken[]`. `workCycle` is positive. Existing Tickets receive cycle 1. A transition to REOPENED increments it; a transition to RESOLVED sets `resolvedAt` to server time; REOPENED clears it; CLOSED preserves it. Add ordered Ticket indexes `@@index([requesterId, status, resolvedAt, id])` and `@@index([status, ownerId, updatedAt, id])`; retain the existing `[status,itPriority,updatedAt,id]` index.

Add these named relations to `User`: `createdActions` (`ActionCreator`), `performedActions` (`ActionPerformer`), and `assignedActions` (`ActionAssignee`).

```prisma
model ActionTaken {
  id                 Int          @id @default(autoincrement())
  fixtureKey         String?      @unique @db.VarChar(64)
  ticketId           Int
  ticketWorkCycle    Int
  status             ActionStatus @default(PLANNED)
  actionAt           DateTime?    @db.Timestamptz(3)
  description        String       @db.VarChar(2000)
  result             String?      @db.VarChar(4000)
  createdById        Int
  performedById      Int?
  assignedToId       Int?
  followUpRequired   Boolean      @default(false)
  followUpNote       String?      @db.VarChar(1000)
  attachmentNotes    String?      @db.VarChar(1000)
  idempotencyKey     String       @db.Uuid
  requestFingerprint String       @db.Char(64)
  version            Int          @default(1)
  createdAt          DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime     @default(now()) @updatedAt @db.Timestamptz(3)
  completedAt        DateTime?    @db.Timestamptz(3)
  cancelledAt        DateTime?    @db.Timestamptz(3)
  ticket             Ticket       @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  createdBy          User         @relation("ActionCreator", fields: [createdById], references: [id], onDelete: Restrict)
  performedBy        User?        @relation("ActionPerformer", fields: [performedById], references: [id], onDelete: Restrict)
  assignedTo         User?        @relation("ActionAssignee", fields: [assignedToId], references: [id], onDelete: Restrict)

  @@unique([ticketId, createdById, idempotencyKey])
  @@index([ticketId, ticketWorkCycle, createdAt, id])
  @@index([assignedToId, status, updatedAt, id])
  @@index([performedById, completedAt, id])
  @@index([status, updatedAt, id])
}
```

Application validation trims stored text and rejects invalid combinations. Migration SQL also adds checks: `workCycle >= 1`, `ticketWorkCycle >= 1`, `version >= 1`; description is nonblank; follow-up true iff follow-up note is nonblank; COMPLETED requires result/actionAt/performedById/completedAt and forbids cancelledAt; CANCELLED requires cancelledAt and forbids performedById/completedAt; PLANNED/IN_PROGRESS forbid completedAt/cancelledAt/performedById. `ticketWorkCycle` is copied from the locked Ticket at create and never edited.

## 2. Idempotency storage

Create requires a UUID `Idempotency-Key`. Scope is `(ticketId, createdById, idempotencyKey)`. The server canonicalizes the validated create payload with keys in contract order, explicit nulls, normalized ISO UTC `actionAt`, and trimmed strings, then stores lowercase hexadecimal SHA-256 as `requestFingerprint`. Same key and fingerprint returns the original Action with HTTP 200 and performs no write; same key with a different fingerprint returns 409 `IDEMPOTENCY_KEY_REUSED`. Idempotency rows are retained with the Action and are not separately expired.

## 3. Populated-database migration

1. Put the application in maintenance mode and record the source commit, database URL identity (without credentials), `prisma migrate status`, and row counts for every existing table.
2. Create a timestamped PostgreSQL custom-format backup with `pg_dump --format=custom`; run `pg_restore --list` and retain its checksum/path outside the repository.
3. Preflight that all existing Ticket statuses are recognized, IDs/relations are valid, and no pending migration exists. Abort before DDL on any failure.
4. Run the generated migration through `prisma migrate deploy`. PostgreSQL executes the enum/table/column/index/check additions transactionally. Backfill every existing Ticket to `workCycle=1`; `resolvedAt` remains null because historical resolution time cannot be invented. Do not create historical Actions.
5. Generate Prisma Client, start the application, and verify prior row counts, zero orphan relations, all Tickets at positive work cycles, zero Actions before seed, migration status, and Labs 1-3 smoke tests.
6. Run the idempotent seed only after migration verification, then verify its reserved fixture keys and relationship counts.

An in-transaction failure rolls back automatically and the application remains on the old compatible build. If post-commit verification fails, stop the application, preserve the failed database for diagnosis, restore the preflight dump into a new empty recovery database using `pg_restore --clean --if-exists`, point `DATABASE_URL` to that restored database, deploy the prior application commit, and rerun row-count/relation smoke checks. Never attempt an undocumented destructive in-place rollback. Record commands, timestamps, counts, backup checksum, failure, and recovery result in Issue #55 evidence.

## 4. Seed contract

Seeds identify Lab 4 records by reserved `fixtureKey`; production-created Actions keep it null. Upsert only reserved fixtures and never overwrite non-fixture rows. Required fixtures cover: a Ticket with zero Actions; one with one completed current-cycle Action; one with multiple Actions by different creators/performers/assignees; a reopened Ticket with an old-cycle completed Action that does not qualify; Requesters with zero/nonzero dashboard results; unassigned, owned, urgent, waiting, recently resolved, and boundary-time Tickets; active and inactive assignment candidates. Fixed UUID idempotency keys and fingerprints make reruns stable. A second seed run must preserve IDs/counts and any user-managed non-fixture data.

## 5. Deterministic verification

Issue #55 tests a clean database, a populated copy of the Lab 3 schema, forced migration failure/transaction rollback, documented restore rehearsal, relationship and row-count preservation, constraint violations, index existence/order, Prisma generation, seed twice, and the legacy zero-Action behavior. A migration is not accepted from only a clean-database run.
