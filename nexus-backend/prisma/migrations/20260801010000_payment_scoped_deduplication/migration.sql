-- Payment-scoped deduplication.
--
-- The idempotency guard on timeline/notification events deduplicates by
-- (entityType, entityId, eventType). For payment events entityId is the
-- invoice id, so two legitimate payments on the SAME invoice within the
-- 60s dedupe window were being collapsed into a single event.
--
-- Each payment-related event now carries a dedupeKey = paymentId (or the
-- gateway transaction id when the payment is not yet persisted). Events are
-- deduplicated by (entityType, entityId, eventType, dedupeKey): a retry of
-- the SAME payment is still ignored, while a different payment on the same
-- invoice always produces its own event. Non-payment (invoice lifecycle)
-- events keep dedupeKey NULL and their existing dedup behaviour.

ALTER TABLE "timeline_events" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "notification_events" ADD COLUMN "dedupeKey" TEXT;

CREATE INDEX "timeline_events_entityType_entityId_eventType_dedupeKey_idx"
  ON "timeline_events"("entityType", "entityId", "eventType", "dedupeKey");

CREATE INDEX "notification_events_eventType_entityType_entityId_dedupeKey_idx"
  ON "notification_events"("eventType", "entityType", "entityId", "dedupeKey");
