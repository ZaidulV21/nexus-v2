import { api } from '@/lib/api';
import type { AuditLogEntry } from '@/types';

export interface GlobalAuditParams {
  page?: number;
  pageSize?: number;
  search?: string;
  entityType?: string;
  action?: string;
}

export const auditService = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<AuditLogEntry[]>(`/audit-logs/${entityType}/${entityId}`),

  /** Admin: global technical log, newest first. */
  listGlobal: (params: GlobalAuditParams) =>
    api.getPaginated<AuditLogEntry>('/audit-logs', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      entityType: params.entityType,
      action: params.action,
    }),
};
