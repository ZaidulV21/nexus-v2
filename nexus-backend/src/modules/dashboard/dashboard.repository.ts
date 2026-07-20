import { prisma } from '../../config/database';

export const dashboardRepository = {
  countLeadsBySource() {
    return prisma.lead.groupBy({ by: ['source'], _count: true, where: { deletedAt: null, archivedAt: null } });
  },

  countLeadServicesByStatus() {
    return prisma.leadService.groupBy({ by: ['status'], _count: true });
  },

  countActiveProjects() {
    return prisma.project.count({ where: { deletedAt: null } });
  },

  countTotalLeads() {
    return prisma.lead.count({ where: { deletedAt: null, archivedAt: null } });
  },

  countTotalClients() {
    return prisma.client.count({ where: { deletedAt: null } });
  },

  countTotalQuotations() {
    return prisma.quotation.count();
  },

  countTotalInvoices() {
    return prisma.invoice.count({ where: { status: 'ISSUED' } });
  },

  sumInvoicedAndPaid() {
    return prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { payments: true },
    });
  },

  countProjectsByStatus() {
    return prisma.projectService.groupBy({ by: ['status'], _count: true });
  },

  recentTimelineEvents(take: number) {
    return prisma.timelineEvent.findMany({
      take,
      orderBy: { createdAt: 'desc' },
    });
  },

  countPendingQuotations() {
    return prisma.quotation.count({ where: { status: { in: ['DRAFT', 'SENT'] } } });
  },

  countProjectsOnHold() {
    return prisma.projectService.count({ where: { status: 'ON HOLD' } });
  },

  invoicesAwaitingPayment() {
    return prisma.invoice.findMany({
      where: { status: 'ISSUED' },
      include: { payments: true },
    });
  },

  monthlyRevenue(months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    return prisma.invoice.findMany({
      where: { status: 'ISSUED', issuedAt: { gte: startDate } },
      include: { payments: true },
      orderBy: { issuedAt: 'asc' },
    });
  },

  countLeadsByMonth(months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    return prisma.lead.groupBy({
      by: ['createdAt'],
      _count: true,
      where: { deletedAt: null, archivedAt: null, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
    });
  },

  previousMonthCounts() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return Promise.all([
      prisma.lead.count({
        where: { deletedAt: null, archivedAt: null, createdAt: { gte: startOfPrevMonth, lt: startOfThisMonth } },
      }),
      prisma.client.count({
        where: { deletedAt: null, createdAt: { gte: startOfPrevMonth, lt: startOfThisMonth } },
      }),
      prisma.quotation.count({
        where: { createdAt: { gte: startOfPrevMonth, lt: startOfThisMonth } },
      }),
      prisma.project.count({
        where: { deletedAt: null, createdAt: { gte: startOfPrevMonth, lt: startOfThisMonth } },
      }),
      prisma.invoice.count({
        where: { status: 'ISSUED', issuedAt: { gte: startOfPrevMonth, lt: startOfThisMonth } },
      }),
    ]);
  },

  thisMonthCounts() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return Promise.all([
      prisma.lead.count({
        where: { deletedAt: null, archivedAt: null, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.client.count({
        where: { deletedAt: null, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.quotation.count({
        where: { createdAt: { gte: startOfThisMonth } },
      }),
      prisma.project.count({
        where: { deletedAt: null, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.invoice.count({
        where: { status: 'ISSUED', issuedAt: { gte: startOfThisMonth } },
      }),
    ]);
  },

  clientProjectSummary(clientId: string) {
    return prisma.project.findMany({
      where: { clientId, deletedAt: null },
      include: { projectServices: true, invoices: { include: { payments: true } } },
    });
  },
};
