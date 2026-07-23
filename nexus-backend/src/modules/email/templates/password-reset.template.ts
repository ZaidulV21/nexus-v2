import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export interface PasswordResetEmailData {
  clientName: string;
  resetUrl: string;
  expiryMinutes: number;
}

export function renderPasswordResetEmail(data: PasswordResetEmailData, branding: EmailBranding): string {
  const { clientName, resetUrl, expiryMinutes } = data;
  const companyName = branding.companyName || 'Nexus';

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Reset Your Password</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">A password reset request was made for your account</p>

    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND_TEXT};">
      Hi ${clientName},
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      We received a request to reset the password for your ${companyName} Client Portal account. Click the button below to create a new password:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${BRAND_PRIMARY}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
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
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>Security notice:</strong> Never share this link with anyone. ${companyName} will never ask for your password or reset link.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <span style="word-break: break-all; color: ${BRAND_PRIMARY};">${resetUrl}</span>
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `Reset your ${companyName} Client Portal password` }, bodyContent);
}
