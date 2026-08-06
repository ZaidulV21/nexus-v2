-- CreateEnum
CREATE TYPE "ProjectMediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- AlterTable: portfolio title + the single "project became Completed" moment.
ALTER TABLE "projects" ADD COLUMN "title" TEXT,
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedByUserId" TEXT;

-- CreateTable
CREATE TABLE "project_media" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ProjectMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "posterUrl" TEXT,
    "title" TEXT,
    "altText" TEXT,
    "caption" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_media_projectId_type_isActive_sortOrder_idx" ON "project_media"("projectId", "type", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
