jest.mock('../dashboard.repository', () => ({
  dashboardRepository: {
    countLeadsBySource: jest.fn().mockResolvedValue([{ source: 'WEBSITE', _count: 5 }]),
    countLeadServicesByStatus: jest.fn().mockResolvedValue([{ status: 'NEW', _count: 3 }]),
    countActiveProjects: jest.fn().mockResolvedValue(4),
    countTotalLeads: jest.fn().mockResolvedValue(25),
    countTotalClients: jest.fn().mockResolvedValue(12),
    countTotalQuotations: jest.fn().mockResolvedValue(18),
    countTotalInvoices: jest.fn().mockResolvedValue(10),
    countProjectsByStatus: jest.fn().mockResolvedValue([
      { status: 'IN PROGRESS', _count: 3 },
      { status: 'COMPLETED', _count: 5 },
    ]),
    recentTimelineEvents: jest.fn().mockResolvedValue([
      { id: 't1', entityType: 'LEAD', entityId: 'l1', eventType: 'LEAD_CREATED', description: 'Lead created', createdAt: new Date() },
    ]),
    countPendingQuotations: jest.fn().mockResolvedValue(7),
    countProjectsOnHold: jest.fn().mockResolvedValue(2),
    invoicesAwaitingPayment: jest.fn().mockResolvedValue([
      { grandTotal: 10000, payments: [] },
      { grandTotal: 5000, payments: [{ amount: 2000 }] },
    ]),
    monthlyRevenue: jest.fn().mockResolvedValue([]),
    previousMonthCounts: jest.fn().mockResolvedValue([3, 2, 4, 1, 2]),
    thisMonthCounts: jest.fn().mockResolvedValue([5, 3, 2, 2, 3]),
    clientProjectSummary: jest.fn(),
    paymentMetrics: jest.fn().mockResolvedValue({ _count: 5, _sum: { amount: 8000 }, _avg: { amount: 1600 } }),
    paymentMethodsDistribution: jest.fn().mockResolvedValue([
      { method: 'BANK_TRANSFER', _count: 3, _sum: { amount: 5000 } },
      { method: 'UPI', _count: 2, _sum: { amount: 3000 } },
    ]),
    recentPayments: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../notifications/notifications.repository', () => ({
  notificationsRepository: {
    countUnread: jest.fn().mockResolvedValue(4),
  },
}));

import { adminDashboardService } from '../adminDashboard.service';

describe('adminDashboardService.getSummary', () => {
  it('returns KPIs with correct revenue totals', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.kpis.totalRevenueInvoiced).toBe(15000);
    expect(summary.kpis.totalRevenueReceived).toBe(2000);
    expect(summary.kpis.outstandingAmount).toBe(13000);
    expect(summary.kpis.totalPaymentsReceived).toBe(8000);
    expect(summary.kpis.totalPaymentCount).toBe(5);
    expect(summary.kpis.avgPaymentSize).toBe(1600);
  });

  it('returns correct entity counts', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.kpis.totalLeads).toBe(25);
    expect(summary.kpis.totalClients).toBe(12);
    expect(summary.kpis.totalQuotations).toBe(18);
    expect(summary.kpis.totalInvoices).toBe(10);
    expect(summary.kpis.totalActiveProjects).toBe(4);
    expect(summary.kpis.pendingQuotations).toBe(7);
    expect(summary.upcoming.projectsOnHold).toBe(2);
  });

  it('computes upcoming items correctly', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.upcoming.overdueInvoices).toBe(1);
    expect(summary.upcoming.invoicesAwaitingPayment).toBe(1);
    expect(summary.upcoming.pendingQuotations).toBe(7);
    expect(summary.upcoming.projectsOnHold).toBe(2);
    expect(summary.upcoming.unreadNotifications).toBe(4);
  });

  it('includes charts data', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.charts.leadsBySource).toEqual([{ source: 'WEBSITE', count: 5 }]);
    expect(summary.charts.leadServicesByStatus).toEqual([{ status: 'NEW', count: 3 }]);
    expect(summary.charts.projectsByStatus).toEqual([
      { status: 'IN PROGRESS', count: 3 },
      { status: 'COMPLETED', count: 5 },
    ]);
    expect(summary.charts.paymentMethods).toEqual([
      { method: 'BANK_TRANSFER', count: 3, total: 5000 },
      { method: 'UPI', count: 2, total: 3000 },
    ]);
  });

  it('includes comparison data', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.comparisons.leads).toEqual({ thisMonth: 5, prevMonth: 3 });
    expect(summary.comparisons.clients).toEqual({ thisMonth: 3, prevMonth: 2 });
  });

  it('includes recent activity', async () => {
    const summary = await adminDashboardService.getSummary('admin1');
    expect(summary.recentActivity).toHaveLength(1);
    expect(summary.recentActivity[0].eventType).toBe('LEAD_CREATED');
  });
});
