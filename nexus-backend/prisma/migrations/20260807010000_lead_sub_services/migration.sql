-- Phase 7: one Lead Service can carry ONE service but MULTIPLE sub-services
-- via a normalized junction table (Interior -> Painting, Flooring, Lighting).
-- Every existing Phase 6 pin (lead_services.subServiceId, one per Lead
-- Service) is migrated into the junction table so current service history
-- keeps working, then the denormalized column is dropped. No comma-separated
-- values anywhere.

CREATE TABLE "lead_sub_services" (
    "id" TEXT NOT NULL,
    "leadServiceId" TEXT NOT NULL,
    "subServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_sub_services_pkey" PRIMARY KEY ("id")
);

-- Migrate every historical Phase 6 pin into the junction table.
INSERT INTO "lead_sub_services" ("id", "leadServiceId", "subServiceId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "subServiceId", NOW(), NOW()
FROM "lead_services"
WHERE "subServiceId" IS NOT NULL;

ALTER TABLE "lead_services" DROP CONSTRAINT "lead_services_subServiceId_fkey";
DROP INDEX "lead_services_subServiceId_idx";
ALTER TABLE "lead_services" DROP COLUMN "subServiceId";

CREATE UNIQUE INDEX "lead_sub_services_leadServiceId_subServiceId_key" ON "lead_sub_services"("leadServiceId", "subServiceId");
CREATE INDEX "lead_sub_services_subServiceId_idx" ON "lead_sub_services"("subServiceId");

ALTER TABLE "lead_sub_services"
ADD CONSTRAINT "lead_sub_services_leadServiceId_fkey"
FOREIGN KEY ("leadServiceId") REFERENCES "lead_services"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_sub_services"
ADD CONSTRAINT "lead_sub_services_subServiceId_fkey"
FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
