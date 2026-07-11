export interface EmitEventInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  recipient: string;
}
