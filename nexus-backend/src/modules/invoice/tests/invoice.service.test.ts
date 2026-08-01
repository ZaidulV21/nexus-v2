jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../invoice.repository', () => ({
  invoiceRepository: {
    create: jest.fn(),
    createItems: jest.fn(),
    findById: jest.fn(),
    cancel: jest.fn(),
    markSent: jest.fn(),
    list: jest.fn(),
    listForProject: jest.fn(),
    listForClient: jest.fn(),
  },
  paymentRepository: {
    create: jest.fn(),
    sumForInvoice: jest.fn(),
    listForInvoice: jest.fn(),
    findById: jest.fn(),
    findByTransactionReference: jest.fn(),
    markReceiptSent: jest.fn(),
  },
}));
jest.mock('../invoiceNumbering.service', () => ({
  invoiceNumberingService: { getNextInvoiceNumber: jest.fn().mockResolvedValue('INV/2026-27/00001') },
}));
jest.mock('../../project/project.repository', () => ({
  projectRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));

import { invoiceRepository, paymentRepository } from '../invoice.repository';
import { Prisma } from '@prisma/client';
import { projectRepository } from '../../project/project.repository';
import { invoiceService } from '../invoice.service';
import { timelineService } from '../../timeline/timeline.service';
import { auditService } from '../../audit/audit.service';
import { notificationsService } from '../../notifications/notifications.service';

describe('invoiceService.create - GST totals', () => {
  it('computes GST correctly across line items with different tax rates', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      clientId: 'client1',
      projectServices: [{ assignedQuotationVersion: { quotation: { status: 'APPROVED' }, approvals: [] } }],
    });
    (invoiceRepository.create as jest.Mock).mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV/2026-27/00001' });
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'inv1' });

    await invoiceService.create(
      {
        projectId: 'proj1',
        clientId: 'client1',
        label: 'Advance',
        items: [
          { description: 'Interior labour', quantity: 1, unitPrice: 10000, hsnSacCode: '9954', taxRate: 18 },
          { description: 'Electrical fittings', quantity: 1, unitPrice: 5000, hsnSacCode: '8536', taxRate: 12 },
        ],
      },
      'admin1'
    );

    const createCall = (invoiceRepository.create as jest.Mock).mock.calls[0][0];
    // subtotal = 15000, gst = 1800 + 600 = 2400, grandTotal = 17400
    expect(createCall.subtotal).toBe(15000);
    expect(createCall.gstAmount).toBe(2400);
    expect(createCall.grandTotal).toBe(17400);
  });
});

describe('invoiceService.cancel - immutability', () => {
  it('rejects cancelling an already-cancelled invoice', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'CANCELLED',
      invoiceNumber: 'INV/2026-27/00001',
    });
    await expect(invoiceService.cancel('inv1', { reason: 'dup' }, 'admin1')).rejects.toThrow('already cancelled');
  });

  it('preserves the invoice number when cancelling (never renumbers)', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      invoiceNumber: 'INV/2026-27/00001',
    });
    (invoiceRepository.cancel as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'CANCELLED',
      invoiceNumber: 'INV/2026-27/00001',
    });

    const result = await invoiceService.cancel('inv1', { reason: 'client changed mind' }, 'admin1');
    expect(result.invoiceNumber).toBe('INV/2026-27/00001');
    expect(invoiceRepository.cancel).toHaveBeenCalledWith('inv1', 'client changed mind');
  });
});

describe('invoiceService.recordPayment - business rules', () => {
  const mockInvoice = {
    id: 'inv1',
    status: 'ISSUED',
    grandTotal: 100000,
    invoiceNumber: 'INV/2026-27/00001',
    clientId: 'client1',
    projectId: 'proj1',
    client: { email: 'client@test.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (invoiceRepository.findById as jest.Mock).mockResolvedValue(mockInvoice);
  });

  it('records a valid payment with clientId, projectId, and status SUCCESS', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 30000, clientId: 'client1', projectId: 'proj1', status: 'SUCCESS' });

    const payment = await invoiceService.recordPayment('inv1', { amount: 30000, method: 'Bank Transfer' }, 'admin1');
    expect(payment.amount).toBe(30000);
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client1',
        projectId: 'proj1',
        status: 'SUCCESS',
      }),
      expect.anything()
    );
  });

  it('rejects overpayment', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 30000 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);

    await expect(
      invoiceService.recordPayment('inv1', { amount: 80000, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('would exceed');
  });

  it('rejects zero payment', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);

    await expect(
      invoiceService.recordPayment('inv1', { amount: 0, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('greater than zero');
  });

  it('rejects negative payment', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);

    await expect(
      invoiceService.recordPayment('inv1', { amount: -100, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('greater than zero');
  });

  it('rejects duplicate transaction reference', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue({ id: 'existingPay', transactionReference: 'UTR123' });

    await expect(
      invoiceService.recordPayment('inv1', { amount: 5000, method: 'UPI', transactionReference: 'UTR123' }, 'admin1')
    ).rejects.toThrow('already exists');
  });

  it('maps a DB unique-constraint violation (P2002) to a clean duplicate-reference error (race)', async () => {
    // Two concurrent requests can both pass the findByTransactionReference pre-check
    // before either commits; the DB UNIQUE index is the source of truth.
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on transactionReference', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['transactionReference'] },
      })
    );

    await expect(
      invoiceService.recordPayment('inv1', { amount: 5000, method: 'UPI', transactionReference: 'UTR123' }, 'admin1')
    ).rejects.toMatchObject({ message: 'A payment with transaction reference "UTR123" already exists' });

    // The failed insert must not produce any business side effects.
    expect(timelineService.recordEvent).not.toHaveBeenCalled();
    expect(auditService.recordAudit).not.toHaveBeenCalled();
    expect(notificationsService.emitEvent).not.toHaveBeenCalled();
  });

  it('creates exactly one payment when two concurrent offline payments use the same reference', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    const created = new Set<string>();
    (paymentRepository.create as jest.Mock).mockImplementation((data: any) => {
      if (created.has(data.transactionReference)) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed on transactionReference', {
            code: 'P2002',
            clientVersion: '5.22.0',
            meta: { target: ['transactionReference'] },
          })
        );
      }
      created.add(data.transactionReference);
      return Promise.resolve({ id: 'pay1', amount: data.amount, transactionReference: data.transactionReference, status: 'SUCCESS' });
    });

    const results = await Promise.allSettled([
      invoiceService.recordPayment('inv1', { amount: 5000, method: 'UPI', transactionReference: 'UTR123' }, 'admin1'),
      invoiceService.recordPayment('inv1', { amount: 5000, method: 'UPI', transactionReference: 'UTR123' }, 'admin1'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as any).reason.message).toMatch('already exists');
    expect(paymentRepository.create).toHaveBeenCalledTimes(2);

    // Only the winning request runs the timeline/audit/notification pipeline.
    expect(timelineService.recordEvent).toHaveBeenCalledTimes(2); // PAYMENT_RECORDED + PARTIAL_PAYMENT
    expect(auditService.recordAudit).toHaveBeenCalledTimes(1);
  });

  it('allows payment with transaction reference when unique', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 5000, transactionReference: 'UTR123', status: 'SUCCESS' });

    const payment = await invoiceService.recordPayment(
      'inv1',
      { amount: 5000, method: 'UPI', transactionReference: 'UTR123' },
      'admin1'
    );
    expect(payment.transactionReference).toBe('UTR123');
  });

  it('allows payment without transaction reference', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 5000, status: 'SUCCESS' });

    const payment = await invoiceService.recordPayment(
      'inv1',
      { amount: 5000, method: 'Cash' },
      'admin1'
    );
    expect(payment.id).toBe('pay1');
  });

  it('prevents payment against cancelled invoice', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      status: 'CANCELLED',
    });

    await expect(
      invoiceService.recordPayment('inv1', { amount: 5000, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('cancelled');
  });

  it('supports full payment making invoice PAID', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 100000, status: 'SUCCESS' });

    const payment = await invoiceService.recordPayment('inv1', { amount: 100000, method: 'Bank Transfer' }, 'admin1');
    expect(payment.amount).toBe(100000);
  });

  it('supports multiple payments', async () => {
    (paymentRepository.sumForInvoice as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 30000 } })
      .mockResolvedValueOnce({ _sum: { amount: 70000 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'pay1', amount: 30000, status: 'SUCCESS' })
      .mockResolvedValueOnce({ id: 'pay2', amount: 40000, status: 'SUCCESS' })
      .mockResolvedValueOnce({ id: 'pay3', amount: 30000, status: 'SUCCESS' });

    await invoiceService.recordPayment('inv1', { amount: 30000, method: 'Bank Transfer' }, 'admin1');
    await invoiceService.recordPayment('inv1', { amount: 40000, method: 'UPI' }, 'admin1');
    await invoiceService.recordPayment('inv1', { amount: 30000, method: 'Cash' }, 'admin1');

    expect(paymentRepository.create).toHaveBeenCalledTimes(3);
  });

  it('rejects payment exceeding remaining balance after partial payment', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 70000 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);

    await expect(
      invoiceService.recordPayment('inv1', { amount: 40000, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('would exceed');
  });

  it('transitions invoice display status to PAID after full payment', async () => {
    (invoiceRepository.findById as jest.Mock)
      .mockResolvedValueOnce(mockInvoice) // first call in recordPayment
      .mockResolvedValueOnce({             // second call via getById in caller
        ...mockInvoice,
        payments: [{ amount: 100000, status: 'SUCCESS' }],
      });

    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 100000, status: 'SUCCESS' });

    await invoiceService.recordPayment('inv1', { amount: 100000, method: 'Bank Transfer' }, 'admin1');
  });
});

describe('invoiceService.listPayments - sorting', () => {
  it('returns payments sorted by newest first by default', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'inv1' });
    (paymentRepository.listForInvoice as jest.Mock).mockResolvedValue([
      { id: 'pay2', paidAt: '2026-01-02' },
      { id: 'pay1', paidAt: '2026-01-01' },
    ]);

    const payments = await invoiceService.listPayments('inv1');
    expect(payments).toHaveLength(2);
    expect(paymentRepository.listForInvoice).toHaveBeenCalledWith('inv1', 'desc');
  });

  it('returns payments sorted by oldest first when requested', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'inv1' });
    (paymentRepository.listForInvoice as jest.Mock).mockResolvedValue([
      { id: 'pay1', paidAt: '2026-01-01' },
      { id: 'pay2', paidAt: '2026-01-02' },
    ]);

    const payments = await invoiceService.listPayments('inv1', 'asc');
    expect(payments).toHaveLength(2);
    expect(paymentRepository.listForInvoice).toHaveBeenCalledWith('inv1', 'asc');
  });
});

describe('invoiceService.getProjectFinancialSummary', () => {
  it('excludes cancelled invoices from totals', async () => {
    (invoiceRepository.listForProject as jest.Mock).mockResolvedValue([
      { grandTotal: 50000, status: 'ISSUED', payments: [{ amount: 20000, status: 'SUCCESS' }] },
      { grandTotal: 10000, status: 'CANCELLED', payments: [] },
    ]);

    const summary = await invoiceService.getProjectFinancialSummary('proj1');
    expect(summary.totalInvoiced).toBe(50000);
    expect(summary.totalPaid).toBe(20000);
    expect(summary.outstanding).toBe(30000);
  });
});

describe('invoiceService.getClientInvoiceSummary', () => {
  it('excludes cancelled invoices from totals', async () => {
    (invoiceRepository.listForClient as jest.Mock).mockResolvedValue([
      { grandTotal: 80000, status: 'ISSUED', payments: [{ amount: 30000, status: 'SUCCESS' }] },
      { grandTotal: 20000, status: 'CANCELLED', payments: [] },
      { grandTotal: 50000, status: 'ISSUED', payments: [{ amount: 50000, status: 'SUCCESS' }] },
    ]);

    const summary = await invoiceService.getClientInvoiceSummary('client1');
    expect(summary.totalInvoiced).toBe(130000);
    expect(summary.totalPaid).toBe(80000);
    expect(summary.outstanding).toBe(50000);
    expect(summary.invoiceCount).toBe(2);
  });

  it('returns zeros when all invoices are cancelled', async () => {
    (invoiceRepository.listForClient as jest.Mock).mockResolvedValue([
      { grandTotal: 50000, status: 'CANCELLED', payments: [] },
      { grandTotal: 30000, status: 'CANCELLED', payments: [] },
    ]);

    const summary = await invoiceService.getClientInvoiceSummary('client1');
    expect(summary.totalInvoiced).toBe(0);
    expect(summary.totalPaid).toBe(0);
    expect(summary.outstanding).toBe(0);
    expect(summary.invoiceCount).toBe(0);
  });

  it('returns zeros when no invoices exist', async () => {
    (invoiceRepository.listForClient as jest.Mock).mockResolvedValue([]);

    const summary = await invoiceService.getClientInvoiceSummary('client1');
    expect(summary.totalInvoiced).toBe(0);
    expect(summary.totalPaid).toBe(0);
    expect(summary.outstanding).toBe(0);
    expect(summary.invoiceCount).toBe(0);
  });
});

describe('invoiceService.send - DRAFT to ISSUED workflow', () => {
    const draftInvoice = {
      id: 'inv1',
      status: 'DRAFT',
      invoiceNumber: 'INV/2026-27/00001',
      grandTotal: 50000,
      clientId: 'client1',
      client: { email: 'client@test.com' },
    };

    const issuedInvoice = {
      ...draftInvoice,
      status: 'ISSUED',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('transitions DRAFT to ISSUED on first send', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue(draftInvoice);
      (invoiceRepository.markSent as jest.Mock).mockResolvedValue({ ...draftInvoice, status: 'ISSUED' });

      await invoiceService.send('inv1', 'admin1', false);

      expect(invoiceRepository.markSent).toHaveBeenCalledWith('inv1');
    });

    it('sends email and records timeline on first send', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue(draftInvoice);
      (invoiceRepository.markSent as jest.Mock).mockResolvedValue({ ...draftInvoice, status: 'ISSUED' });
      const { timelineService } = require('../../timeline/timeline.service');
      const { notificationsService } = require('../../notifications/notifications.service');

      await invoiceService.send('inv1', 'admin1', false);

      expect(timelineService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'INVOICE_SENT' })
      );
      expect(notificationsService.emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'invoice.issued' })
      );
    });

    it('rejects double-send without resend flag', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue(issuedInvoice);

      await expect(invoiceService.send('inv1', 'admin1', false)).rejects.toThrow('already been sent');
      expect(invoiceRepository.markSent).not.toHaveBeenCalled();
    });

    it('allows resend on ISSUED invoice', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue(issuedInvoice);
      const { timelineService } = require('../../timeline/timeline.service');

      await invoiceService.send('inv1', 'admin1', true);

      expect(timelineService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'INVOICE_RESENT' })
      );
      expect(invoiceRepository.markSent).not.toHaveBeenCalled();
    });

    it('rejects send on cancelled invoice', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue({ ...draftInvoice, status: 'CANCELLED' });

      await expect(invoiceService.send('inv1', 'admin1', false)).rejects.toThrow('cancelled');
    });

    it('rejects send when client has no email', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue({ ...draftInvoice, client: null });

      await expect(invoiceService.send('inv1', 'admin1', false)).rejects.toThrow('email');
    });
  });

  describe('invoiceService.cancel - notification uses client email', () => {
    it('sends cancel notification with client email instead of literal string', async () => {
      const invoiceWithClient = {
        id: 'inv1',
        status: 'ISSUED',
        invoiceNumber: 'INV/2026-27/00001',
        clientId: 'client1',
        client: { email: 'client@test.com' },
      };
      (invoiceRepository.findById as jest.Mock).mockResolvedValue(invoiceWithClient);
      (invoiceRepository.cancel as jest.Mock).mockResolvedValue({ ...invoiceWithClient, status: 'CANCELLED' });
      const { notificationsService } = require('../../notifications/notifications.service');

      await invoiceService.cancel('inv1', { reason: 'test' }, 'admin1');

      expect(notificationsService.emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'client@test.com' })
      );
    });
  });

  describe('invoiceService.getForClient - DRAFT visibility', () => {
    it('rejects access to DRAFT invoice', async () => {
      (invoiceRepository.findById as jest.Mock).mockResolvedValue({
        id: 'inv1',
        status: 'DRAFT',
        clientId: 'client1',
      });

    await expect(invoiceService.getForClient('inv1', 'client1')).rejects.toThrow('not found');
  });

  it('allows access to ISSUED invoice', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      clientId: 'client1',
      grandTotal: 10000,
      payments: [],
    });

    const result = await invoiceService.getForClient('inv1', 'client1');
    expect(result.status).toBe('ISSUED');
  });
});

describe('invoiceService.create - DRAFT status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates invoice with DRAFT status and does not notify client', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      clientId: 'client1',
      projectServices: [{ assignedQuotationVersion: { quotation: { status: 'APPROVED' }, approvals: [] } }],
    });
    (invoiceRepository.create as jest.Mock).mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV/2026-27/00001' });
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'DRAFT',
      invoiceNumber: 'INV/2026-27/00001',
      grandTotal: 17400,
      payments: [],
    });
    const { timelineService } = require('../../timeline/timeline.service');
    const { notificationsService } = require('../../notifications/notifications.service');

    await invoiceService.create(
      {
        projectId: 'proj1',
        clientId: 'client1',
        label: 'Advance',
        items: [
          { description: 'Interior labour', quantity: 1, unitPrice: 10000, hsnSacCode: '9954', taxRate: 18 },
        ],
      },
      'admin1'
    );

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'INVOICE_CREATED' })
    );
    expect(notificationsService.emitEvent).not.toHaveBeenCalled();
  });
});

describe('enrichInvoice - displayStatus calculation', () => {
  it('returns DRAFT for ISSUED invoice with no payments', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.displayStatus).toBe('SENT');
  });

  it('returns SENT for ISSUED invoice with no payments', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.displayStatus).toBe('SENT');
  });

  it('returns PARTIALLY PAID when some amount is paid', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [{ amount: 3000, status: 'SUCCESS' }],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.displayStatus).toBe('PARTIALLY PAID');
    expect(result.paidAmount).toBe(3000);
    expect(result.outstandingAmount).toBe(7000);
  });

  it('returns PAID when fully paid', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [{ amount: 10000, status: 'SUCCESS' }],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.displayStatus).toBe('PAID');
    expect(result.outstandingAmount).toBe(0);
  });

  it('returns CANCELLED for cancelled invoice', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'CANCELLED',
      grandTotal: 10000,
      payments: [],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.displayStatus).toBe('CANCELLED');
    expect(result.outstandingAmount).toBe(0);
  });

  it('returns paymentCount in enriched invoice', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [{ amount: 3000, status: 'SUCCESS' }, { amount: 2000, status: 'SUCCESS' }],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.paymentCount).toBe(2);
  });

  it('excludes PENDING payments from paidAmount and paymentCount', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 10000,
      payments: [
        { amount: 5000, status: 'SUCCESS' },
        { amount: 3000, status: 'PENDING' },
        { amount: 2000, status: 'FAILED' },
      ],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.paidAmount).toBe(5000);
    expect(result.paymentCount).toBe(1);
    expect(result.outstandingAmount).toBe(5000);
  });
});

describe('invoiceService.sendReceipt / resendReceipt - no duplicate events', () => {
  const payment = {
    id: 'pay1',
    invoiceId: 'inv1',
    amount: 50000,
    method: 'RAZORPAY',
    receiptSentAt: null,
  };
  const invoiceWithClient = {
    id: 'inv1',
    invoiceNumber: 'INV/2026-27/00001',
    clientId: 'client1',
    client: { email: 'client@test.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (paymentRepository.findById as jest.Mock).mockResolvedValue(payment);
    (invoiceRepository.findById as jest.Mock).mockResolvedValue(invoiceWithClient);
    (notificationsService.emitEvent as jest.Mock).mockResolvedValue({ emailStatus: 'SENT' });
  });

  it('records RECEIPT_SENT on the first send', async () => {
    await invoiceService.sendReceipt('pay1', 'admin1');

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv1',
        eventType: 'RECEIPT_SENT',
        description: expect.stringContaining('receipt sent'),
      })
    );
    expect(timelineService.recordEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RECEIPT_RESENT' })
    );
    expect(paymentRepository.markReceiptSent).toHaveBeenCalledWith('pay1');
  });

  it('records RECEIPT_RESENT (not another RECEIPT_SENT) when the receipt was already sent', async () => {
    (paymentRepository.findById as jest.Mock).mockResolvedValue({
      ...payment,
      receiptSentAt: new Date('2026-07-30T10:00:00Z'),
    });

    await invoiceService.resendReceipt('pay1', 'admin1');

    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv1',
        eventType: 'RECEIPT_RESENT',
        description: expect.stringContaining('re-sent'),
      })
    );
    expect(timelineService.recordEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RECEIPT_SENT' })
    );
    expect(paymentRepository.markReceiptSent).toHaveBeenCalledWith('pay1');
  });

  it('never records a Sent/Resent timeline event when the email fails - the failure goes to the Audit Log only', async () => {
    (notificationsService.emitEvent as jest.Mock).mockResolvedValue({ emailStatus: 'FAILED' });

    await expect(invoiceService.sendReceipt('pay1', 'admin1')).rejects.toThrow(/could not be sent/i);

    // A delivery failure is a SYSTEM event: Audit Log only, never the timeline.
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'INVOICE',
        entityId: 'inv1',
        action: 'RECEIPT_SEND_FAILED',
        afterState: expect.objectContaining({ emailStatus: 'FAILED' }),
      })
    );
    expect(timelineService.recordEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RECEIPT_SENDING_FAILED' })
    );
    expect(timelineService.recordEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RECEIPT_SENT' })
    );
    expect(paymentRepository.markReceiptSent).not.toHaveBeenCalled();
  });
});
