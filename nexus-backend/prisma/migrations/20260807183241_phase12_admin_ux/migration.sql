-- CreateEnum
CREATE TYPE "PublicationState" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "company_settings" ALTER COLUMN "currencySymbol" SET DEFAULT '₹';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "publicationState" "PublicationState" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "sub_services" ADD COLUMN     "publicationState" "PublicationState" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "replyBody" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");
