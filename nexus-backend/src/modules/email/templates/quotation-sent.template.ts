import { renderBaseEmail, EmailBranding } from './base-email.template';

export interface QuotationSentEmailData {
  clientName: string;
  quotationNumber: string;
  grandTotal: number;
  subtotal?: number;
  gstAmount?: number;
  currency?: string;
  portalUrl: string;
  resend?: boolean;
  serviceNames?: string[];
}

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

function formatCurrency(amount: number, symbol = '₹'): string {
  return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderQuotationSentEmail(data: QuotationSentEmailData, branding: EmailBranding): string {
  const { clientName, quotationNumber, grandTotal, subtotal, gstAmount, currency, portalUrl, resend, serviceNames } = data;
  const companyName = branding.companyName || 'Nexus';
  const title = resend ? 'Revised Quotation Available' : 'New Quotation';
  const body = resend
    ? `A revised quotation has been prepared for you.`
    : `A new quotation has been prepared for you.`;

  const serviceListHtml = serviceNames && serviceNames.length > 0
    ? `<tr><td colspan="2" style="border-top: 1px solid ${BRAND_BORDER}; padding: 12px 16px;"><p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Services</p><p style="margin: 0; font-size: 14px; color: ${BRAND_TEXT};">${serviceNames.join(' · ')}</p></td></tr>`
    : '';

  const breakdownRows = [
    subtotal ? `<tr><td style="padding: 8px 16px; font-size: 13px; color: ${BRAND_SECONDARY};">Subtotal</td><td style="padding: 8px 16px; font-size: 13px; color: ${BRAND_TEXT}; text-align: right;">${formatCurrency(subtotal, currency)}</td></tr>` : '',
    gstAmount ? `<tr><td style="padding: 8px 16px; font-size: 13px; color: ${BRAND_SECONDARY};">GST</td><td style="padding: 8px 16px; font-size: 13px; color: ${BRAND_TEXT}; text-align: right;">${formatCurrency(gstAmount, currency)}</td></tr>` : '',
  ].filter(Boolean).join('');

  const bodyContent = `
    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY};">${title}</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_SECONDARY};">from ${companyName}</p>

    <p style="margin: 0 0 16px; font-size: 15px; color: ${BRAND_TEXT};">
      Hi ${clientName},
    </p>
    <p style="margin: 0 0 24px; font-size: 15px; color: ${BRAND_TEXT};">
      ${body}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid ${BRAND_BORDER}; border-radius: 6px; overflow: hidden;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT_BG};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Quotation Number</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${quotationNumber}</p>
        </td>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT_BG}; border-left: 1px solid ${BRAND_BORDER};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${formatCurrency(grandTotal, currency)}</p>
        </td>
      </tr>
      ${breakdownRows ? `<tr><td colspan="2" style="border-top: 1px solid ${BRAND_BORDER};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${breakdownRows}</table></td></tr>` : ''}
      ${serviceListHtml}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 32px; background-color: ${BRAND_PRIMARY}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
            View Quotation
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND_SECONDARY}; text-align: center;">
      If you have any questions, reply to this email or contact us at ${branding.supportEmail || branding.phone || 'our support team'}.
    </p>
  `;

  return renderBaseEmail({ branding, preheader: `${title} ${quotationNumber} from ${companyName}` }, bodyContent);
}
