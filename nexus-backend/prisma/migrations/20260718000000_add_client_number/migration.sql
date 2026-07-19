-- Add human-readable client number (C-00001 style), mirroring lead/project numbering.
-- Backfill existing clients in creation order before enforcing NOT NULL + UNIQUE.
ALTER TABLE "clients" ADD COLUMN "clientNumber" TEXT;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "clients"
)
UPDATE "clients"
SET "clientNumber" = 'C-' || LPAD(numbered.rn::TEXT, 5, '0')
FROM numbered
WHERE "clients"."id" = numbered."id";

ALTER TABLE "clients" ALTER COLUMN "clientNumber" SET NOT NULL;

CREATE UNIQUE INDEX "clients_clientNumber_key" ON "clients"("clientNumber");
