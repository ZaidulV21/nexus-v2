import { dashboardRepository } from './dashboard.repository';
import { computeAggregateStatus } from '../project/project.aggregateStatus';
import { projectRepository } from '../project/project.repository';

// Default metric set pending your confirmed list (flagged as a non-blocking
// open item in the PRD, §19). Each metric is independently computed so
// swapping/adding metrics later never requires touching this module's shape.
export const adminDashboardService = {
  async getSummary() {
    const [leadsBySource, leadServicesByStatus, activeProjectsCount, invoices] = await Promise.all([
      dashboardRepository.countLeadsBySource(),
      dashboardRepository.countLeadServicesByStatus(),
      dashboardRepository.countActiveProjects(),
      dashboardRepository.sumInvoicedAndPaid(),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      0
    );

    const unpaidInvoices = await dashboardRepository.countOverdueLikeInvoices();
    const zeroPaymentInvoices = unpaidInvoices.filter((inv) => inv.payments.length === 0);

    return {
      leadsBySource,
      leadServicesByStatus,
      activeProjectsCount,
      revenue: {
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced - totalPaid,
      },
      invoicesAwaitingFirstPayment: zeroPaymentInvoices.length,
    };
  },
};

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
