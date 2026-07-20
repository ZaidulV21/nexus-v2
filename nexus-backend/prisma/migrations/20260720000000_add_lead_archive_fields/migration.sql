-- AlterTable
ALTER TABLE "leads" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "archivedById" TEXT;
ALTER TABLE "leads" ADD COLUMN "archiveReason" TEXT;
