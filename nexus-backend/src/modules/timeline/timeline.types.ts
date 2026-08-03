export interface RecordEventInput {
  entityType: string;
  entityId: string;
  eventType: string;
  description: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
  // Optional payment-scoped idempotency key. Payment-related events carry the
  // paymentId (or gateway transaction id) so the dedupe guard distinguishes
  // two payments on the same invoice while still ignoring a retry of the same
  // payment. Invoice lifecycle events omit it (dedup by entity+eventType).
  dedupeKey?: string;
}
