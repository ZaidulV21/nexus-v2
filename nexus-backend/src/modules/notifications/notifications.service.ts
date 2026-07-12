import { notificationsRepository } from './notifications.repository';
import { notificationsDispatcher } from './notifications.dispatcher';
import { EmitEventInput } from './notifications.types';

const KNOWN_EVENT_TYPES = new Set([
  'lead.created',
  'quotation.sent',
  'quotation.approved',
  'quotation.accepted',
  'quotation.rejected',
  'client.account.created',
  'invoice.issued',
  'invoice.cancelled',
  'payment.recorded',
  'project.completed',
  'message.received',
]);

// The single function every other module's service layer calls at the
// "Notification Event" step of the mandatory action lifecycle. Never call
// an email library directly from a controller or service outside this module.
export const notificationsService = {
  async emitEvent(input: EmitEventInput) {
    if (!KNOWN_EVENT_TYPES.has(input.eventType)) {
      // Unknown event types are logged, not thrown - a notification issue
      // must never roll back or block the business transaction that triggered it.
      // eslint-disable-next-line no-console
      console.warn(`[notifications] Unknown event type ignored: ${input.eventType}`);
      return;
    }

    const event = await notificationsRepository.createEvent({
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload as any,
    });

    try {
      await notificationsDispatcher.dispatch('EMAIL', input.recipient, input.payload);
      await notificationsRepository.createLog({
        notificationEventId: event.id,
        channel: 'EMAIL',
        recipient: input.recipient,
        status: 'SENT',
        sentAt: new Date(),
      });
    } catch (err) {
      // Failure is logged, never re-thrown - must not roll back the caller's transaction.
      await notificationsRepository.createLog({
        notificationEventId: event.id,
        channel: 'EMAIL',
        recipient: input.recipient,
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  async getLogs() {
    return notificationsRepository.listLogs();
  },
};
