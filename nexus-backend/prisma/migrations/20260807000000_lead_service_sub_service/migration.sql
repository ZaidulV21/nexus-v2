-- Phase 6: pin a specific Sub Service on a Lead Service.
-- The public wizard submits the SubService id (Signage -> Repair), never a
-- text label. onDelete SET NULL keeps the historical Lead Service intact if
-- a sub-service is ever hard-deleted.

ALTER TABLE "lead_services" ADD COLUMN "subServiceId" TEXT;

ALTER TABLE "lead_services"
ADD CONSTRAINT "lead_services_subServiceId_fkey"
FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "lead_services_subServiceId_idx" ON "lead_services"("subServiceId");
