-- Fail before structural changes if an existing email violates the canonical key.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Requester"
    WHERE "email" <> LOWER(BTRIM("email"))
  ) THEN
    RAISE EXCEPTION 'Requester email preflight failed: non-canonical email exists';
  END IF;

  IF EXISTS (
    SELECT LOWER(BTRIM("email"))
    FROM "Requester"
    GROUP BY LOWER(BTRIM("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Requester email preflight failed: duplicate canonical email exists';
  END IF;
END $$;

-- Extend the existing enum before seed data can use the new values.
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- Preserve all Requester primary keys and the sequence while evolving the table.
ALTER TABLE "Requester" RENAME TO "User";
ALTER SEQUENCE "Requester_id_seq" RENAME TO "User_id_seq";
ALTER TABLE "User" RENAME CONSTRAINT "Requester_pkey" TO "User_pkey";
ALTER TABLE "User"
  RENAME CONSTRAINT "Requester_email_canonical_check"
  TO "User_email_canonical_check";
ALTER INDEX "Requester_email_key" RENAME TO "User_email_key";

ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "User"
  ADD CONSTRAINT "User_name_check"
    CHECK ("name" = BTRIM("name") AND CHAR_LENGTH("name") BETWEEN 1 AND 120),
  ADD CONSTRAINT "User_version_check"
    CHECK ("version" >= 1);

CREATE INDEX "User_role_isActive_id_idx"
  ON "User"("role", "isActive", "id");

-- Preserve requesterId as the immutable submitter relation.
ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "itPriority" "RequestedPriority",
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolutionIndicatedAt" TIMESTAMPTZ(3),
  ADD COLUMN "resolutionIndicatedById" INTEGER;

UPDATE "Ticket"
SET "itPriority" = "requestedPriority"
WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket"
  ALTER COLUMN "itPriority" SET NOT NULL,
  ADD CONSTRAINT "Ticket_version_check"
    CHECK ("version" >= 1),
  ADD CONSTRAINT "Ticket_resolution_indication_check"
    CHECK (
      (
        "resolutionIndicatedAt" IS NULL
        AND "resolutionIndicatedById" IS NULL
      )
      OR
      (
        "resolutionIndicatedAt" IS NOT NULL
        AND "resolutionIndicatedById" = "requesterId"
      )
    );

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Ticket_resolutionIndicatedById_fkey"
    FOREIGN KEY ("resolutionIndicatedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Ticket_status_itPriority_updatedAt_id_idx"
  ON "Ticket"("status", "itPriority", "updatedAt", "id");
CREATE INDEX "Ticket_ownerId_updatedAt_id_idx"
  ON "Ticket"("ownerId", "updatedAt", "id");

-- Rename attachment actor fields without changing their values.
ALTER TABLE "Attachment"
  RENAME COLUMN "uploadedByRequesterId" TO "uploadedByUserId";
ALTER TABLE "Attachment"
  RENAME COLUMN "removedByRequesterId" TO "removedByUserId";
ALTER TABLE "Attachment"
  RENAME CONSTRAINT "Attachment_uploadedByRequesterId_fkey"
  TO "Attachment_uploadedByUserId_fkey";
ALTER TABLE "Attachment"
  RENAME CONSTRAINT "Attachment_removedByRequesterId_fkey"
  TO "Attachment_removedByUserId_fkey";

CREATE TABLE "Session" (
  "tokenHash" CHAR(64) NOT NULL,
  "userId" INTEGER NOT NULL,
  "csrfToken" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash"),
  CONSTRAINT "Session_tokenHash_check"
    CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "Session_csrfToken_check"
    CHECK ("csrfToken" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "Session_expiry_check"
    CHECK ("expiresAt" > "createdAt")
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PublicComment" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicComment_content_check"
    CHECK (
      "content" = BTRIM("content")
      AND CHAR_LENGTH("content") BETWEEN 1 AND 5000
    )
);

CREATE INDEX "PublicComment_ticketId_createdAt_id_idx"
  ON "PublicComment"("ticketId", "createdAt", "id");
ALTER TABLE "PublicComment"
  ADD CONSTRAINT "PublicComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PublicComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InternalNote" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalNote_content_check"
    CHECK (
      "content" = BTRIM("content")
      AND CHAR_LENGTH("content") BETWEEN 1 AND 5000
    )
);

CREATE INDEX "InternalNote_ticketId_createdAt_id_idx"
  ON "InternalNote"("ticketId", "createdAt", "id");
ALTER TABLE "InternalNote"
  ADD CONSTRAINT "InternalNote_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "InternalNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
