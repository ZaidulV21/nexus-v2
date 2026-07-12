import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/auditService';
import { queryKeys } from './keys';

export function useAuditLogs(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditLogs(entityType, entityId ?? ''),
    queryFn: () => auditService.getForEntity(entityType, entityId as string),
    enabled: !!entityId,
  });
}
