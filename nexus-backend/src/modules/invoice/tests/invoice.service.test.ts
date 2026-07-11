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
    (projectRepository.findById as jest.Mock).mockResolvedValue({ id: 'proj1' });
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

describe('invoiceService.recordPayment - the PRD 8.2 example', () => {
  it('reproduces: 100000 invoice, 30000 paid, 70000 outstanding, and rejects overpayment', async () => {
    (invoiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'inv1',
      status: 'ISSUED',
      grandTotal: 100000,
      invoiceNumber: 'INV/2026-27/00001',
    });
    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
    (paymentRepository.create as jest.Mock).mockResolvedValue({ id: 'pay1', amount: 30000 });

    const payment = await invoiceService.recordPayment('inv1', { amount: 30000, method: 'Bank Transfer' }, 'admin1');
    expect(payment.amount).toBe(30000);

    (paymentRepository.sumForInvoice as jest.Mock).mockResolvedValue({ _sum: { amount: 30000 } });
    await expect(
      invoiceService.recordPayment('inv1', { amount: 80000, method: 'Cash' }, 'admin1')
    ).rejects.toThrow('would exceed');
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
