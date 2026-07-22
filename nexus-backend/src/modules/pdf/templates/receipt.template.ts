import PDFDocument from 'pdfkit';
import type { CompanyBrandingData, PdfReceiptData } from '../pdf.types';
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
} = BASE_TEMPLATE;

export function renderReceiptPdf(
  doc: PDFDocumentInstance,
  branding: CompanyBrandingData,
  data: PdfReceiptData
) {
  const symbol = branding.currencySymbol || '₹';

  let y = BASE_TEMPLATE.drawHeader(doc, branding);

  const meta = [
    `Date: ${formatDate(data.paidAt)}`,
    `Invoice: ${data.invoiceNumber}`,
  ];
  if (data.projectNumber) meta.push(`Project: ${data.projectNumber}`);

  y = BASE_TEMPLATE.drawDocumentTitle(doc, 'PAYMENT RECEIPT', data.receiptNumber, y, meta);

  y = drawReceiptRecipient(doc, data, y);

  y = drawReceiptDetails(doc, data, symbol, y);

  y = drawInvoiceSummary(doc, data, symbol, y);

  y = BASE_TEMPLATE.drawBankDetails(doc, branding, y);

  y = BASE_TEMPLATE.drawSignatureAndStamp(doc, branding, y);

  BASE_TEMPLATE.drawFooter(doc, branding);
}

function drawReceiptRecipient(
  doc: PDFDocumentInstance,
  data: PdfReceiptData,
  y: number
) {
  doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND_SECONDARY);
  doc.text('Received From:', MARGIN_LEFT, y);

  y += 12;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_TEXT);
  doc.text(data.recipient.contactName, MARGIN_LEFT, y);

  if (data.recipient.companyName) {
    y += 13;
    doc.fontSize(9).font('Helvetica').fillColor(BRAND_TEXT);
    doc.text(data.recipient.companyName, MARGIN_LEFT, y);
  }

  if (data.recipient.gstin) {
    y += 12;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    doc.text(`GSTIN: ${data.recipient.gstin}`, MARGIN_LEFT, y);
  }

  const details: string[] = [];
  if (data.recipient.email) details.push(data.recipient.email);
  if (data.recipient.phone) details.push(data.recipient.phone);
  if (details.length > 0) {
    y += 12;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    doc.text(details.join(' | '), MARGIN_LEFT, y);
  }

  return y + 14;
}

function drawReceiptDetails(
  doc: PDFDocumentInstance,
  data: PdfReceiptData,
  symbol: string,
  y: number
) {
  y += 5;
  doc.moveTo(MARGIN_LEFT, y).lineTo(PAGE_WIDTH - MARGIN_RIGHT, y).lineWidth(0.5).strokeColor(BRAND_BORDER).stroke();
  y += 10;

  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND_PRIMARY);
  doc.text('Payment Details', MARGIN_LEFT, y);
  y += 16;

  const fields: { label: string; value: string }[] = [
    { label: 'Amount Received', value: formatCurrency(data.amount, symbol) },
    { label: 'Payment Method', value: data.method },
    { label: 'Payment Date', value: formatDate(data.paidAt) },
  ];

  if (data.transactionReference) {
    fields.push({ label: 'Transaction Reference', value: data.transactionReference });
  }

  if (data.referenceNote) {
    fields.push({ label: 'Notes', value: data.referenceNote });
  }

  for (const field of fields) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND_SECONDARY);
    doc.text(field.label, MARGIN_LEFT, y, { width: 140 });
    doc.fontSize(9).font('Helvetica').fillColor(BRAND_TEXT);
    doc.text(field.value, MARGIN_LEFT + 140, y, { width: CONTENT_WIDTH - 140 });
    y += 16;
  }

  return y;
}

function drawInvoiceSummary(
  doc: PDFDocumentInstance,
  data: PdfReceiptData,
  symbol: string,
  y: number
) {
  y += 5;
  doc.moveTo(MARGIN_LEFT, y).lineTo(PAGE_WIDTH - MARGIN_RIGHT, y).lineWidth(0.5).strokeColor(BRAND_BORDER).stroke();
  y += 10;

  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND_PRIMARY);
  doc.text('Invoice Summary', MARGIN_LEFT, y);
  y += 16;

  const totals: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Invoice Total', value: formatCurrency(data.invoiceGrandTotal, symbol) },
    { label: 'Total Paid', value: formatCurrency(data.invoicePaidAmount, symbol) },
    { label: 'Outstanding Balance', value: formatCurrency(data.invoiceOutstandingAmount, symbol) },
  ];

  if (data.invoiceOutstandingAmount <= 0) {
    totals.push({ label: 'Status', value: 'PAID IN FULL', bold: true });
  }

  y = BASE_TEMPLATE.drawTotals(doc, totals, y);

  return y;
}
