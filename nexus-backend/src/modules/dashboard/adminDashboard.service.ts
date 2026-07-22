import { dashboardRepository } from './dashboard.repository';
import { computeAggregateStatus } from '../project/project.aggregateStatus';
import { notificationsRepository } from '../notifications/notifications.repository';

export const adminDashboardService = {
  async getSummary(adminUserId?: string) {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      leadsBySource,
      leadServicesByStatus,
      activeProjectsCount,
      totalLeads,
      totalClients,
      totalQuotations,
      totalInvoices,
      projectsByStatus,
      recentEvents,
      pendingQuotations,
      projectsOnHold,
      allIssuedInvoices,
      monthlyInvoices,
      [prevLeads, prevClients, prevQuotations, prevProjects, prevInvoices],
      [thisLeads, thisClients, thisQuotations, thisProjects, thisInvoices],
      paymentAgg,
      paymentMethods,
    ] = await Promise.all([
      dashboardRepository.countLeadsBySource(),
      dashboardRepository.countLeadServicesByStatus(),
      dashboardRepository.countActiveProjects(),
      dashboardRepository.countTotalLeads(),
      dashboardRepository.countTotalClients(),
      dashboardRepository.countTotalQuotations(),
      dashboardRepository.countTotalInvoices(),
      dashboardRepository.countProjectsByStatus(),
      dashboardRepository.recentTimelineEvents(10),
      dashboardRepository.countPendingQuotations(),
      dashboardRepository.countProjectsOnHold(),
      dashboardRepository.invoicesAwaitingPayment(),
      dashboardRepository.monthlyRevenue(12),
      dashboardRepository.previousMonthCounts(),
      dashboardRepository.thisMonthCounts(),
      dashboardRepository.paymentMetrics(),
      dashboardRepository.paymentMethodsDistribution(),
    ]);

    const totalInvoiced = allIssuedInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const totalPaid = allIssuedInvoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      0
    );

    const overdueInvoices = allIssuedInvoices.filter((inv) => inv.payments.length === 0).length;
    const awaitingPayment = allIssuedInvoices.filter((inv) => {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      return paid > 0 && paid < Number(inv.grandTotal);
    }).length;

    const projectsInProgress = projectsByStatus.find((s) => s.status === 'IN PROGRESS')?._count ?? 0;

    let unreadNotifications = 0;
    if (adminUserId) {
      unreadNotifications = await notificationsRepository.countUnread(adminUserId, 'ADMIN');
    }

    const monthlyRevenue = aggregateMonthlyRevenue(monthlyInvoices);

    const totalPaymentsReceived = Number(paymentAgg._sum.amount || 0);
    const totalPaymentCount = paymentAgg._count || 0;
    const avgPaymentSize = Number(paymentAgg._avg.amount || 0);

    return {
      kpis: {
        totalActiveProjects: activeProjectsCount,
        totalLeads,
        totalClients,
        totalQuotations,
        totalInvoices,
        totalRevenueInvoiced: totalInvoiced,
        totalRevenueReceived: totalPaid,
        outstandingAmount: totalInvoiced - totalPaid,
        pendingQuotations,
        projectsInProgress,
        totalPaymentsReceived,
        totalPaymentCount,
        avgPaymentSize,
      },
      comparisons: {
        leads: { thisMonth: thisLeads, prevMonth: prevLeads },
        clients: { thisMonth: thisClients, prevMonth: prevClients },
        quotations: { thisMonth: thisQuotations, prevMonth: prevQuotations },
        projects: { thisMonth: thisProjects, prevMonth: prevProjects },
        invoices: { thisMonth: thisInvoices, prevMonth: prevInvoices },
      },
      charts: {
        leadServicesByStatus: leadServicesByStatus.map((s) => ({ status: s.status, count: s._count })),
        leadsBySource: leadsBySource.map((s) => ({ source: s.source, count: s._count })),
        monthlyRevenue,
        projectsByStatus: projectsByStatus.map((s) => ({ status: s.status, count: s._count })),
        paymentMethods: paymentMethods.map((m) => ({ method: m.method, count: m._count, total: Number(m._sum.amount || 0) })),
      },
      recentActivity: recentEvents.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        eventType: e.eventType,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      upcoming: {
        pendingQuotations,
        projectsOnHold,
        overdueInvoices,
        invoicesAwaitingPayment: awaitingPayment,
        unreadNotifications,
      },
    };
  },
};

function aggregateMonthlyRevenue(invoices: any[]) {
  const months: Record<string, { invoiced: number; received: number }> = {};

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { invoiced: 0, received: 0 };
  }

  for (const inv of invoices) {
    const d = new Date(inv.issuedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) continue;
    months[key].invoiced += Number(inv.grandTotal);
    months[key].received += inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  }

  return Object.entries(months).map(([month, data]) => ({
    month,
    invoiced: data.invoiced,
    received: data.received,
  }));
}

export const clientDashboardService = {
  async getSummary(clientId: string) {
    const projects = await dashboardRepository.clientProjectSummary(clientId);

    return {
      projects: projects.map((p: any) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        aggregateStatus: computeAggregateStatus(p.projectServices),
        totalInvoiced: p.invoices
          .filter((inv: any) => inv.status !== 'CANCELLED')
          .reduce((sum: number, inv: any) => sum + Number(inv.grandTotal), 0),
        totalPaid: p.invoices
          .filter((inv: any) => inv.status !== 'CANCELLED')
          .reduce(
            (sum: number, inv: any) => sum + inv.payments.reduce((s: number, pay: any) => s + Number(pay.amount), 0),
            0
          ),
      })),
    };
  },
};
