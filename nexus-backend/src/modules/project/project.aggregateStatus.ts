// Pure function: Project Services in -> derived aggregate label out.
// Never stored, always computed - this guarantees Project-level status can
// never drift out of sync with its underlying Project Services (PRD 4.4).
export interface ProjectServiceLike {
  status: string;
}

export function computeAggregateStatus(projectServices: ProjectServiceLike[]): string {
  if (projectServices.length === 0) return 'NO SERVICES';

  const allCompleted = projectServices.every((ps) => ['COMPLETED', 'CLOSED', 'ARCHIVED'].includes(ps.status));
  if (allCompleted) return 'Completed';

  const anyOnHold = projectServices.some((ps) => ps.status === 'ON HOLD');
  const runningCount = projectServices.filter(
    (ps) => !['COMPLETED', 'CLOSED', 'ARCHIVED'].includes(ps.status)
  ).length;

  if (anyOnHold) return `On Hold (${runningCount} service(s) active)`;

  return `Active (${runningCount} Service${runningCount === 1 ? '' : 's'} Running)`;
}
