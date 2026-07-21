import PDFDocument from 'pdfkit';
import type { CompanyBrandingData, PdfQuotationData } from '../pdf.types';
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SENT: '#2563eb',
  APPROVED: '#16a34a',
  NEGOTIATION: '#d97706',
  ACCEPTED: '#059669',
  REJECTED: '#dc2626',
};

export function renderQuotationPdf(
  doc: PDFDocumentInstance,
  branding: CompanyBrandingData,
  data: PdfQuotationData
) {
  const symbol = branding.currencySymbol || '₹';

  let y = BASE_TEMPLATE.drawHeader(doc, branding);

  const meta = [
    `Version: ${data.versionNumber}`,
    `Date: ${formatDate(data.createdAt)}`,
    `Status: ${data.status}`,
  ];
  if (data.validUntil) {
    meta.push(`Valid Until: ${formatDate(data.validUntil)}`);
  }
  y = BASE_TEMPLATE.drawDocumentTitle(doc, 'QUOTATION', data.quotationNumber, y, meta);

  y = drawRecipientBlock(doc, data.recipient, y);

  const colWidths = [175, 95, 45, 55, 55, 55];
  const headers = ['Description', 'Service', 'Qty', 'Rate', 'Tax %', 'Amount'];
  const rows = data.items.map((item) => [
    item.description,
    item.serviceName || '—',
    String(item.quantity),
    formatCurrency(item.unitPrice, symbol),
    `${item.taxRate}%`,
    formatCurrency(item.lineTotal, symbol),
  ]);

  y = BASE_TEMPLATE.drawTable(doc, headers, rows, y, colWidths);

  y += 5;
  y = BASE_TEMPLATE.drawAmountInWords(doc, data.grandTotal, branding.currency || 'INR', y);

  y += 5;

  const totals: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Subtotal', value: formatCurrency(data.subtotal, symbol) },
  ];

  if (data.discount > 0) {
    totals.push({ label: 'Discount', value: `- ${formatCurrency(data.discount, symbol)}` });
  }
  if (data.transportation > 0) {
    totals.push({ label: 'Transportation', value: formatCurrency(data.transportation, symbol) });
  }
  if (data.installation > 0) {
    totals.push({ label: 'Installation', value: formatCurrency(data.installation, symbol) });
  }
  totals.push({ label: 'GST', value: formatCurrency(data.gstAmount, symbol) });
  totals.push({ label: 'Grand Total', value: formatCurrency(data.grandTotal, symbol), bold: true });

  y = BASE_TEMPLATE.drawTotals(doc, totals, y);

  y = drawAdditionalSections(doc, data, y);

  y = BASE_TEMPLATE.drawBankDetails(doc, branding, y);

  y = BASE_TEMPLATE.drawSignatureAndStamp(doc, branding, y);

  const statusColor = STATUS_COLORS[data.status] || '#6b7280';
  if (data.status === 'DRAFT') {
    BASE_TEMPLATE.drawWatermark(doc, 'DRAFT', '#6b7280');
  } else if (data.status === 'REJECTED') {
    BASE_TEMPLATE.drawWatermark(doc, 'REJECTED', '#dc2626');
  }

  BASE_TEMPLATE.drawFooter(doc, branding);
}

function drawRecipientBlock(
  doc: PDFDocumentInstance,
  recipient: PdfQuotationData['recipient'],
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

  const addressParts = [
    recipient.addressLine1,
    recipient.addressLine2,
    [recipient.city, recipient.state, recipient.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);
  if (addressParts.length > 0) {
    y += 12;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    doc.text(addressParts.join(', '), MARGIN_LEFT, y, { width: 300 });
    y += Math.ceil(doc.heightOfString(addressParts.join(', '), { width: 300 }));
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

function drawAdditionalSections(
  doc: PDFDocumentInstance,
  data: PdfQuotationData,
  y: number
) {
  const sections: { title: string; content: string }[] = [];

  if (data.notes) {
    sections.push({ title: 'Notes', content: data.notes });
  }
  if (data.termsAndConditions) {
    sections.push({ title: 'Terms & Conditions', content: data.termsAndConditions });
  }
  if (data.paymentTerms) {
    sections.push({ title: 'Payment Terms', content: data.paymentTerms });
  }

  if (sections.length === 0) return y;

  for (const section of sections) {
    if (y + 80 > PAGE_HEIGHT - 100) {
      doc.addPage();
      y = BASE_TEMPLATE.MARGIN_TOP + 10;
    }

    y += 5;
    doc.moveTo(MARGIN_LEFT, y).lineTo(PAGE_WIDTH - MARGIN_RIGHT, y).lineWidth(0.5).strokeColor(BRAND_BORDER).stroke();
    y += 8;

    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND_PRIMARY);
    doc.text(section.title, MARGIN_LEFT, y);
    y += 14;

    doc.fontSize(8).font('Helvetica').fillColor(BRAND_TEXT);
    doc.text(section.content, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
    y += Math.ceil(doc.heightOfString(section.content, { width: CONTENT_WIDTH })) + 4;
  }

  return y;
}
