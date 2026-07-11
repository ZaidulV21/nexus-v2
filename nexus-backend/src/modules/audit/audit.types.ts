export interface RecordAuditInput {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}
