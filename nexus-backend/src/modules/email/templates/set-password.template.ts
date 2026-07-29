import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export interface SetPasswordEmailData {
  clientName: string;
  loginEmail: string;
  setupUrl: string;
  expiryMinutes: number;
}

export function renderSetPasswordEmail(data: SetPasswordEmailData, branding: EmailBranding): string {
  const { clientName, loginEmail, setupUrl, expiryMinutes } = data;
  const companyName = branding.companyName || 'Nexus';

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Your Account Has Been Created</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">Set your password to access the Client Portal</p>

    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND_TEXT};">
      Hello ${clientName},
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      A client account has been created for you on the ${companyName} platform. Click the button below to set your password and access the Client Portal:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${setupUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${BRAND_PRIMARY}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            Set Your Password
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT_BG}; border: 1px solid ${BRAND_BORDER}; border-radius: 6px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Login Email</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${loginEmail}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px; background-color: ${BRAND_LIGHT_BG}; border: 1px solid ${BRAND_BORDER}; border-radius: 6px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: ${BRAND_SECONDARY};">
            <strong>This link expires in ${expiryMinutes} minutes.</strong>
          </p>
          <p style="margin: 0; font-size: 13px; color: ${BRAND_SECONDARY};">
            If you did not expect this email, you can safely ignore it. No account will be created without setting a password.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Security notice:</strong> Never share this link with anyone. ${companyName} will never ask for your password or setup link.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <span style="word-break: break-all; color: ${BRAND_PRIMARY};">${setupUrl}</span>
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `Set your ${companyName} Client Portal password` }, bodyContent);
}
