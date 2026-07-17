import { api } from '@/lib/api';
import type { TimelineEvent } from '@/types';

export interface GlobalTimelineParams {
  page?: number;
  pageSize?: number;
  search?: string;
  entityType?: string;
}

export const timelineService = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<TimelineEvent[]>(`/timeline/${entityType}/${entityId}`),

  /** Admin: global business-activity feed, newest first. */
  listGlobal: (params: GlobalTimelineParams) =>
    api.getPaginated<TimelineEvent>('/timeline', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      entityType: params.entityType,
    }),
};
