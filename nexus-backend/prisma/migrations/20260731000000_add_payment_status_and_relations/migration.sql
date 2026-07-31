-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- AlterTable: add columns (clientId and projectId nullable initially for backfill)
ALTER TABLE "payments" ADD COLUMN "clientId" TEXT;
ALTER TABLE "payments" ADD COLUMN "projectId" TEXT;
ALTER TABLE "payments" ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS';

-- Backfill clientId and projectId from the invoice relation
UPDATE "payments"
SET "clientId" = "invoices"."clientId",
    "projectId" = "invoices"."projectId"
FROM "invoices"
WHERE "invoices"."id" = "payments"."invoiceId"
  AND ("payments"."clientId" IS NULL OR "payments"."projectId" IS NULL);

-- Make columns required now that data is backfilled
ALTER TABLE "payments" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "payments"("clientId");
CREATE INDEX "payments_projectId_idx" ON "payments"("projectId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
