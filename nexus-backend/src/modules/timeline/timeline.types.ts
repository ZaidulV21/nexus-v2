export interface RecordEventInput {
  entityType: string;
  entityId: string;
  eventType: string;
  description: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}
