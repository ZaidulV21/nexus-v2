import { timelineRepository } from './timeline.repository';
import { auditService } from '../audit/audit.service';
import { RecordEventInput } from './timeline.types';

// Business timeline vs technical events (Problem 9):
//
//   * The business timeline records ONLY business events (invoice created/sent,
//     payment initiated/received, fully paid, receipt generated/available/sent,
//     refund issued, plus the quotation/project/lead/client/service lifecycle
//     events) and is the customer- and admin-facing activity history.
//
//   * TECHNICAL_EVENT_TYPES are low-level implementation events (PDF
//     generated/downloaded, receipt PDF storage, webhook receive/verify, email
//     provider acknowledgement, retries, internal jobs/API calls). They belong
//     ONLY in the Audit Log. recordEvent() routes them there automatically, so
//     they can never land on - or leak from - the business timeline, no matter
//     which caller records them.
//
// Idempotency: an identical business event for the same entity recorded within
// DEDUPE_WINDOW_MS is treated as an accidental duplicate (double-click, page
// re-load, retry) and skipped so every business action appears exactly once.
const DEDUPE_WINDOW_MS = 60_000;

// Low-level / system events that must never be written to the business
// timeline. Any event recorded through recordEvent() that falls in this set is
// redirected to the Audit Log instead (action = event type, description and
// metadata kept in afterState).
const TECHNICAL_EVENT_TYPES = new Set([
  // Payment gateway processing
  'WEBHOOK_RECEIVED',
  'WEBHOOK_VERIFIED',
  // PDF rendering / storage / delivery
  'PDF_GENERATED',
  'PDF_DOWNLOADED',
  'INVOICE_PDF_GENERATED',
  'INVOICE_PDF_DOWNLOADED',
  'RECEIPT_PDF_GENERATED',
  'RECEIPT_PDF_DOWNLOADED',
  'RECEIPT_STORED',
  // Email delivery internals
  'EMAIL_PROVIDER_ACCEPTED',
  'RETRY_ATTEMPT',
  'INTERNAL_API_CALL',
]);

// Client-facing timelines must contain ONLY customer-facing business events.
// This is a WHITELIST, not a blacklist: any event type recorded to the
// business timeline is hidden from the client portal unless it is explicitly
// listed here. Technical events never appear here because recordEvent() routes
// them to the Audit Log before they can reach the timeline at all.
const CLIENT_VISIBLE_EVENT_TYPES = new Set([
  // Invoice lifecycle
  'INVOICE_SENT', // Invoice received by the client
  'INVOICE_CANCELLED', // Invoice cancelled
  'PAYMENT_SUCCESSFUL', // Online payment succeeded
  'PAYMENT_RECORDED', // Offline payment recorded
  'INVOICE_PAID', // Invoice fully paid
  'PARTIAL_PAYMENT', // Partial payment received
  'RECEIPT_AVAILABLE', // Receipt ready to download in the portal
  'RECEIPT_SENT', // Receipt emailed to the client
  'RECEIPT_RESENT', // Receipt re-emailed to the client (re-send)
  'REFUND_PROCESSED', // Refund issued for a payment
  // Quotation lifecycle
  'QUOTATION_SENT',
  'QUOTATION_REVISION_REQUESTED',
  'QUOTATION_ACCEPTED',
  'QUOTATION_REJECTED',
  // Project lifecycle
  'PROJECT_CREATED',
  'PROJECT_COMPLETED',
  'SERVICE_ADDED',
  // Client account
  'CLIENT_ACCOUNT_CREATED',
]);

export interface TimelineViewOptions {
  viewerType?: 'ADMIN' | 'CLIENT';
}

export const timelineService = {
  async recordEvent(input: RecordEventInput) {
    // Technical/system events belong ONLY in the Audit Log - they are never
    // written to the business timeline (and therefore can never reach clients).
    if (TECHNICAL_EVENT_TYPES.has(input.eventType)) {
      return auditService.recordAudit({
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.eventType,
        actorUserId: input.actorUserId,
        afterState: {
          description: input.description,
          ...(input.metadata ?? {}),
        },
      });
    }

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
      return events.filter((event) => CLIENT_VISIBLE_EVENT_TYPES.has(event.eventType));
    }
    return events;
  },

  async getGlobalTimeline(params: { skip: number; take: number; entityType?: string; search?: string }) {
    return timelineRepository.listGlobal(params);
  },
};
