export interface EmailBranding {
  companyName?: string;
  logoUrl?: string;
  supportEmail?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface BaseEmailOptions {
  branding: EmailBranding;
  preheader?: string;
}

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

export function renderBaseEmail(options: BaseEmailOptions, bodyContent: string): string {
  const { branding, preheader } = options;
  const companyName = branding.companyName || 'Nexus';
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${companyName}" style="height: 36px; max-height: 36px;" />`
    : `<span style="font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">${companyName}</span>`;

  const addressParts = [
    branding.addressLine1,
    branding.addressLine2,
    [branding.city, branding.state, branding.pincode].filter(Boolean).join(', '),
    branding.country,
  ].filter(Boolean);

  const contactParts = [
    branding.phone && `Ph: ${branding.phone}`,
    branding.supportEmail,
  ].filter(Boolean);

  const footerText = [companyName, ...addressParts].filter(Boolean).join(' | ');
  const footerContact = contactParts.join(' | ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_LIGHT_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: ${BRAND_LIGHT_BG};">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_LIGHT_BG};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid ${BRAND_BORDER}; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid ${BRAND_BORDER};">
              ${logoHtml}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: ${BRAND_LIGHT_BG}; border-top: 1px solid ${BRAND_BORDER};">
              <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-align: center;">
                ${footerText}
              </p>
              ${footerContact ? `<p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-align: center;">${footerContact}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: ${BRAND_SECONDARY}; text-align: center;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
