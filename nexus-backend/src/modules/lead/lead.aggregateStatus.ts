// Pure function: Lead Services in -> derived aggregate label out.
// Never stored, always computed - this guarantees Lead-level status can
// never drift out of sync with its underlying Lead Services.
export interface LeadServiceLike {
  status: string;
}

// PROJECT CREATED is the terminal "done" status for Lead Services (the
// hand-off to Project execution). Services at this stage are excluded from
// the active count.
export const DONE_LEAD_SERVICE_STATUSES = new Set(['PROJECT CREATED']);

export function computeLeadAggregateStatus(leadServices: LeadServiceLike[]): string {
  if (leadServices.length === 0) return 'NO SERVICES';

  const active = leadServices.filter((ls) => !DONE_LEAD_SERVICE_STATUSES.has(ls.status));
  if (active.length === 0) return 'All Converted';

  const allNew = active.every((ls) => ls.status === 'NEW');
  if (allNew && leadServices.length === active.length) return 'New';

  const convertedCount = leadServices.length - active.length;
  if (convertedCount > 0) {
    return `${convertedCount} of ${leadServices.length} Converted`;
  }

  return `Active (${active.length} Service${active.length === 1 ? '' : 's'} in Pipeline)`;
}
