import { timelineRepository } from './timeline.repository';
import { RecordEventInput } from './timeline.types';

// Business timeline: only BUSINESS events are recorded here. System events
// (PDF generated/downloaded, email rendering, webhook verification, etc.)
// belong in the Audit Log and are never recorded on the timeline.
//
// Idempotency: an identical business event for the same entity recorded within
// DEDUPE_WINDOW_MS is treated as an accidental duplicate (double-click, page
// re-load, retry) and skipped so every business action appears exactly once.
const DEDUPE_WINDOW_MS = 60_000;

// Client-facing timelines must never expose internal/admin-only events. The
// client portal only renders business events that matter to the client; every
// other event type (created/resent by staff, system events) stays invisible.
const CLIENT_HIDDEN_EVENT_TYPES = new Set(['INVOICE_CREATED', 'INVOICE_RESENT']);

export interface TimelineViewOptions {
  viewerType?: 'ADMIN' | 'CLIENT';
}

export const timelineService = {
  async recordEvent(input: RecordEventInput) {
    const existing = await timelineRepository.findRecentDuplicate(
      input.entityType,
      input.entityId,
      input.eventType,
      DEDUPE_WINDOW_MS
    );
    if (existing) return existing;
    return timelineRepository.create(input);
  },

  async getTimelineFor(entityType: string, entityId: string, options?: TimelineViewOptions) {
    const events = await timelineRepository.listForEntity(entityType, entityId);
    if (options?.viewerType === 'CLIENT') {
      return events.filter((event) => !CLIENT_HIDDEN_EVENT_TYPES.has(event.eventType));
    }
    return events;
  },

  async getGlobalTimeline(params: { skip: number; take: number; entityType?: string; search?: string }) {
    return timelineRepository.listGlobal(params);
  },
};
