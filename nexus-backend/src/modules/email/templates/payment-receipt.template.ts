import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#059669';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

function formatCurrency(amount: number, symbol = '₹'): string {
  return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface PaymentReceiptEmailData {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod?: string;
  portalUrl: string;
}

export function renderPaymentReceiptEmail(data: PaymentReceiptEmailData, branding: EmailBranding): string {
  const { clientName, invoiceNumber, amount, currency, paymentDate, paymentMethod, portalUrl } = data;
  const companyName = branding.companyName || 'Nexus';

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">Payment Receipt</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">from ${companyName}</p>

    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND_TEXT};">
      Hi ${clientName},
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      We have received your payment. Thank you!
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid ${BRAND_BORDER}; border-radius: 6px; overflow: hidden;">
      <tr>
        <td style="padding: 16px; background-color: #ecfdf5;">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Amount Received</p>
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${BRAND_PRIMARY};">${formatCurrency(amount, currency)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; border-top: 1px solid ${BRAND_BORDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 4px 0;">
                <span style="font-size: 13px; color: ${BRAND_SECONDARY};">Invoice:</span>
                <span style="font-size: 13px; color: ${BRAND_TEXT}; font-weight: 600;">${invoiceNumber}</span>
              </td>
            </tr>
            ${paymentDate ? `
            <tr>
              <td style="padding: 4px 0;">
                <span style="font-size: 13px; color: ${BRAND_SECONDARY};">Date:</span>
                <span style="font-size: 13px; color: ${BRAND_TEXT}; font-weight: 600;">${paymentDate}</span>
              </td>
            </tr>` : ''}
            ${paymentMethod ? `
            <tr>
              <td style="padding: 4px 0;">
                <span style="font-size: 13px; color: ${BRAND_SECONDARY};">Method:</span>
                <span style="font-size: 13px; color: ${BRAND_TEXT}; font-weight: 600;">${paymentMethod}</span>
              </td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${BRAND_PRIMARY}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            View Invoice
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If you have any questions, reply to this email or contact us at ${branding.supportEmail || branding.phone || 'our support team'}.
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `Payment receipt for ${invoiceNumber} — ${formatCurrency(amount, currency)}` }, bodyContent);
}
