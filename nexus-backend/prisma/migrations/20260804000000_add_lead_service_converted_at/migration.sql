-- Multi-service conversion: track per-service attachment to a Client.
--
-- Previously "Convert to Client" was a Lead-level, one-shot flag (Lead.convertedAt).
-- Once set, the frontend hid the button and later qualified services on the same
-- Lead could never reach the existing Client. Client creation and service
-- conversion are now two independent operations:
--
--   * first conversion  -> create the Client, then attach the qualified services
--   * later conversions -> attach the remaining qualified services to the SAME
--                          Client (no duplicate Client, no re-created history)
--
-- This column records exactly which Lead Services have been attached so a
-- repeat conversion only ever processes the newly-qualified ones. NULL rows are
-- pre-existing services that were attached before this migration; they are
-- treated as already-converted by backfilling them below.

ALTER TABLE "lead_services" ADD COLUMN "convertedAt" TIMESTAMP(3);

-- Backfill: any service on a Lead whose Client already exists was implicitly
-- attached by the old one-shot conversion. Marking them avoids re-attaching and
-- re-recording service events on the next conversion.
UPDATE "lead_services" ls
SET "convertedAt" = COALESCE(leads."convertedAt", now())
FROM "leads"
WHERE "leads"."id" = ls."leadId"
  AND "leads"."convertedAt" IS NOT NULL
  AND ls."convertedAt" IS NULL;
