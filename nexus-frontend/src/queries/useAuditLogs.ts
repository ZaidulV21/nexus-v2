import { useQuery } from '@tanstack/react-query';
import { auditService, type GlobalAuditParams } from '@/services/auditService';
import { queryKeys } from './keys';

export function useAuditLogs(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditLogs(entityType, entityId ?? ''),
    queryFn: () => auditService.getForEntity(entityType, entityId as string),
    enabled: !!entityId,
  });
}

/** Admin: global technical log. */
export function useGlobalAuditLogs(params: GlobalAuditParams) {
  return useQuery({
    queryKey: queryKeys.globalAuditLogs(params),
    queryFn: () => auditService.listGlobal(params),
    placeholderData: (prev) => prev,
  });
}
