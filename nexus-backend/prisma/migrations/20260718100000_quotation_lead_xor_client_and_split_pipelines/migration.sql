-- A quotation belongs to a Lead before conversion and a Client after -
-- exactly one of the two is populated at a time.
ALTER TABLE "quotations" ALTER COLUMN "leadId" DROP NOT NULL;

-- Migrate quotations of already-converted Leads to their Client.
UPDATE "quotations" q
SET "clientId" = c."id", "leadId" = NULL
FROM "clients" c
WHERE q."leadId" = c."sourceLeadId";

-- Enforce the XOR for any remaining rows that carried both links.
UPDATE "quotations" SET "leadId" = NULL WHERE "clientId" IS NOT NULL AND "leadId" IS NOT NULL;

ALTER TABLE "quotations"
  ADD CONSTRAINT "quotations_lead_or_client_check"
  CHECK (("leadId" IS NULL) <> ("clientId" IS NULL));

-- ---------------------------------------------------------------------------
-- Split pipelines: map existing statuses onto the current Lead pipeline
-- (NEW, CONTACTED, QUALIFIED, SITE VISIT, QUOTE PREPARING, QUOTE SENT,
--  NEGOTIATION, APPROVED, PROJECT CREATED) and the current Project pipeline
-- (PROJECT CREATED, IN PROGRESS, ON HOLD, COMPLETED, CANCELLED).
-- ---------------------------------------------------------------------------

-- Lead Services: retired names -> nearest new stage.
UPDATE "lead_services" SET "status" = 'SITE VISIT' WHERE "status" IN ('SITE VISIT SCHEDULED', 'SITE VISIT COMPLETED');
-- Execution statuses no longer exist on Lead Services - those services left
-- the sales pipeline when their project was created.
UPDATE "lead_services" SET "status" = 'PROJECT CREATED'
WHERE "status" IN ('IN PROGRESS', 'ON HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED',
                   'PLANNING', 'RESOURCES ASSIGNED', 'WORK STARTED', 'QUALITY INSPECTION', 'HANDOVER', 'CANCELLED');

-- Project Services: retired names -> nearest new stage.
UPDATE "project_services" SET "status" = 'IN PROGRESS'
WHERE "status" IN ('PLANNING', 'RESOURCES ASSIGNED', 'WORK STARTED', 'QUALITY INSPECTION', 'HANDOVER');
UPDATE "project_services" SET "status" = 'COMPLETED' WHERE "status" IN ('CLOSED', 'ARCHIVED');
-- Sales statuses no longer exist on Project Services.
UPDATE "project_services" SET "status" = 'PROJECT CREATED'
WHERE "status" IN ('NEW', 'QUALIFIED', 'CONTACTED', 'SITE VISIT', 'SITE VISIT SCHEDULED',
                   'SITE VISIT COMPLETED', 'QUOTE PREPARING', 'QUOTE SENT', 'NEGOTIATION', 'APPROVED');
