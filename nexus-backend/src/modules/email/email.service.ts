import { Resend } from 'resend';
import { env } from '../../config/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export const emailService = {
  async send(input: SendEmailInput): Promise<{ id: string } | null> {
    const client = getClient();
    if (!client) {
      // eslint-disable-next-line no-console
      console.warn('[email] Resend not configured (RESEND_API_KEY missing) — skipping send');
      return null;
    }

    try {
      const result = await client.emails.send({
        from: input.from || env.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      });

      if (result.error) {
        // eslint-disable-next-line no-console
        console.error('[email] Resend API error:', result.error);
        return null;
      }

      // eslint-disable-next-line no-console
      console.log(`[email] Sent successfully id=${result.data?.id} to=${input.to}`);
      return { id: result.data?.id || '' };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[email] Send failed:', err instanceof Error ? err.message : err);
      return null;
    }
  },
};
