import { renderBaseEmail, EmailBranding } from './base-email.template';

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_TEXT = '#111827';
const BRAND_BORDER = '#e5e7eb';
const BRAND_LIGHT_BG = '#f9fafb';

function formatCurrency(amount: number, symbol = '₹'): string {
  return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface InvoiceSentEmailData {
  clientName: string;
  invoiceNumber: string;
  grandTotal: number;
  currency?: string;
  portalUrl: string;
  resend?: boolean;
  outstandingAmount?: number;
  dueDate?: string;
}

export function renderInvoiceSentEmail(data: InvoiceSentEmailData, branding: EmailBranding): string {
  const { clientName, invoiceNumber, grandTotal, currency, portalUrl, resend, outstandingAmount, dueDate } = data;
  const companyName = branding.companyName || 'Nexus';
  const title = resend ? 'Invoice Reminder' : 'New Invoice';
  const body = resend
    ? `This is a friendly reminder that the following invoice is awaiting payment.`
    : `A new invoice has been issued for your review.`;

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
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${invoiceNumber}</p>
        </td>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT_BG}; border-left: 1px solid ${BRAND_BORDER};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${formatCurrency(grandTotal, currency)}</p>
        </td>
      </tr>
      ${outstandingAmount !== undefined && outstandingAmount < grandTotal ? `
      <tr>
        <td style="padding: 16px; border-top: 1px solid ${BRAND_BORDER};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Outstanding Amount</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #dc2626;">${formatCurrency(outstandingAmount, currency)}</p>
        </td>
        ${dueDate ? `
        <td style="padding: 16px; border-top: 1px solid ${BRAND_BORDER}; border-left: 1px solid ${BRAND_BORDER};">
          <p style="margin: 0 0 4px; font-size: 12px; color: ${BRAND_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: ${BRAND_TEXT};">${dueDate}</p>
        </td>` : ''}
      </tr>` : ''}
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

  return renderBaseEmail({ branding, preheader: `${title} ${invoiceNumber} from ${companyName}` }, bodyContent);
}
