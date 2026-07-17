import { timelineRepository } from './timeline.repository';
import { RecordEventInput } from './timeline.types';

// The single function every other module's service layer calls at the
// "Timeline Entry" step of the mandatory action lifecycle.
export const timelineService = {
  async recordEvent(input: RecordEventInput) {
    return timelineRepository.create(input);
  },

  async getTimelineFor(entityType: string, entityId: string) {
    return timelineRepository.listForEntity(entityType, entityId);
  },

  async getGlobalTimeline(params: { skip: number; take: number; entityType?: string; search?: string }) {
    return timelineRepository.listGlobal(params);
  },
};
