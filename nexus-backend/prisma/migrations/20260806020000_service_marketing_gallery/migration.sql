-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "service_media" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "posterUrl" TEXT,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_media_serviceId_isActive_sortOrder_idx" ON "service_media"("serviceId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "service_media" ADD CONSTRAINT "service_media_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
