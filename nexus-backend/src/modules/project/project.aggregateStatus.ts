// Pure function: Project Services in -> derived aggregate label out.
// Never stored, always computed - this guarantees Project-level status can
// never drift out of sync with its underlying Project Services (PRD 4.4).
export interface ProjectServiceLike {
  status: string;
}

// COMPLETED is the only terminal "done" status for aggregation; CANCELLED
// services are excluded from the running count.
export const DONE_PROJECT_SERVICE_STATUSES = new Set(['COMPLETED']);

export function computeAggregateStatus(projectServices: ProjectServiceLike[]): string {
  if (projectServices.length === 0) return 'NO SERVICES';

  const active = projectServices.filter((ps) => ps.status !== 'CANCELLED');
  if (active.length === 0) return 'Cancelled';

  const allDone = active.every((ps) => DONE_PROJECT_SERVICE_STATUSES.has(ps.status));
  if (allDone) return 'Completed';

  const anyOnHold = active.some((ps) => ps.status === 'ON HOLD');
  const runningCount = active.filter((ps) => !DONE_PROJECT_SERVICE_STATUSES.has(ps.status)).length;

  if (anyOnHold) return `On Hold (${runningCount} service(s) active)`;

  return `Active (${runningCount} Service${runningCount === 1 ? '' : 's'} Running)`;
}
