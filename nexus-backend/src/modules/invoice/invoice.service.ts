import { runInTransaction } from '../../core/utils/transaction';
import { invoiceRepository, paymentRepository } from './invoice.repository';
import { invoiceNumberingService } from './invoiceNumbering.service';
import { projectRepository } from '../project/project.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { CreateInvoiceInput, CancelInvoiceInput, RecordPaymentInput, InvoiceItemInput } from './invoice.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';

function computeInvoiceTotals(items: InvoiceItemInput[]) {
  let subtotal = 0;
  let gstAmount = 0;
  const computedItems = items.map((item) => {
    const lineBase = item.quantity * item.unitPrice;
    const taxAmount = (lineBase * item.taxRate) / 100;
    subtotal += lineBase;
    gstAmount += taxAmount;
    return { ...item, taxAmount, lineTotal: lineBase + taxAmount };
  });
  return { computedItems, subtotal, gstAmount, grandTotal: subtotal + gstAmount };
}

function getRelatedQuotation(invoice: any) {
  const versions = invoice.project?.projectServices
    ?.map((projectService: any) => projectService.assignedQuotationVersion)
    .filter(Boolean);
  const version = versions?.[0];
  const quotation = version?.quotation;
  if (!version || !quotation) return null;

  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
    versionId: version.id,
    versionNumber: version.versionNumber,
    grandTotal: version.grandTotal,
    approvalStatus: version.approvals?.length ? 'APPROVED' : quotation.status,
  };
}

function enrichInvoice(invoice: any) {
  const paidAmount = invoice.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) ?? 0;
  const grandTotal = Number(invoice.grandTotal);
  const outstandingAmount = invoice.status === 'CANCELLED' ? 0 : grandTotal - paidAmount;
  const paymentCount = invoice.payments?.length ?? 0;

  let displayStatus: string;
  if (invoice.status === 'CANCELLED') {
    displayStatus = 'CANCELLED';
  } else if (outstandingAmount <= 0) {
    displayStatus = 'PAID';
  } else if (paidAmount > 0) {
    displayStatus = 'PARTIALLY PAID';
  } else if (invoice.status === 'ISSUED') {
    displayStatus = 'SENT';
  } else {
    displayStatus = 'DRAFT';
  }

  return {
    ...invoice,
    dueDate: null,
    paidAmount,
    outstandingAmount,
    paymentCount,
    displayStatus,
    relatedQuotation: getRelatedQuotation(invoice),
  };
}

export const invoiceService = {
  // Freeform: any number of invoices per project, any label/amount.
  async create(input: CreateInvoiceInput, actorUserId: string) {
    const project = await projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.clientId !== input.clientId) {
      throw new ValidationError('Invoice client must match the Project client');
    }

    const hasApprovedQuotation = project.projectServices?.some((projectService: any) => {
      const version = projectService.assignedQuotationVersion;
      return version?.quotation?.status === 'APPROVED' || version?.approvals?.length > 0;
    });
    if (!hasApprovedQuotation) {
      throw new ValidationError('Invoices can only be generated for Projects linked to an approved quotation');
    }

    const { computedItems, subtotal, gstAmount, grandTotal } = computeInvoiceTotals(input.items);

    const invoice = await runInTransaction(async (tx) => {
      const invoiceNumber = await invoiceNumberingService.getNextInvoiceNumber(tx);

      const created = await invoiceRepository.create(
        {
          invoiceNumber,
          projectId: input.projectId,
          clientId: input.clientId,
          label: input.label,
          subtotal,
          gstAmount,
          grandTotal,
          createdByUserId: actorUserId,
        },
        tx
      );

      await invoiceRepository.createItems(created.id, computedItems, tx);

      return created;
    });

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoice.id,
      eventType: 'INVOICE_ISSUED',
      description: `Invoice ${invoice.invoiceNumber} ("${input.label}") issued for ${grandTotal}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'CREATE',
      afterState: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, grandTotal },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'invoice.issued',
      entityType: 'INVOICE',
      entityId: invoice.id,
      recipient: 'client-on-file',
      payload: { invoiceNumber: invoice.invoiceNumber, grandTotal, clientId: input.clientId },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('INVOICE', invoice.id, actorUserId).catch(() => {});
    });

    return this.getById(invoice.id);
  },

  async send(id: string, actorUserId: string, resend = false) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'CANCELLED') throw new ValidationError('Cannot send a cancelled invoice');

    const recipient = invoice.client?.email;
    if (!recipient) throw new ValidationError('Invoice client does not have an email address');

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: id,
      eventType: resend ? 'INVOICE_RESENT' : 'INVOICE_SENT',
      description: `Invoice ${invoice.invoiceNumber} ${resend ? 'resent' : 'sent'} to client`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'INVOICE',
      entityId: id,
      action: resend ? 'RESEND' : 'SEND',
      afterState: { invoiceId: id, recipient },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'invoice.issued',
      entityType: 'INVOICE',
      entityId: id,
      recipient,
      payload: {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: invoice.grandTotal,
        resend,
        clientId: invoice.clientId,
      },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('INVOICE', id, actorUserId).catch(() => {});
    });

    return this.getById(id);
  },

  // Never deletes, never mutates financial fields - only ever flips status.
  async cancel(id: string, input: CancelInvoiceInput, actorUserId: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'CANCELLED') throw new ValidationError('Invoice is already cancelled');

    const cancelled = await invoiceRepository.cancel(id, input.reason);

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: id,
      eventType: 'INVOICE_CANCELLED',
      description: `Invoice ${invoice.invoiceNumber} cancelled: ${input.reason}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'INVOICE',
      entityId: id,
      action: 'CANCEL',
      beforeState: invoice,
      afterState: cancelled,
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'invoice.cancelled',
      entityType: 'INVOICE',
      entityId: id,
      recipient: 'client-on-file',
      payload: { invoiceNumber: invoice.invoiceNumber, reason: input.reason },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('INVOICE', id, actorUserId).catch(() => {});
    });

    return cancelled;
  },

  async recordPayment(invoiceId: string, input: RecordPaymentInput, actorUserId: string) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'CANCELLED') throw new ValidationError('Cannot record a payment against a cancelled invoice');

    const paidSoFar = await paymentRepository.sumForInvoice(invoiceId);
    const alreadyPaid = Number(paidSoFar._sum.amount || 0);
    const grandTotal = Number(invoice.grandTotal);
    const outstanding = grandTotal - alreadyPaid;

    if (input.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    if (input.amount > outstanding) {
      throw new ValidationError(
        `Payment of ${input.amount} would exceed the invoice's outstanding balance of ${outstanding}`
      );
    }

    if (input.transactionReference) {
      const existing = await paymentRepository.findByTransactionReference(input.transactionReference);
      if (existing) {
        throw new ValidationError(
          `A payment with transaction reference "${input.transactionReference}" already exists`
        );
      }
    }

    const payment = await paymentRepository.create({
      invoiceId,
      amount: input.amount,
      method: input.method,
      transactionReference: input.transactionReference,
      referenceNote: input.referenceNote,
      recordedByUserId: actorUserId,
    });

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoiceId,
      eventType: 'PAYMENT_RECORDED',
      description: `Payment of ${input.amount} recorded via ${input.method}${input.transactionReference ? ` (Ref: ${input.transactionReference})` : ''}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'PAYMENT_RECORDED',
      afterState: payment,
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'payment.recorded',
      entityType: 'INVOICE',
      entityId: invoiceId,
      recipient: 'client-on-file',
      payload: { amount: input.amount, invoiceNumber: invoice.invoiceNumber, clientId: invoice.clientId },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('INVOICE', invoiceId, actorUserId).catch(() => {});
      pdfService.generateReceipt(payment.id, actorUserId).catch(() => {});
    });

    return payment;
  },

  async sendReceipt(paymentId: string, actorUserId: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw new NotFoundError('Payment not found');

    const invoice = await invoiceRepository.findById(payment.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');

    const recipient = invoice.client?.email;
    if (!recipient) throw new ValidationError('Invoice client does not have an email address');

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: payment.invoiceId,
      eventType: 'RECEIPT_SENT',
      description: `Payment receipt sent to client for payment of ${payment.amount}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'INVOICE',
      entityId: payment.invoiceId,
      action: 'RECEIPT_SENT',
      afterState: { paymentId, recipient },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'payment.receipt_sent',
      entityType: 'INVOICE',
      entityId: payment.invoiceId,
      recipient,
      payload: {
        paymentId,
        amount: payment.amount,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
      },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generateReceipt(paymentId, actorUserId).catch(() => {});
    });

    return payment;
  },

  async resendReceipt(paymentId: string, actorUserId: string) {
    return this.sendReceipt(paymentId, actorUserId);
  },

  async getById(id: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    return enrichInvoice(invoice);
  },

  async list(pagination: any) {
    const { items, total } = await invoiceRepository.list(pagination);
    return { items: items.map(enrichInvoice), total };
  },

  async listForClient(clientId: string) {
    const invoices = await invoiceRepository.listForClient(clientId);
    return invoices.map(enrichInvoice);
  },

  async getForClient(id: string, clientId: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.clientId !== clientId) {
      throw new NotFoundError('Invoice not found');
    }
    return enrichInvoice(invoice);
  },

  async listForProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    const invoices = await invoiceRepository.listForProject(projectId);
    return invoices.map(enrichInvoice);
  },

  async listPayments(invoiceId: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');
    return paymentRepository.listForInvoice(invoiceId, sortOrder);
  },

  // Project Total / Total Invoiced / Total Paid / Outstanding - always
  // computed live, never cached, per PRD 8.1.
  async getProjectFinancialSummary(projectId: string) {
    const invoices = await invoiceRepository.listForProject(projectId);
    const activeInvoices = invoices.filter((inv) => inv.status !== 'CANCELLED');

    const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const totalPaid = activeInvoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      0
    );

    return {
      projectId,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      invoiceCount: activeInvoices.length,
    };
  },
};
