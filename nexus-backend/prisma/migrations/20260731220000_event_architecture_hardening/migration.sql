-- Event-architecture hardening:
--  * Track whether a payment receipt was emailed to the client (idempotent
--    receipt sends).
--  * Mark client-visible timeline events and index the (entityType, entityId,
--    eventType) tuple used by the dedupe/idempotency guard.
--  * Backfill: PDF-generated/downloaded entries are SYSTEM events and are moved
--    to the Audit Log; they are removed from the business timeline. Timeline
--    entries are also deduplicated so each business action appears once.

ALTER TABLE "payments" ADD COLUMN "receiptSentAt" TIMESTAMP(3);

ALTER TABLE "timeline_events" ADD COLUMN "clientVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "timeline_events_entityType_entityId_eventType_idx"
  ON "timeline_events"("entityType", "entityId", "eventType");

-- Move PDF lifecycle entries out of the business timeline. The Audit Log
-- already records PDF_GENERATED actions, so nothing is lost.
DELETE FROM "timeline_events"
WHERE "eventType" IN (
  'INVOICE_PDF_GENERATED',
  'INVOICE_PDF_DOWNLOADED',
  'PDF_GENERATED',
  'PDF_DOWNLOADED',
  'RECEIPT_PDF_GENERATED',
  'RECEIPT_PDF_DOWNLOADED'
);

-- Deduplicate existing business events: keep the earliest occurrence of each
-- (entityType, entityId, eventType) group.
DELETE FROM "timeline_events" a
USING "timeline_events" b
WHERE a."id" <> b."id"
  AND a."entityType" = b."entityType"
  AND a."entityId" = b."entityId"
  AND a."eventType" = b."eventType"
  AND a."createdAt" > b."createdAt";
