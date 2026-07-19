export interface TransitionInput {
  entityType: 'LEAD_SERVICE' | 'PROJECT_SERVICE';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  actorUserId?: string;
  reason?: string;
  // True when the transition is triggered by backend business logic
  // (quotation sent/rejected/accepted, project created) rather than an
  // Admin's manual status change. Automatic transitions may enter statuses
  // that manual changes are forbidden from, and vice versa.
  isAutomatic?: boolean;
}
