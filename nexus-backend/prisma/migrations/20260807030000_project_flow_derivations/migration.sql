-- Phase 9: Projects automatically know their full lineage - Origin Lead,
-- Services, Sub Services, Quotation and Client - with zero manual re-entry.
--
-- 1. projects.quotationId - the origin quotation the Project was born from
--    (the accepted quotation). Nullable, because quotations are never
--    hard-deleted in-app and some projects may be assembled manually; the FK
--    is ON DELETE SET NULL for safety.
-- 2. project_sub_services - the normalized junction (mirroring
--    lead_sub_services) that lets a Project Service carry one service but
--    multiple Sub Services, derived from the accepted quotation's line items.
--
-- Both columns/tables are backfilled from existing data so current projects
-- keep working unchanged. The statements are idempotent so a re-run after a
-- partial failure is safe.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "quotationId" TEXT;

-- Backfill: each Project traces back to the earliest assigned quotation
-- version's quotation.
UPDATE "projects" p
SET "quotationId" = sub."quotationId"
FROM (
    SELECT DISTINCT ON (ps."projectId") ps."projectId" AS "projectId", q."id" AS "quotationId"
    FROM "project_services" ps
    JOIN "quotation_versions" qv ON qv."id" = ps."assignedQuotationVersionId"
    JOIN "quotations" q ON q."id" = qv."quotationId"
    WHERE ps."assignedQuotationVersionId" IS NOT NULL
    ORDER BY ps."projectId", qv."createdAt" ASC
) sub
WHERE sub."projectId" = p."id";

CREATE TABLE IF NOT EXISTS "project_sub_services" (
    "id" TEXT NOT NULL,
    "projectServiceId" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_sub_services_pkey" PRIMARY KEY ("id")
);

-- The unique index must exist BEFORE the backfill INSERTs so their
-- ON CONFLICT arbiter resolves. Prisma expects exactly this index name for
-- the @@unique([projectServiceId, subServiceId]) on the model.
CREATE UNIQUE INDEX IF NOT EXISTS "project_sub_services_projectServiceId_subServiceId_key" ON "project_sub_services"("projectServiceId", "subServiceId");
CREATE INDEX IF NOT EXISTS "project_sub_services_subServiceId_idx" ON "project_sub_services"("subServiceId");

-- Backfill source 1: the accepted quotation's line items (the exact same
-- derivation the runtime uses for new projects).
INSERT INTO "project_sub_services" ("id", "projectServiceId", "subServiceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), ps."id", qi."subServiceId", NOW(), NOW()
FROM "project_services" ps
JOIN "quotation_versions" qv ON qv."id" = ps."assignedQuotationVersionId"
JOIN "quotation_items" qi ON qi."quotationVersionId" = qv."id" AND qi."serviceId" = ps."serviceId"
WHERE qi."subServiceId" IS NOT NULL
ON CONFLICT ("projectServiceId", "subServiceId") DO NOTHING;

-- Backfill source 2: the historical Lead lineage (for older quotations whose
-- line items predate Phase 8, the Lead Service's pinned sub-services still
-- carry the scope).
INSERT INTO "project_sub_services" ("id", "projectServiceId", "subServiceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), ps."id", lss."subServiceId", NOW(), NOW()
FROM "project_services" ps
JOIN "lead_sub_services" lss ON lss."leadServiceId" = ps."leadServiceId"
ON CONFLICT ("projectServiceId", "subServiceId") DO NOTHING;

ALTER TABLE "project_sub_services" DROP CONSTRAINT IF EXISTS "project_sub_services_projectServiceId_fkey";
ALTER TABLE "project_sub_services"
ADD CONSTRAINT "project_sub_services_projectServiceId_fkey"
FOREIGN KEY ("projectServiceId") REFERENCES "project_services"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_sub_services" DROP CONSTRAINT IF EXISTS "project_sub_services_subServiceId_fkey";
ALTER TABLE "project_sub_services"
ADD CONSTRAINT "project_sub_services_subServiceId_fkey"
FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "projects_quotationId_idx" ON "projects"("quotationId");

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_quotationId_fkey";
ALTER TABLE "projects"
ADD CONSTRAINT "projects_quotationId_fkey"
FOREIGN KEY ("quotationId") REFERENCES "quotations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
