import { useQuery } from '@tanstack/react-query';
import { timelineService } from '@/services/timelineService';
import { queryKeys } from './keys';

export function useTimeline(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeline(entityType, entityId ?? ''),
    queryFn: () => timelineService.getForEntity(entityType, entityId as string),
    enabled: !!entityId,
  });
}
