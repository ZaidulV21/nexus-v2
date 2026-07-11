import { NotificationChannel } from './channel.interface';

// V1's only real channel. Future channels (WhatsApp, SMS, Push) implement
// the same NotificationChannel interface and are added to the dispatcher's
// channel map - no other module changes when that happens.
export const emailChannel: NotificationChannel = {
  name: 'EMAIL',
  async send(recipient: string, payload: Record<string, unknown>) {
    // Placeholder send implementation - wire to a real provider (SES, SendGrid,
    // SMTP) at deployment time. Intentionally isolated here so swapping the
    // provider never touches any calling module.
    // eslint-disable-next-line no-console
    console.log(`[EMAIL] to=${recipient}`, payload);
  },
};
