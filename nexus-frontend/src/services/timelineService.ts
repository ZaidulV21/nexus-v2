import { api } from '@/lib/api';
import type { TimelineEvent } from '@/types';

export const timelineService = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<TimelineEvent[]>(`/timeline/${entityType}/${entityId}`),
};
