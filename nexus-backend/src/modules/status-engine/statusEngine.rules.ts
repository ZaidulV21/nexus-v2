// Encodes the two business pipelines. The Lead pipeline (sales) and the
// Project pipeline (execution) are separate: a Lead Service can never carry
// an execution status, and a Project Service can never carry a sales
// status. PROJECT CREATED is the hand-off point - the terminal state of the
// Lead pipeline and the system-assigned starting state of the Project
// pipeline.

// --------------------------------------------------------------------------
// LEAD pipeline (Lead Services)
// --------------------------------------------------------------------------
export const LEAD_WORKFLOW_ORDER = [
  'NEW',
  'CONTACTED',
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE PREPARING',
  'QUOTE SENT',
  'NEGOTIATION',
  'APPROVED',
  'PROJECT CREATED',
] as const;

// The sales stages an Admin may set by hand. QUOTE SENT is exclusively
// workflow-driven (quotation created/sent), and PROJECT CREATED is the
// system-assigned hand-off when a Project is created - neither ever appears
// in a manual dropdown.
export const MANUAL_LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE PREPARING',
  'NEGOTIATION',
  'APPROVED',
] as const;

// Statuses only backend workflow events may assign, never an Admin.
export const AUTOMATIC_ONLY_LEAD_STATUSES = ['QUOTE SENT', 'PROJECT CREATED'] as const;

// Statuses workflow events (quotation sent/rejected/accepted, project
// created) may drive a Lead Service to. NEGOTIATION and APPROVED are in
// both sets: an Admin may also set them by hand (e.g. phone negotiation).
export const AUTOMATIC_LEAD_STATUSES = [
  'QUOTE SENT',
  'NEGOTIATION',
  'APPROVED',
  'PROJECT CREATED',
] as const;

// --------------------------------------------------------------------------
// PROJECT pipeline (Project Services)
// --------------------------------------------------------------------------
export const PROJECT_WORKFLOW_ORDER = [
  'PROJECT CREATED',
  'PLANNING',
  'RESOURCES ASSIGNED',
  'WORK STARTED',
  'IN PROGRESS',
  'ON HOLD',
  'QUALITY INSPECTION',
  'COMPLETED',
  'HANDOVER',
  'CLOSED',
] as const;

// Statuses an Admin may manually move a Project Service to. PROJECT CREATED
// is the system-assigned starting point, never a manual target. CANCELLED
// is a terminal exit reachable from any pre-completion execution status.
export const MANUAL_PROJECT_STATUSES = [
  'PLANNING',
  'RESOURCES ASSIGNED',
  'WORK STARTED',
  'IN PROGRESS',
  'ON HOLD',
  'QUALITY INSPECTION',
  'COMPLETED',
  'HANDOVER',
  'CLOSED',
  'CANCELLED',
] as const;

export type WorkflowEntityType = 'LEAD_SERVICE' | 'PROJECT_SERVICE';

// Stages a forward move may jump over. Site-visit stages are optional (a
// recorded reason is required - see isSkippingSiteVisit); QUOTE SENT is
// passed over when an Admin manually records a NEGOTIATION or APPROVED
// reached outside the portal workflow.
const SKIPPABLE_LEAD_STATUSES = new Set<string>([
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE SENT',
]);

// Skipping these specific stages requires a recorded reason.
const SITE_VISIT_STAGES = new Set<string>(['SITE VISIT SCHEDULED', 'SITE VISIT COMPLETED']);

// Execution stages are checkpoints, not a forced march - any forward move
// is legal (services may not need every checkpoint), but never backward.
// ON HOLD is situational: it can be entered from any active stage and
// exited back to where work resumes.
const PROJECT_ACTIVE_STATUSES = [
  'PROJECT CREATED',
  'PLANNING',
  'RESOURCES ASSIGNED',
  'WORK STARTED',
  'IN PROGRESS',
  'QUALITY INSPECTION',
] as const;

const PROJECT_EXTRA_EDGES: Record<string, string[]> = {
  // Exiting a hold resumes wherever the work actually is.
  'ON HOLD': ['PLANNING', 'RESOURCES ASSIGNED', 'WORK STARTED', 'IN PROGRESS', 'QUALITY INSPECTION', 'CANCELLED'],
};
for (const status of PROJECT_ACTIVE_STATUSES) {
  PROJECT_EXTRA_EDGES[status] = [...(PROJECT_EXTRA_EDGES[status] ?? []), 'ON HOLD', 'CANCELLED'];
}

function isForwardMove(order: readonly string[], skippable: Set<string>, from: string, to: string): boolean {
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  if (toIndex <= fromIndex) return false;
  // Forward jump is only legal if every skipped stage in between is skippable.
  for (let i = fromIndex + 1; i < toIndex; i++) {
    if (!skippable.has(order[i])) return false;
  }
  return true;
}

export function isValidTransition(entityType: WorkflowEntityType, from: string | null, to: string): boolean {
  if (entityType === 'LEAD_SERVICE') {
    if (from === null) return to === 'NEW';
    return isForwardMove(LEAD_WORKFLOW_ORDER, SKIPPABLE_LEAD_STATUSES, from, to);
  }

  // PROJECT_SERVICE
  if (from === null) return to === 'PROJECT CREATED';
  if ((PROJECT_EXTRA_EDGES[from] || []).includes(to)) return true;
  const fromIndex = PROJECT_WORKFLOW_ORDER.indexOf(from as any);
  const toIndex = PROJECT_WORKFLOW_ORDER.indexOf(to as any);
  if (fromIndex === -1 || toIndex === -1) return false;
  // Any forward execution move is legal; ON HOLD is only entered via the
  // explicit edges above, never as a "forward stage".
  return toIndex > fromIndex && to !== 'ON HOLD';
}

// Transitions performed by backend workflow events (quotation created/sent,
// rejected, revision requested, approved/accepted, project created) rather
// than an Admin. Lead-pipeline only. Forward jumps over any manual stage
// are fine, and NEGOTIATION -> QUOTE SENT is the one legal backward move so
// a revised quotation can be re-sent after a rejection.
export function isValidAutomaticTransition(from: string | null, to: string): boolean {
  if (!(AUTOMATIC_LEAD_STATUSES as readonly string[]).includes(to)) return false;
  if (from === null) return false;
  if (from === 'NEGOTIATION' && to === 'QUOTE SENT') return true;

  const fromIndex = LEAD_WORKFLOW_ORDER.indexOf(from as any);
  const toIndex = LEAD_WORKFLOW_ORDER.indexOf(to as any);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}

export function isSkippingSiteVisit(from: string | null, to: string): boolean {
  if (from === null) return false;
  const fromIndex = LEAD_WORKFLOW_ORDER.indexOf(from as any);
  const toIndex = LEAD_WORKFLOW_ORDER.indexOf(to as any);
  if (fromIndex === -1 || toIndex === -1) return false;
  // Skips a site-visit stage if any stage strictly between from and to is one.
  for (let i = fromIndex + 1; i < toIndex; i++) {
    if (SITE_VISIT_STAGES.has(LEAD_WORKFLOW_ORDER[i])) return true;
  }
  return false;
}
