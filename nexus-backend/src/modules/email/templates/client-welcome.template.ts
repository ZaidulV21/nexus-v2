import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export interface ClientWelcomeEmailData {
  clientName: string;
  loginEmail: string;
  tempPassword: string;
  portalUrl: string;
}

export function renderClientWelcomeEmail(data: ClientWelcomeEmailData, branding: EmailBranding): string {
  const { clientName, loginEmail, tempPassword, portalUrl } = data;
  const companyName = branding.companyName || 'Nexus';

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Welcome to ${companyName}</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">Your client portal account is ready</p>

    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND_TEXT};">
      Hi ${clientName},
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      Your account has been created. You can now log in to the client portal to view quotations, invoices, and project updates.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid ${BRAND_BORDER}; border-radius: 6px; overflow: hidden;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT_BG};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Login Email</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${loginEmail}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; border-top: 1px solid ${BRAND_BORDER};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT}; font-family: 'Courier New', Courier, monospace; background-color: ${BRAND_LIGHT_BG}; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPassword}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${BRAND_PRIMARY}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            Login to Portal
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Security note:</strong> For your protection, please change your password after your first login.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If you have any questions, reply to this email or contact us at ${branding.supportEmail || branding.phone || 'our support team'}.
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `Your ${companyName} client portal account is ready` }, bodyContent);
}
