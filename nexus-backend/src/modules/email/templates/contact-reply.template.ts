import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export interface ContactReplyEmailData {
  name: string;
  subject: string;
  replyBody: string;
  originalMessage: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders the email an admin sends back to a support message. The visitor's
 * original text is included below the reply so the exchange stays in context.
 * Everything is HTML-escaped - the visitor's message is never trusted markup.
 */
export function renderContactReplyEmail(data: ContactReplyEmailData, branding: EmailBranding): string {
  const companyName = branding.companyName || 'Nexus';
  const replyBody = escapeHtml(data.replyBody).replace(/\n/g, '<br/>');
  const originalMessage = escapeHtml(data.originalMessage).replace(/\n/g, '<br/>');

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Re: ${escapeHtml(data.subject)}</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">
      Hi ${escapeHtml(data.name) || 'there'}, thank you for reaching out to ${companyName}.
    </p>

    <div style="margin-bottom: 24px; padding: 16px; background-color: ${BRAND_LIGHT_BG}; border-left: 4px solid ${BRAND_PRIMARY}; border-radius: 6px;">
      <p style="margin: 0; font-size: 15px; color: ${BRAND_TEXT}; line-height: 1.6;">${replyBody}</p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px; border: 1px solid ${BRAND_BORDER}; border-radius: 6px;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">Your original message</p>
          <p style="margin: 0; font-size: 13px; color: ${BRAND_SECONDARY}; line-height: 1.6;">${originalMessage}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY};">
      Need anything else? Just reply to this email and we'll pick it right up.
    </p>
  `;

  return renderBaseEmail(
    { branding, preheader: `Re: ${data.subject}` },
    bodyContent,
  );
}
