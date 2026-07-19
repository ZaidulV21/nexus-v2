-- Split service statuses per entity (PRD revision):
--
-- Lead Services:    NEW, CONTACTED, SITE VISIT SCHEDULED, SITE VISIT COMPLETED,
--                   QUOTE PREPARING, [QUOTE SENT - automatic], NEGOTIATION,
--                   APPROVED, [PROJECT CREATED - automatic]
-- Project Services: PROJECT CREATED, PLANNING, RESOURCES ASSIGNED, WORK STARTED,
--                   IN PROGRESS, ON HOLD, QUALITY INSPECTION, COMPLETED,
--                   HANDOVER, CLOSED (+ CANCELLED terminal exit)
--
-- Remap retired names to their nearest current stage.

-- Lead Services: QUALIFIED is retired (folded into CONTACTED); the single
-- SITE VISIT stage re-splits into SCHEDULED/COMPLETED - a service parked at
-- the old combined stage maps to SCHEDULED (the visit may not have happened).
UPDATE "lead_services" SET "status" = 'CONTACTED' WHERE "status" = 'QUALIFIED';
UPDATE "lead_services" SET "status" = 'SITE VISIT SCHEDULED' WHERE "status" = 'SITE VISIT';

-- Project Services: no remap needed - PLANNING, RESOURCES ASSIGNED,
-- WORK STARTED, QUALITY INSPECTION, HANDOVER, CLOSED are restored as legal
-- stages, and rows previously collapsed into IN PROGRESS / COMPLETED remain
-- valid at those stages.
