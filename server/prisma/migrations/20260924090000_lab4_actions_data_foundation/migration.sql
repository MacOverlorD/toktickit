BEGIN;

CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Ticket"
  ADD COLUMN "workCycle" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolvedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Ticket_workCycle_check" CHECK ("workCycle" >= 1);

CREATE INDEX "Ticket_requesterId_status_resolvedAt_id_idx"
  ON "Ticket"("requesterId", "status", "resolvedAt", "id");
CREATE INDEX "Ticket_status_ownerId_updatedAt_id_idx"
  ON "Ticket"("status", "ownerId", "updatedAt", "id");

CREATE TABLE "ActionTaken" (
  "id" SERIAL NOT NULL,
  "fixtureKey" VARCHAR(64),
  "ticketId" INTEGER NOT NULL,
  "ticketWorkCycle" INTEGER NOT NULL,
  "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
  "actionAt" TIMESTAMPTZ(3),
  "description" VARCHAR(2000) NOT NULL,
  "result" VARCHAR(4000),
  "createdById" INTEGER NOT NULL,
  "performedById" INTEGER,
  "assignedToId" INTEGER,
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" VARCHAR(1000),
  "attachmentNotes" VARCHAR(1000),
  "idempotencyKey" UUID NOT NULL,
  "requestFingerprint" CHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),

  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActionTaken_ticketWorkCycle_check" CHECK ("ticketWorkCycle" >= 1),
  CONSTRAINT "ActionTaken_version_check" CHECK ("version" >= 1),
  CONSTRAINT "ActionTaken_fixtureKey_check" CHECK (
    "fixtureKey" IS NULL OR (
      "fixtureKey" = BTRIM("fixtureKey") AND CHAR_LENGTH("fixtureKey") BETWEEN 1 AND 64
    )
  ),
  CONSTRAINT "ActionTaken_description_check" CHECK (
    "description" = BTRIM("description") AND CHAR_LENGTH("description") BETWEEN 1 AND 2000
  ),
  CONSTRAINT "ActionTaken_result_check" CHECK (
    "result" IS NULL OR ("result" = BTRIM("result") AND CHAR_LENGTH("result") BETWEEN 1 AND 4000)
  ),
  CONSTRAINT "ActionTaken_followUp_check" CHECK (
    ("followUpRequired" = true AND "followUpNote" IS NOT NULL
      AND "followUpNote" = BTRIM("followUpNote") AND CHAR_LENGTH("followUpNote") BETWEEN 1 AND 1000)
    OR ("followUpRequired" = false AND "followUpNote" IS NULL)
  ),
  CONSTRAINT "ActionTaken_attachmentNotes_check" CHECK (
    "attachmentNotes" IS NULL OR (
      "attachmentNotes" = BTRIM("attachmentNotes") AND CHAR_LENGTH("attachmentNotes") BETWEEN 1 AND 1000
    )
  ),
  CONSTRAINT "ActionTaken_fingerprint_check" CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ActionTaken_status_fields_check" CHECK (
    ("status" IN ('PLANNED', 'IN_PROGRESS') AND "performedById" IS NULL
      AND "completedAt" IS NULL AND "cancelledAt" IS NULL)
    OR ("status" = 'COMPLETED' AND "performedById" IS NOT NULL
      AND "completedAt" IS NOT NULL AND "cancelledAt" IS NULL
      AND "actionAt" IS NOT NULL AND "result" IS NOT NULL AND CHAR_LENGTH("result") >= 1)
    OR ("status" = 'CANCELLED' AND "performedById" IS NULL
      AND "completedAt" IS NULL AND "cancelledAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ActionTaken_fixtureKey_key" ON "ActionTaken"("fixtureKey");
CREATE UNIQUE INDEX "ActionTaken_ticketId_createdById_idempotencyKey_key"
  ON "ActionTaken"("ticketId", "createdById", "idempotencyKey");
CREATE INDEX "ActionTaken_ticketId_ticketWorkCycle_createdAt_id_idx"
  ON "ActionTaken"("ticketId", "ticketWorkCycle", "createdAt", "id");
CREATE INDEX "ActionTaken_assignedToId_status_updatedAt_id_idx"
  ON "ActionTaken"("assignedToId", "status", "updatedAt", "id");
CREATE INDEX "ActionTaken_performedById_completedAt_id_idx"
  ON "ActionTaken"("performedById", "completedAt", "id");
CREATE INDEX "ActionTaken_status_updatedAt_id_idx"
  ON "ActionTaken"("status", "updatedAt", "id");

ALTER TABLE "ActionTaken"
  ADD CONSTRAINT "ActionTaken_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionTaken_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionTaken_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ActionTaken_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
