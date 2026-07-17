import { useQuery } from '@tanstack/react-query';
import { timelineService, type GlobalTimelineParams } from '@/services/timelineService';
import { queryKeys } from './keys';

export function useTimeline(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeline(entityType, entityId ?? ''),
    queryFn: () => timelineService.getForEntity(entityType, entityId as string),
    enabled: !!entityId,
  });
}

/** Admin: global business-activity feed. */
export function useGlobalTimeline(params: GlobalTimelineParams) {
  return useQuery({
    queryKey: queryKeys.globalTimeline(params),
    queryFn: () => timelineService.listGlobal(params),
    placeholderData: (prev) => prev,
  });
}
