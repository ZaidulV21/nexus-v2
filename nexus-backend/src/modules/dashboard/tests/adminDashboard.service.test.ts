jest.mock('../dashboard.repository', () => ({
  dashboardRepository: {
    countLeadsBySource: jest.fn().mockResolvedValue([{ source: 'WEBSITE', _count: 5 }]),
    countLeadServicesByStatus: jest.fn().mockResolvedValue([{ status: 'NEW', _count: 3 }]),
    countActiveProjects: jest.fn().mockResolvedValue(4),
    sumInvoicedAndPaid: jest.fn().mockResolvedValue([
      { grandTotal: 10000, payments: [{ amount: 4000 }] },
      { grandTotal: 5000, payments: [] },
    ]),
    countOverdueLikeInvoices: jest.fn().mockResolvedValue([{ payments: [] }, { payments: [{ amount: 100 }] }]),
    clientProjectSummary: jest.fn(),
  },
}));

import { adminDashboardService } from '../adminDashboard.service';

describe('adminDashboardService.getSummary', () => {
  it('aggregates revenue totals correctly across issued invoices', async () => {
    const summary = await adminDashboardService.getSummary();
    expect(summary.revenue.totalInvoiced).toBe(15000);
    expect(summary.revenue.totalPaid).toBe(4000);
    expect(summary.revenue.outstanding).toBe(11000);
    expect(summary.invoicesAwaitingFirstPayment).toBe(1);
  });
});
