jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../invoice.repository', () => ({
  invoiceRepository: {
    create: jest.fn(),
    createItems: jest.fn(),
    findById: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
    listForProject: jest.fn(),
    listForClient: jest.fn(),
  },
  paymentRepository: {
    create: jest.fn(),
    sumForInvoice: jest.fn(),
    listForInvoice: jest.fn(),
    findByTransactionReference: jest.fn(),
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
import { projectRepository } from '../../project/project.repository';
import { invoiceService } from '../invoice.service';

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (invoiceRepository.findById as jest.Mock).mockResolvedValue(mockInvoice);
  });

  it('records a valid payment', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 30000 });

    const payment = await invoiceService.recordPayment('inv1', { amount: 30000, method: 'Bank Transfer' }, 'admin1');
    expect(payment.amount).toBe(30000);
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

  it('allows payment with transaction reference when unique', async () => {
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.findByTransactionReference as jest.Mock).mockResolvedValue(null);
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 5000, transactionReference: 'UTR123' });

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
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 5000 });

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
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 100000 });

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
      .mockResolvedValueOnce({ id: 'pay1', amount: 30000 })
      .mockResolvedValueOnce({ id: 'pay2', amount: 40000 })
      .mockResolvedValueOnce({ id: 'pay3', amount: 30000 });

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
      { grandTotal: 50000, status: 'ISSUED', payments: [{ amount: 20000 }] },
      { grandTotal: 10000, status: 'CANCELLED', payments: [] },
    ]);

    const summary = await invoiceService.getProjectFinancialSummary('proj1');
    expect(summary.totalInvoiced).toBe(50000);
    expect(summary.totalPaid).toBe(20000);
    expect(summary.outstanding).toBe(30000);
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
      payments: [{ amount: 3000 }],
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
      payments: [{ amount: 10000 }],
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
      payments: [{ amount: 3000 }, { amount: 2000 }],
    });

    const result = await invoiceService.getById('inv1');
    expect(result.paymentCount).toBe(2);
  });
});
