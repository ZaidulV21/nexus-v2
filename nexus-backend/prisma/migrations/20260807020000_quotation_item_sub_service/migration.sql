-- Phase 8: quotation lines derive Service, Sub Service and Client from the
-- parent Lead Service lineage (Lead -> Lead Service -> Sub Services). Each
-- quotation line may reference the specific Sub Service it covers (Interior ->
-- Painting, Flooring, Lighting becomes one line per sub-service). The column
-- is nullable so service-only lines and every historical quotation stay valid,
-- and the FK is ON DELETE SET NULL so a soft-deleted sub-service never orphans
-- a quotation line (sub-services are soft-deleted in-app anyway).

ALTER TABLE "quotation_items" ADD COLUMN "subServiceId" TEXT;

CREATE INDEX "quotation_items_subServiceId_idx" ON "quotation_items"("subServiceId");

ALTER TABLE "quotation_items"
ADD CONSTRAINT "quotation_items_subServiceId_fkey"
FOREIGN KEY ("subServiceId") REFERENCES "sub_services"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
