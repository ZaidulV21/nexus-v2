import { NotificationChannel } from './channel.interface';
import { companyService } from '../../company/company.service';

// V1's only real channel. Future channels (WhatsApp, SMS, Push) implement
// the same NotificationChannel interface and are added to the dispatcher's
// channel map - no other module changes when that happens.
export const emailChannel: NotificationChannel = {
  name: 'EMAIL',
  async send(recipient: string, payload: Record<string, unknown>) {
    // Read company settings for branding data so every email sent by the
    // system carries the correct company name, logo, and sender information.
    let branding: Record<string, unknown> = {};
    try {
      const settings = await companyService.get();
      branding = {
        companyName: settings.companyName,
        logoUrl: settings.logoUrl,
        senderName: settings.senderName,
        replyToEmail: settings.replyToEmail,
        supportEmail: settings.supportEmail,
        email: settings.email,
        phone: settings.phone,
        addressLine1: settings.addressLine1,
        addressLine2: settings.addressLine2,
        city: settings.city,
        state: settings.state,
        country: settings.country,
        pincode: settings.pincode,
      };
    } catch {
      // Non-critical: proceed without branding if settings fetch fails
    }

    // Placeholder send implementation - wire to a real provider (SES, SendGrid,
    // SMTP) at deployment time. Intentionally isolated here so swapping the
    // provider never touches any calling module.
    // eslint-disable-next-line no-console
    console.log(`[EMAIL] to=${recipient}`, { ...payload, branding });
  },
};
