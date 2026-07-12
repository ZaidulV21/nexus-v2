import { api } from '@/lib/api';
import type { AuditLogEntry } from '@/types';

export const auditService = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<AuditLogEntry[]>(`/audit-logs/${entityType}/${entityId}`),
};
