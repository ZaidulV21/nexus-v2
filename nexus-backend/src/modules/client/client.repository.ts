import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';
import { computeAggregateStatus } from '../project/project.aggregateStatus';

export const clientRepository = {
  create(
    data: { clientNumber: string; companyName?: string; contactName: string; phone: string; email: string; passwordHash: string; sourceLeadId: string },
    tx: Prisma.TransactionClient
  ) {
    return tx.client.create({ data });
  },

  async generateClientNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.client.count();
    return `C-${String(count + 1).padStart(5, '0')}`;
  },

  findBySourceLeadId(leadId: string) {
    return prisma.client.findFirst({ where: { sourceLeadId: leadId } });
  },

  findByEmail(email: string) {
    return prisma.client.findFirst({ where: { email, deletedAt: null } });
  },

  findById(id: string) {
    return prisma.client.findFirst({ where: { id, deletedAt: null } });
  },

  update(id: string, data: Partial<{ companyName: string; contactName: string; phone: string }>) {
    return prisma.client.update({ where: { id }, data });
  },

  updateAccountStatus(id: string, isActive: boolean) {
    return prisma.client.update({ where: { id }, data: { isActive } });
  },

  recordLogin(id: string) {
    return prisma.client.update({ where: { id }, data: { lastLoginAt: new Date() } });
  },

  async getSummary(id: string) {
    const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!client) return null;

    const [leads, projects, quotations, invoices] = await Promise.all([
      prisma.lead.findMany({
        where: { OR: [{ clientId: id }, { id: client.sourceLeadId }], deletedAt: null },
        include: { leadServices: { include: { service: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.findMany({
        where: { clientId: id, deletedAt: null },
        include: {
          projectServices: {
            include: {
              service: true,
              assignedQuotationVersion: { include: { quotation: true } },
            },
          },
          lead: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quotation.findMany({
        where: { clientId: id },
        include: { versions: true, lead: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { clientId: id },
        include: { items: true, project: true },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const activeProjects = projects.filter((p) =>
      p.projectServices.some((ps) => ps.status !== 'COMPLETED' && ps.status !== 'CANCELLED')
    );
    const completedProjects = projects.filter((p) =>
      p.projectServices.length > 0 && p.projectServices.every((ps) => ps.status === 'COMPLETED')
    );
    const pendingQuotations = quotations.filter((q) =>
      ['DRAFT', 'SENT', 'NEGOTIATION'].includes(q.status)
    );
    const lifetimeRevenue = invoices
      .filter((i) => i.status === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grandTotal), 0);

    const serviceHistory = leads.map((lead) => {
      const relatedProject = projects.find((p) => p.leadId === lead.id);
      const projectStatus = relatedProject
        ? computeAggregateStatus(relatedProject.projectServices)
        : null;

      return {
        id: lead.id,
        leadNumber: lead.leadNumber,
        contactName: lead.contactName,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        services: lead.leadServices.map((ls) => ({
          name: ls.service?.name ?? 'Unknown',
          status: ls.status,
        })),
        currentStatus: lead.leadServices[0]?.status ?? 'NEW',
        relatedProjectId: relatedProject?.id ?? null,
        relatedProjectNumber: relatedProject?.projectNumber ?? null,
        projectStatus,
        lastUpdated: relatedProject?.updatedAt ?? lead.updatedAt,
      };
    });

    // A Client's service requests are the LEAD SERVICES that have actually been
    // converted/attached to the account - NOT the number of Leads. A single
    // multi-service Lead can contribute several services across conversions, so
    // only services carrying a convertedAt count. Services still sitting in the
    // sales pipeline (convertedAt IS NULL) are not yet part of the Client.
    const totalServiceRequests = leads.reduce(
      (sum, lead) => sum + lead.leadServices.filter((ls) => ls.convertedAt).length,
      0
    );

    return {
      client,
      kpis: {
        totalServiceRequests,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        pendingQuotations: pendingQuotations.length,
        totalInvoices: invoices.length,
        lifetimeRevenue,
      },
      serviceHistory,
    };
  },

  async listLeads(clientId: string) {
    return prisma.lead.findMany({
      where: {
        OR: [{ clientId }, { id: { equals: (await prisma.client.findFirst({ where: { id: clientId }, select: { sourceLeadId: true } }))?.sourceLeadId ?? '__none__' } }],
        deletedAt: null,
      },
      select: { id: true, leadNumber: true, contactName: true, companyName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async list(pagination: PaginationParams) {
    const where: any = { deletedAt: null };
    if (pagination.search) {
      where.OR = [
        { clientNumber: { contains: pagination.search, mode: 'insensitive' } },
        { companyName: { contains: pagination.search, mode: 'insensitive' } },
        { contactName: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
        { phone: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
      }),
      prisma.client.count({ where }),
    ]);
    return { items, total };
  },
};
