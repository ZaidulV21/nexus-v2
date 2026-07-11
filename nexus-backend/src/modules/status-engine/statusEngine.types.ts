export interface TransitionInput {
  entityType: 'LEAD_SERVICE' | 'PROJECT_SERVICE';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId?: string;
  reason?: string;
}
