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

export const invoiceService = {
  // Freeform: any number of invoices per project, any label/amount.
  async create(input: CreateInvoiceInput, actorUserId: string) {
    const project = await projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError('Project not found');

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
      payload: { invoiceNumber: invoice.invoiceNumber, grandTotal },
    });

    return invoiceRepository.findById(invoice.id);
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

    await notificationsService.emitEvent({
      eventType: 'invoice.cancelled',
      entityType: 'INVOICE',
      entityId: id,
      recipient: 'client-on-file',
      payload: { invoiceNumber: invoice.invoiceNumber, reason: input.reason },
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

    if (alreadyPaid + input.amount > grandTotal) {
      throw new ValidationError(
        `Payment of ${input.amount} would exceed the invoice's outstanding balance of ${grandTotal - alreadyPaid}`
      );
    }

    const payment = await paymentRepository.create({
      invoiceId,
      amount: input.amount,
      method: input.method,
      referenceNote: input.referenceNote,
      recordedByUserId: actorUserId,
    });

    await timelineService.recordEvent({
      entityType: 'INVOICE',
      entityId: invoiceId,
      eventType: 'PAYMENT_RECORDED',
      description: `Payment of ${input.amount} recorded via ${input.method}`,
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'payment.recorded',
      entityType: 'INVOICE',
      entityId: invoiceId,
      recipient: 'client-on-file',
      payload: { amount: input.amount, invoiceNumber: invoice.invoiceNumber },
    });

    return payment;
  },

  async getById(id: string) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    return invoice;
  },

  async list(pagination: any) {
    return invoiceRepository.list(pagination);
  },

  async listForClient(clientId: string) {
    return invoiceRepository.listForClient(clientId);
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
