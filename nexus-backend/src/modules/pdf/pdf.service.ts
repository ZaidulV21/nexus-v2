import PDFDocument from 'pdfkit';
import { getCompanyBranding } from '../company/company.branding';
import { prisma } from '../../config/database';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { env } from '../../config/env';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import {
  PdfDocumentType,
  PdfQuotationData,
  PdfInvoiceData,
  PdfReceiptData,
  PdfGenerationResult,
} from './pdf.types';
import { renderQuotationPdf } from './templates/quotation.template';
import { renderInvoicePdf } from './templates/invoice.template';
import { renderReceiptPdf } from './templates/receipt.template';

// Batch-fetch Service names for items where serviceName is NULL.
// Backward compatibility for older quotations created before the field was populated.
async function enrichItemsForPdf(items: any[]): Promise<any[]> {
  const missing = items.filter((item: any) => !item.serviceName && item.serviceId);
  if (missing.length === 0) return items;
  const uniqueIds = [...new Set(missing.map((item: any) => item.serviceId))];
  const services = await prisma.service.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(services.map((s) => [s.id, s.name]));
  return items.map((item: any) => ({
    ...item,
    serviceName: item.serviceName || nameMap.get(item.serviceId) || null,
  }));
}

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function prepareBrandingImageUrls(branding: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = { ...branding };

  const imageFields = ['logoUrl', 'qrCodeUrl', 'companySignatureUrl', 'companyStampUrl'] as const;
  for (const field of imageFields) {
    const url = result[field];
    if (typeof url === 'string' && url.startsWith('http')) {
      const buffer = await fetchImageAsBuffer(url);
      if (buffer) {
        result[field] = buffer;
      }
    }
  }

  return result;
}

function getDocumentTitle(type: PdfDocumentType, number: string): string {
  return `${type.toLowerCase()}-${number}`;
}

async function fetchQuotationData(id: string): Promise<PdfQuotationData> {
  const quotation = await prisma.quotation.findFirst({
    where: { id },
    include: {
      client: true,
      lead: true,
      versions: {
        where: { isActive: true },
        include: { items: true },
      },
    },
  });

  if (!quotation) throw new NotFoundError('Quotation not found');

  const activeVersion = quotation.versions[0];
  if (!activeVersion) throw new ValidationError('Quotation has no active version');

  // Backward compatibility: fill serviceName for older items where it is NULL
  const rawItems = (activeVersion as any).items;
  const enrichedItems = await enrichItemsForPdf(rawItems);

  const recipient = (quotation as any).client
    ? {
        contactName: (quotation as any).client.contactName,
        companyName: (quotation as any).client.companyName,
        email: (quotation as any).client.email,
        phone: (quotation as any).client.phone,
        gstin: (quotation as any).client.gstin,
      }
    : (quotation as any).lead
      ? {
          contactName: (quotation as any).lead.contactName,
          companyName: (quotation as any).lead.companyName,
          email: (quotation as any).lead.email,
          phone: (quotation as any).lead.phone,
        }
      : { contactName: 'Unknown', companyName: null, email: null, phone: null };

  return {
    quotationNumber: quotation.quotationNumber,
    versionNumber: activeVersion.versionNumber,
    status: quotation.status,
    createdAt: quotation.createdAt,
    validUntil: quotation.validUntil,
    items: enrichedItems.map((item: any) => ({
      description: item.description,
      serviceName: item.serviceName ?? undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
      hsnSacCode: item.hsnSacCode ?? undefined,
    })),
    subtotal: Number(activeVersion.subtotal),
    discount: Number(activeVersion.discount),
    gstAmount: Number(activeVersion.gstAmount),
    transportation: Number(activeVersion.transportation),
    installation: Number(activeVersion.installation),
    grandTotal: Number(activeVersion.grandTotal),
    recipient,
    notes: quotation.notes,
    termsAndConditions: quotation.termsAndConditions,
    paymentTerms: quotation.paymentTerms,
  };
}

async function fetchInvoiceData(id: string): Promise<PdfInvoiceData> {
  const invoice = await prisma.invoice.findFirst({
    where: { id },
    include: {
      items: true,
      payments: true,
      client: true,
      project: {
        include: {
          projectServices: {
            include: {
              assignedQuotationVersion: {
                include: { quotation: true },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice) throw new NotFoundError('Invoice not found');

  const paidAmount = invoice.payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );
  const grandTotal = Number(invoice.grandTotal);
  const outstandingAmount = invoice.status === 'CANCELLED' ? 0 : grandTotal - paidAmount;

  const displayStatus =
    invoice.status === 'CANCELLED'
      ? 'CANCELLED'
      : outstandingAmount <= 0
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIALLY PAID'
          : invoice.status === 'ISSUED'
            ? 'SENT'
            : 'DRAFT';

  return {
    invoiceNumber: invoice.invoiceNumber,
    label: invoice.label,
    status: invoice.status,
    displayStatus,
    issuedAt: invoice.issuedAt,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
      hsnSacCode: item.hsnSacCode,
    })),
    subtotal: Number(invoice.subtotal),
    gstAmount: Number(invoice.gstAmount),
    grandTotal,
    paidAmount,
    outstandingAmount,
    recipient: {
      contactName: invoice.client.contactName,
      companyName: invoice.client.companyName,
      email: invoice.client.email,
      phone: invoice.client.phone,
      gstin: invoice.client.gstin,
    },
    projectName: invoice.project?.projectNumber,
    projectNumber: invoice.project?.projectNumber,
  };
}

async function fetchReceiptData(paymentId: string): Promise<PdfReceiptData> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          client: true,
          project: true,
          payments: true,
        },
      },
    },
  });

  if (!payment) throw new NotFoundError('Payment not found');

  const invoice = payment.invoice;
  const paidAmount = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const grandTotal = Number(invoice.grandTotal);
  const outstandingAmount = grandTotal - paidAmount;

  return {
    receiptNumber: `RCT-${invoice.invoiceNumber}-${payment.id.slice(0, 8).toUpperCase()}`,
    paymentId: payment.id,
    amount: Number(payment.amount),
    method: payment.method,
    transactionReference: payment.transactionReference,
    referenceNote: payment.referenceNote,
    paidAt: payment.paidAt,
    invoiceNumber: invoice.invoiceNumber,
    invoiceLabel: invoice.label,
    invoiceGrandTotal: grandTotal,
    invoicePaidAmount: paidAmount,
    invoiceOutstandingAmount: outstandingAmount,
    recipient: {
      contactName: invoice.client.contactName,
      companyName: invoice.client.companyName,
      email: invoice.client.email,
      phone: invoice.client.phone,
      gstin: invoice.client.gstin,
    },
    projectName: invoice.project?.projectNumber,
    projectNumber: invoice.project?.projectNumber,
  };
}

async function generatePdfBuffer(
  documentType: PdfDocumentType,
  documentId: string
): Promise<Buffer> {
  const branding = await getCompanyBranding();
  const preparedBranding = await prepareBrandingImageUrls(branding) as any;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `${documentType} ${documentId}`,
      Author: (branding.companyName as string) || 'Nexus CRM',
      Creator: 'Nexus PDF Service',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  if (documentType === 'QUOTATION') {
    const data = await fetchQuotationData(documentId);
    renderQuotationPdf(doc, preparedBranding, data);
  } else if (documentType === 'INVOICE') {
    const data = await fetchInvoiceData(documentId);
    renderInvoicePdf(doc, preparedBranding, data);
  } else if (documentType === 'RECEIPT') {
    const data = await fetchReceiptData(documentId);
    renderReceiptPdf(doc, preparedBranding, data);
  }

  doc.end();
  return endPromise;
}

export const pdfService = {
  async generate(documentType: PdfDocumentType, documentId: string, actorUserId?: string): Promise<PdfGenerationResult> {
    const buffer = await generatePdfBuffer(documentType, documentId);

    let title: string;
    if (documentType === 'QUOTATION') {
      const q = await prisma.quotation.findUnique({ where: { id: documentId }, select: { quotationNumber: true } });
      title = q?.quotationNumber || documentId;
    } else if (documentType === 'INVOICE') {
      const inv = await prisma.invoice.findUnique({ where: { id: documentId }, select: { invoiceNumber: true } });
      title = inv?.invoiceNumber || documentId;
    } else {
      const payment = await prisma.payment.findUnique({ where: { id: documentId }, include: { invoice: { select: { invoiceNumber: true } } } });
      title = payment ? `RCT-${payment.invoice.invoiceNumber}-${documentId.slice(0, 8).toUpperCase()}` : documentId;
    }

    const fileName = `${getDocumentTitle(documentType, title)}.pdf`;
    const stored = await storageProvider.save(fileName, buffer, 'application/pdf');
    const pdfUrl = env.cloudinaryCloudName ? stored.fileUrl : `/uploads/${stored.fileUrl}`;

    const now = new Date();

    if (documentType === 'QUOTATION') {
      await prisma.quotation.update({
        where: { id: documentId },
        data: { pdfUrl, pdfGeneratedAt: now },
      });
    } else if (documentType === 'INVOICE') {
      await prisma.invoice.update({
        where: { id: documentId },
        data: { pdfUrl, pdfGeneratedAt: now },
      });
    } else {
      await prisma.payment.update({
        where: { id: documentId },
        data: { receiptUrl: pdfUrl, receiptGeneratedAt: now },
      });
    }

    await timelineService.recordEvent({
      entityType: documentType === 'RECEIPT' ? 'INVOICE' : documentType,
      entityId: documentType === 'RECEIPT' ? (await prisma.payment.findUnique({ where: { id: documentId }, select: { invoiceId: true } }))?.invoiceId || documentId : documentId,
      eventType: `${documentType}_PDF_GENERATED`,
      description: `PDF generated for ${documentType.toLowerCase()} ${title}`,
      actorUserId,
      metadata: { pdfUrl, fileSize: buffer.length },
    });

    await auditService.recordAudit({
      entityType: documentType === 'RECEIPT' ? 'INVOICE' : documentType,
      entityId: documentType === 'RECEIPT' ? (await prisma.payment.findUnique({ where: { id: documentId }, select: { invoiceId: true } }))?.invoiceId || documentId : documentId,
      action: 'PDF_GENERATED',
      afterState: { pdfUrl, generatedAt: now.toISOString(), fileSize: buffer.length },
      actorUserId,
    });

    return { pdfUrl, generatedAt: now, fileSize: buffer.length };
  },

  async regenerateIfNeeded(documentType: PdfDocumentType, documentId: string, actorUserId?: string): Promise<PdfGenerationResult> {
    let existingUrl: string | null = null;

    if (documentType === 'QUOTATION') {
      const q = await prisma.quotation.findUnique({ where: { id: documentId }, select: { pdfUrl: true } });
      existingUrl = q?.pdfUrl ?? null;
    } else if (documentType === 'INVOICE') {
      const inv = await prisma.invoice.findUnique({ where: { id: documentId }, select: { pdfUrl: true } });
      existingUrl = inv?.pdfUrl ?? null;
    } else {
      const payment = await prisma.payment.findUnique({ where: { id: documentId }, select: { receiptUrl: true } });
      existingUrl = payment?.receiptUrl ?? null;
    }

    if (existingUrl) {
      return { pdfUrl: existingUrl, generatedAt: new Date(), fileSize: 0 };
    }

    return this.generate(documentType, documentId, actorUserId);
  },

  async getOrCreate(documentType: PdfDocumentType, documentId: string): Promise<string> {
    let existingUrl: string | null = null;

    if (documentType === 'QUOTATION') {
      const q = await prisma.quotation.findUnique({ where: { id: documentId }, select: { pdfUrl: true } });
      existingUrl = q?.pdfUrl ?? null;
    } else if (documentType === 'INVOICE') {
      const inv = await prisma.invoice.findUnique({ where: { id: documentId }, select: { pdfUrl: true } });
      existingUrl = inv?.pdfUrl ?? null;
    } else {
      const payment = await prisma.payment.findUnique({ where: { id: documentId }, select: { receiptUrl: true } });
      existingUrl = payment?.receiptUrl ?? null;
    }

    if (existingUrl) return existingUrl;

    const result = await this.generate(documentType, documentId);
    return result.pdfUrl;
  },

  async getReceiptUrl(paymentId: string): Promise<string | null> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { receiptUrl: true } });
    return payment?.receiptUrl ?? null;
  },

  async generateReceipt(paymentId: string, actorUserId?: string): Promise<PdfGenerationResult> {
    return this.generate('RECEIPT', paymentId, actorUserId);
  },

  async regenerateReceipt(paymentId: string, actorUserId?: string): Promise<PdfGenerationResult> {
    return this.generate('RECEIPT', paymentId, actorUserId);
  },
};
