import { prisma } from '../../config/database';

export const dashboardRepository = {
  countLeadsBySource() {
    return prisma.lead.groupBy({ by: ['source'], _count: true, where: { deletedAt: null } });
  },

  countLeadServicesByStatus() {
    return prisma.leadService.groupBy({ by: ['status'], _count: true });
  },

  countActiveProjects() {
    return prisma.project.count({ where: { deletedAt: null } });
  },

  sumInvoicedAndPaid() {
    return prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { payments: true },
    });
  },

  countOverdueLikeInvoices() {
    // V1 has no due-date field on Invoice (freeform model, PRD 8.1) - this
    // is a placeholder for "issued but zero payments recorded" as a proxy,
    // pending confirmation of the actual metric definition (PRD open item).
    return prisma.invoice.findMany({
      where: { status: 'ISSUED' },
      include: { payments: true },
    });
  },

  clientProjectSummary(clientId: string) {
    return prisma.project.findMany({
      where: { clientId, deletedAt: null },
      include: { projectServices: true, invoices: { include: { payments: true } } },
    });
  },
};
