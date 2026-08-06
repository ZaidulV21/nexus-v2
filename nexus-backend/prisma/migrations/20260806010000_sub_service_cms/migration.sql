-- CreateTable
CREATE TABLE "sub_services" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "heroImage" TEXT,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "features" JSONB NOT NULL DEFAULT '[]',
    "whatsIncluded" JSONB NOT NULL DEFAULT '[]',
    "process" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "startingPrice" TEXT,
    "completionTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sub_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_services_serviceId_slug_key" ON "sub_services"("serviceId", "slug");

-- CreateIndex
CREATE INDEX "sub_services_serviceId_isActive_archivedAt_deletedAt_idx" ON "sub_services"("serviceId", "isActive", "archivedAt", "deletedAt");

-- AddForeignKey
ALTER TABLE "sub_services" ADD CONSTRAINT "sub_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
