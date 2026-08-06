-- Phase: Service CMS
-- Adds a fully CMS-driven service catalog: SEO slug, display flags, ordering,
-- per-role images, SEO metadata, and soft delete.

-- AlterTable
ALTER TABLE "services"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "bannerImage" TEXT,
  ADD COLUMN "thumbnail" TEXT,
  ADD COLUMN "heroImage" TEXT,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "metaDescription" TEXT,
  ADD COLUMN "metaKeywords" TEXT,
  ADD COLUMN "ogImage" TEXT,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill slugs so every existing row has a stable, SEO-friendly URL.
-- The base slug mirrors the frontend slugify() exactly (lowercase, non-word
-- characters -> '-', collapse, trim dashes) so existing public URLs
-- (/services/<slug>) are preserved 1:1. Duplicate names get a -2/-3 suffix,
-- matching the runtime ensureUniqueSlug() convention (suffix starts at 2).
WITH numbered AS (
  SELECT
    "id",
    "createdAt",
    NULLIF(btrim(regexp_replace(
      lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')),
      '-+', '-', 'g'
    ), '-'), '') AS base_slug,
    row_number() OVER (
      PARTITION BY NULLIF(btrim(regexp_replace(
        lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')),
        '-+', '-', 'g'
      ), '-'), '')
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "services"
)
UPDATE "services" s
SET "slug" = CASE
  WHEN n.base_slug IS NULL OR n.base_slug = '' THEN 'service-' || s."id"::text
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn
END
FROM numbered n
WHERE s."id" = n."id";

-- Safety net: resolve any residual collisions (e.g. a slug that was manually
-- set to an existing value) before the unique index is created.
UPDATE "services" s
SET "slug" = s."slug" || '-' || substring(replace(s."id"::text, '-', '') FROM 1 FOR 8)
WHERE EXISTS (
  SELECT 1 FROM "services" o WHERE o."id" <> s."id" AND o."slug" = s."slug"
);

ALTER TABLE "services" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex: public lookup (isActive + archived + deleted) for the website
CREATE INDEX "services_catalog_lookup_idx" ON "services"("isActive", "archivedAt", "deletedAt");
