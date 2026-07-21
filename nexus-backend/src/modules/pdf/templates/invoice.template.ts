import PDFDocument from 'pdfkit';
import type { CompanyBrandingData, PdfInvoiceData } from '../pdf.types';
import { BASE_TEMPLATE, formatCurrency, formatDate } from './base.template';

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

const {
  MARGIN_LEFT,
  MARGIN_RIGHT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_BORDER,
  BRAND_TEXT,
  BRAND_LIGHT_BG,
} = BASE_TEMPLATE;

const STATUS_WATERMARK_COLORS: Record<string, string> = {
  CANCELLED: '#dc2626',
  PAID: '#16a34a',
  'PARTIALLY PAID': '#d97706',
};

export function renderInvoicePdf(
  doc: PDFDocumentInstance,
  branding: CompanyBrandingData,
  data: PdfInvoiceData
) {
  const symbol = branding.currencySymbol || '₹';

  let y = BASE_TEMPLATE.drawHeader(doc, branding);

  const meta = [
    `Date: ${formatDate(data.issuedAt)}`,
    `Status: ${data.displayStatus}`,
  ];
  if (data.projectNumber) meta.push(`Project: ${data.projectNumber}`);

  y = BASE_TEMPLATE.drawDocumentTitle(doc, 'INVOICE', data.invoiceNumber, y, meta);

  if (data.label) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(BRAND_SECONDARY);
    doc.text(data.label, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
    y += 14;
  }

  y = drawRecipientBlock(doc, data.recipient, y);

  const hasHsn = data.items.some((item) => item.hsnSacCode);
  const colWidths = hasHsn ? [170, 60, 50, 60, 60, 70] : [210, 60, 70, 70, 80];
  const headers = hasHsn
    ? ['Description', 'Qty', 'HSN/SAC', 'Rate', 'Tax %', 'Amount']
    : ['Description', 'Qty', 'Rate', 'Tax %', 'Amount'];

  const rows = data.items.map((item) => {
    if (hasHsn) {
      return [
        item.description,
        String(item.quantity),
        item.hsnSacCode || '',
        formatCurrency(item.unitPrice, symbol),
        `${item.taxRate}%`,
        formatCurrency(item.lineTotal, symbol),
      ];
    }
    return [
      item.description,
      String(item.quantity),
      formatCurrency(item.unitPrice, symbol),
      `${item.taxRate}%`,
      formatCurrency(item.lineTotal, symbol),
    ];
  });

  y = BASE_TEMPLATE.drawTable(doc, headers, rows, y, colWidths);

  y += 5;
  y = BASE_TEMPLATE.drawAmountInWords(doc, data.grandTotal, branding.currency || 'INR', y);

  y += 5;

  const totals: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Subtotal', value: formatCurrency(data.subtotal, symbol) },
    { label: 'GST', value: formatCurrency(data.gstAmount, symbol) },
    { label: 'Grand Total', value: formatCurrency(data.grandTotal, symbol), bold: true },
  ];

  if (data.paidAmount > 0) {
    totals.push({ label: 'Amount Paid', value: formatCurrency(data.paidAmount, symbol) });
    totals.push({ label: 'Outstanding', value: formatCurrency(data.outstandingAmount, symbol) });
  }

  y = BASE_TEMPLATE.drawTotals(doc, totals, y);

  y = BASE_TEMPLATE.drawBankDetails(doc, branding, y);

  y = BASE_TEMPLATE.drawSignatureAndStamp(doc, branding, y);

  const watermarkColor = STATUS_WATERMARK_COLORS[data.displayStatus];
  if (watermarkColor) {
    BASE_TEMPLATE.drawWatermark(doc, data.displayStatus, watermarkColor);
  }

  BASE_TEMPLATE.drawFooter(doc, branding);
}

function drawRecipientBlock(
  doc: PDFDocumentInstance,
  recipient: PdfInvoiceData['recipient'],
  y: number
) {
  doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND_SECONDARY);
  doc.text('Bill To:', MARGIN_LEFT, y);

  y += 12;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_TEXT);
  doc.text(recipient.contactName, MARGIN_LEFT, y);

  if (recipient.companyName) {
    y += 13;
    doc.fontSize(9).font('Helvetica').fillColor(BRAND_TEXT);
    doc.text(recipient.companyName, MARGIN_LEFT, y);
  }

  if (recipient.gstin) {
    y += 12;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    doc.text(`GSTIN: ${recipient.gstin}`, MARGIN_LEFT, y);
  }

  const details: string[] = [];
  if (recipient.email) details.push(recipient.email);
  if (recipient.phone) details.push(recipient.phone);
  if (details.length > 0) {
    y += 12;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    doc.text(details.join(' | '), MARGIN_LEFT, y);
  }

  return y + 14;
}
