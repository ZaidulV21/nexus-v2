-- 1. Drop the XOR constraint that prevents both leadId and clientId from being set.
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_lead_or_client_check";

-- 2. Backfill any remaining NULL values BEFORE enforcing NOT NULL.
-- clientId: for old lead-only quotations, resolve via the lead's sourceClient.
UPDATE "quotations" q
SET "clientId" = c."id"
FROM "clients" c
WHERE q."clientId" IS NULL
  AND q."leadId" IS NOT NULL
  AND c."sourceLeadId" = q."leadId";

-- leadId: for old converted quotations that only have clientId, use sourceLeadId.
UPDATE "quotations" q
SET "leadId" = c."sourceLeadId"
FROM "clients" c
WHERE q."leadId" IS NULL
  AND q."clientId" IS NOT NULL
  AND c."id" = q."clientId"
  AND c."sourceLeadId" IS NOT NULL;

-- 3. Enforce NOT NULL on both columns now that all rows have values.
ALTER TABLE "quotations" ALTER COLUMN "leadId" SET NOT NULL;
ALTER TABLE "quotations" ALTER COLUMN "clientId" SET NOT NULL;
