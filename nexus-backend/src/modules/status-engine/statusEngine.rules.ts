// Encodes the exact universal pipeline from the PRD. Every entry lists the
// statuses legally reachable from a given status. SITE VISIT is optional
// and may be skipped - enforced by allowing a direct jump past it, provided
// the caller supplies a reason when the service's site-visit requirement is
// YES or OPTIONAL (checked in statusEngine.service.ts, not here).
export const WORKFLOW_ORDER = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'SITE VISIT',
  'QUOTE PREPARING',
  'QUOTE SENT',
  'NEGOTIATION',
  'APPROVED',
  'PROJECT CREATED',
  'IN PROGRESS',
  'ON HOLD',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_ORDER)[number];

const SKIPPABLE_STATUSES = new Set<WorkflowStatus>(['SITE VISIT']);

// ON HOLD can be entered/exited from IN PROGRESS in either direction - the
// only non-linear step in an otherwise linear pipeline.
const EXTRA_EDGES: Record<string, string[]> = {
  'IN PROGRESS': ['ON HOLD', 'COMPLETED'],
  'ON HOLD': ['IN PROGRESS'],
};

export function isValidTransition(from: string | null, to: string): boolean {
  if (!WORKFLOW_ORDER.includes(to as WorkflowStatus)) return false;

  if (from === null) {
    // A brand-new Lead/Project Service must start at NEW.
    return to === 'NEW';
  }

  if (!WORKFLOW_ORDER.includes(from as WorkflowStatus)) return false;

  const extra = EXTRA_EDGES[from] || [];
  if (extra.includes(to)) return true;

  const fromIndex = WORKFLOW_ORDER.indexOf(from as WorkflowStatus);
  const toIndex = WORKFLOW_ORDER.indexOf(to as WorkflowStatus);

  if (toIndex <= fromIndex) return false;

  // Forward jump is only legal if every skipped stage in between is skippable.
  for (let i = fromIndex + 1; i < toIndex; i++) {
    if (!SKIPPABLE_STATUSES.has(WORKFLOW_ORDER[i])) return false;
  }
  return true;
}

export function isSkippingSiteVisit(from: string | null, to: string): boolean {
  if (from === null) return false;
  const fromIndex = WORKFLOW_ORDER.indexOf(from as WorkflowStatus);
  const toIndex = WORKFLOW_ORDER.indexOf(to as WorkflowStatus);
  const siteVisitIndex = WORKFLOW_ORDER.indexOf('SITE VISIT');
  return fromIndex < siteVisitIndex && toIndex > siteVisitIndex;
}
