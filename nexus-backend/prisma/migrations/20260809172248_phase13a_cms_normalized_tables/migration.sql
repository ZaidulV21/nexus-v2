-- CreateTable
CREATE TABLE "service_features" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_included_items" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_included_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_process_steps" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_faqs" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_testimonials" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatar" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_seo" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "structuredData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_features" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_included_items" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_included_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_process_steps" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_faqs" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_media" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_service_seo" (
    "id" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "structuredData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_service_seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "clientName" TEXT,
    "location" TEXT,
    "projectDate" TIMESTAMP(3),
    "link" TEXT,
    "serviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_project_media" (
    "id" TEXT NOT NULL,
    "portfolioProjectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_project_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_features_serviceId_sortOrder_idx" ON "service_features"("serviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "service_included_items_serviceId_sortOrder_idx" ON "service_included_items"("serviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "service_process_steps_serviceId_sortOrder_idx" ON "service_process_steps"("serviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "service_faqs_serviceId_sortOrder_idx" ON "service_faqs"("serviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "service_testimonials_serviceId_sortOrder_idx" ON "service_testimonials"("serviceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_seo_serviceId_key" ON "service_seo"("serviceId");

-- CreateIndex
CREATE INDEX "sub_service_features_subServiceId_sortOrder_idx" ON "sub_service_features"("subServiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "sub_service_included_items_subServiceId_sortOrder_idx" ON "sub_service_included_items"("subServiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "sub_service_process_steps_subServiceId_sortOrder_idx" ON "sub_service_process_steps"("subServiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "sub_service_faqs_subServiceId_sortOrder_idx" ON "sub_service_faqs"("subServiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "sub_service_media_subServiceId_isActive_sortOrder_idx" ON "sub_service_media"("subServiceId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "sub_service_seo_subServiceId_key" ON "sub_service_seo"("subServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_projects_slug_key" ON "portfolio_projects"("slug");

-- CreateIndex
CREATE INDEX "portfolio_projects_serviceId_isActive_sortOrder_idx" ON "portfolio_projects"("serviceId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "portfolio_project_media_portfolioProjectId_sortOrder_idx" ON "portfolio_project_media"("portfolioProjectId", "sortOrder");

-- AddForeignKey
ALTER TABLE "service_features" ADD CONSTRAINT "service_features_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_included_items" ADD CONSTRAINT "service_included_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_process_steps" ADD CONSTRAINT "service_process_steps_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_faqs" ADD CONSTRAINT "service_faqs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_testimonials" ADD CONSTRAINT "service_testimonials_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_seo" ADD CONSTRAINT "service_seo_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_features" ADD CONSTRAINT "sub_service_features_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_included_items" ADD CONSTRAINT "sub_service_included_items_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_process_steps" ADD CONSTRAINT "sub_service_process_steps_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_faqs" ADD CONSTRAINT "sub_service_faqs_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_media" ADD CONSTRAINT "sub_service_media_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_service_seo" ADD CONSTRAINT "sub_service_seo_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_project_media" ADD CONSTRAINT "portfolio_project_media_portfolioProjectId_fkey" FOREIGN KEY ("portfolioProjectId") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 13a backfill: copy the legacy JSON content into the normalized tables.
-- sortOrder = array index (0-based) so the assembled API shapes keep the exact
-- ordering the admin had. Runs inside the migration transaction - if any part
-- fails, nothing is created. The legacy JSON columns are NOT dropped here; they
-- are removed in a separate, later migration (phase 13b) after verification.
-- ═══════════════════════════════════════════════════════════════════════════

-- Service features (Service.features: string[])
INSERT INTO "service_features" ("id", "serviceId", "text", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value, elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."features") WITH ORDINALITY AS elem(value, ord);

-- Service included items (Service.whatsIncluded: string[])
INSERT INTO "service_included_items" ("id", "serviceId", "text", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value, elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."whatsIncluded") WITH ORDINALITY AS elem(value, ord);

-- Service process steps (Service.process: [{ title, description }])
INSERT INTO "service_process_steps" ("id", "serviceId", "title", "description", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value->>'title', elem.value->>'description', elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
CROSS JOIN LATERAL jsonb_array_elements(s."process") WITH ORDINALITY AS elem(value, ord);

-- Service FAQs (Service.faqs: [{ question, answer }])
INSERT INTO "service_faqs" ("id", "serviceId", "question", "answer", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value->>'question', elem.value->>'answer', elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
CROSS JOIN LATERAL jsonb_array_elements(s."faqs") WITH ORDINALITY AS elem(value, ord);

-- Service testimonials (Service.testimonials: [{ name, role, company, content, rating, avatar? }])
INSERT INTO "service_testimonials" ("id", "serviceId", "name", "role", "company", "content", "rating", "avatar", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id",
       elem.value->>'name',
       NULLIF(elem.value->>'role', ''),
       NULLIF(elem.value->>'company', ''),
       elem.value->>'content',
       COALESCE((elem.value->>'rating')::int, 5),
       NULLIF(elem.value->>'avatar', ''),
       elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
CROSS JOIN LATERAL jsonb_array_elements(s."testimonials") WITH ORDINALITY AS elem(value, ord);

-- Service SEO (1:1) - only rows that actually carry SEO data (a service with no
-- SEO keeps no row; assembly falls back to the same defaults as before).
INSERT INTO "service_seo" ("id", "serviceId", "seoTitle", "metaDescription", "metaKeywords", "ogImage", "canonicalUrl", "structuredData", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "seoTitle", "metaDescription", "metaKeywords", "ogImage", "canonicalUrl", COALESCE("structuredData", '{}'::jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services"
WHERE "seoTitle" IS NOT NULL
   OR "metaDescription" IS NOT NULL
   OR "metaKeywords" IS NOT NULL
   OR "ogImage" IS NOT NULL
   OR "canonicalUrl" IS NOT NULL
   OR ("structuredData" IS NOT NULL AND "structuredData" <> '{}'::jsonb);

-- Sub Service features (SubService.features: string[])
INSERT INTO "sub_service_features" ("id", "subServiceId", "text", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value, elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."features") WITH ORDINALITY AS elem(value, ord);

-- Sub Service included items (SubService.whatsIncluded: string[])
INSERT INTO "sub_service_included_items" ("id", "subServiceId", "text", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value, elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."whatsIncluded") WITH ORDINALITY AS elem(value, ord);

-- Sub Service process steps (SubService.process: [{ title, description }])
INSERT INTO "sub_service_process_steps" ("id", "subServiceId", "title", "description", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value->>'title', elem.value->>'description', elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services" s
CROSS JOIN LATERAL jsonb_array_elements(s."process") WITH ORDINALITY AS elem(value, ord);

-- Sub Service FAQs (SubService.faqs: [{ question, answer }])
INSERT INTO "sub_service_faqs" ("id", "subServiceId", "question", "answer", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value->>'question', elem.value->>'answer', elem.ord - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services" s
CROSS JOIN LATERAL jsonb_array_elements(s."faqs") WITH ORDINALITY AS elem(value, ord);

-- Sub Service gallery (SubService.gallery: string[] of image URLs)
INSERT INTO "sub_service_media" ("id", "subServiceId", "url", "altText", "caption", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."id", elem.value, NULL, NULL, elem.ord - 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."gallery") WITH ORDINALITY AS elem(value, ord);

-- Sub Service SEO (1:1)
INSERT INTO "sub_service_seo" ("id", "subServiceId", "seoTitle", "metaDescription", "metaKeywords", "ogImage", "canonicalUrl", "structuredData", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "seoTitle", "metaDescription", "metaKeywords", "ogImage", "canonicalUrl", COALESCE("structuredData", '{}'::jsonb), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "sub_services"
WHERE "seoTitle" IS NOT NULL
   OR "metaDescription" IS NOT NULL
   OR "metaKeywords" IS NOT NULL
   OR "ogImage" IS NOT NULL
   OR "canonicalUrl" IS NOT NULL
   OR ("structuredData" IS NOT NULL AND "structuredData" <> '{}'::jsonb);
