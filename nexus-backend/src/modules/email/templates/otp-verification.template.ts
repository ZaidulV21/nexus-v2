import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export interface OtpVerificationEmailData {
  otp: string;
  expiryMinutes: number;
  portalUrl: string;
}

export function renderOtpVerificationEmail(data: OtpVerificationEmailData, branding: EmailBranding): string {
  const { otp, expiryMinutes, portalUrl } = data;
  const companyName = branding.companyName || 'Nexus';

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Verify Your Email</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">A verification code has been sent to your email address</p>

    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      Use the following code to verify your email address and complete your account setup:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 24px; background-color: ${BRAND_LIGHT_BG}; border: 2px dashed ${BRAND_BORDER}; border-radius: 8px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; color: ${BRAND_PRIMARY}; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${otp}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;">
          <p style="margin: 0; font-size: 13px; color: #92400e;">
            <strong>This code expires in ${expiryMinutes} minutes.</strong> If you did not request this code, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 6px;">
          <p style="margin: 0; font-size: 13px; color: #166534;">
            <strong>Security notice:</strong> Never share this code with anyone. ${companyName} will never ask for your verification code over the phone or via email.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If you have any questions, reply to this email or contact us at ${branding.supportEmail || branding.phone || 'our support team'}.
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `Your ${companyName} verification code is ${otp}` }, bodyContent);
}
