-- CreateEnum
CREATE TYPE "RequestedPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Requester" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedSystem" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatedSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" VARCHAR(21) NOT NULL,
    "submissionKey" UUID NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "relatedSystemId" INTEGER NOT NULL,
    "summary" VARCHAR(120) NOT NULL,
    "requestedPriority" "RequestedPriority" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "storedName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByRequesterId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removalReason" VARCHAR(250),
    "removedByRequesterId" INTEGER,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraints
ALTER TABLE "Category"
ADD CONSTRAINT "Category_displayOrder_check" CHECK ("displayOrder" >= 0);

ALTER TABLE "RelatedSystem"
ADD CONSTRAINT "RelatedSystem_displayOrder_check" CHECK ("displayOrder" >= 0);

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_ticketNumber_format_check"
CHECK ("ticketNumber" ~ '^TKT-[0-9]{8}-[A-F0-9]{8}$'),
ADD CONSTRAINT "Ticket_summary_check"
CHECK ("summary" = BTRIM("summary") AND CHAR_LENGTH("summary") BETWEEN 5 AND 120),
ADD CONSTRAINT "Ticket_description_check"
CHECK ("description" = BTRIM("description") AND CHAR_LENGTH("description") BETWEEN 10 AND 5000);

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_sizeBytes_check"
CHECK ("sizeBytes" BETWEEN 1 AND 5242880),
ADD CONSTRAINT "Attachment_removal_metadata_check"
CHECK (
    ("removedAt" IS NULL AND "removalReason" IS NULL AND "removedByRequesterId" IS NULL)
    OR
    (
        "removedAt" IS NOT NULL
        AND "removalReason" IS NOT NULL
        AND "removedByRequesterId" IS NOT NULL
        AND "removalReason" = BTRIM("removalReason")
        AND CHAR_LENGTH("removalReason") BETWEEN 5 AND 250
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "Requester_email_key" ON "Requester"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedSystem_name_key" ON "RelatedSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_createdAt_id_idx" ON "Ticket"("requesterId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_categoryId_idx" ON "Ticket"("requesterId", "categoryId");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_relatedSystemId_idx" ON "Ticket"("requesterId", "relatedSystemId");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_status_idx" ON "Ticket"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Ticket_requesterId_requestedPriority_idx" ON "Ticket"("requesterId", "requestedPriority");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_requesterId_submissionKey_key" ON "Ticket"("requesterId", "submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storedName_key" ON "Attachment"("storedName");

-- CreateIndex
CREATE INDEX "Attachment_ticketId_removedAt_idx" ON "Attachment"("ticketId", "removedAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Requester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_relatedSystemId_fkey" FOREIGN KEY ("relatedSystemId") REFERENCES "RelatedSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByRequesterId_fkey" FOREIGN KEY ("uploadedByRequesterId") REFERENCES "Requester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_removedByRequesterId_fkey" FOREIGN KEY ("removedByRequesterId") REFERENCES "Requester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
