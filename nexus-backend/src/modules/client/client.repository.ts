import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';
import { computeAggregateStatus } from '../project/project.aggregateStatus';
import { normalizePhone } from '../../core/utils/phone';

export const clientRepository = {
  create(
    data: { clientNumber: string; companyName?: string; contactName: string; phone: string; email: string; passwordHash: string; sourceLeadId: string },
    tx: Prisma.TransactionClient
  ) {
    return tx.client.create({ data });
  },

  async generateClientNumber(tx: Prisma.TransactionClient): Promise<string> {
    // Same max-based sequence as Lead numbering: count-based sequences reuse
    // numbers after hard-deleted rows leave gaps, colliding on the unique
    // constraint.
    const rows = await tx.$queryRaw<{ maxSeq: number | null }[]>`
      SELECT MAX(CAST(SPLIT_PART("clientNumber", '-', 2) AS INTEGER)) AS "maxSeq" FROM "clients"
    `;
    const next = (rows[0]?.maxSeq ?? 0) + 1;
    return `C-${String(next).padStart(5, '0')}`;
  },

  findBySourceLeadId(leadId: string) {
    return prisma.client.findFirst({ where: { sourceLeadId: leadId } });
  },

  findByEmail(email: string) {
    // Case-insensitive: client emails are compared on the normalized form so
    // "John@Example.com" and "john@example.com" resolve to the same account
    // everywhere (check-account, duplicate guard, login).
    return prisma.client.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' }, deletedAt: null },
    });
  },

  // Finds a client by phone after formatting-insensitive normalization (digits
  // only). The clients table has no phone index, so this scans active rows and
  // compares normalized forms - correct and fine at the current scale; if the
  // client table ever grows large, add a dedicated normalized phone column.
  async findByPhone(phone: string) {
    const digits = normalizePhone(phone);
    if (!digits) return null;
    const candidates = await prisma.client.findMany({ where: { deletedAt: null } });
    return candidates.find((c) => c.phone && normalizePhone(c.phone) === digits) ?? null;
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

  // Distinct catalog services that belong to the Client's account: every
  // Lead Service across the Client's Leads that has actually been attached
  // (convertedAt set). Powers the quotation builder's client-scoped service
  // dropdown - a Client only ever picks from their own active service history.
  async listServices(clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { sourceLeadId: true },
    });
    if (!client) return null;

    const leads = await prisma.lead.findMany({
      where: { OR: [{ clientId }, { id: client.sourceLeadId }], deletedAt: null },
      select: {
        leadServices: {
          where: { convertedAt: { not: null } },
          select: {
            service: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const seen = new Map<string, { id: string; name: string; category: { name: string } | null }>();
    leads.forEach((lead) =>
      lead.leadServices.forEach((ls) => {
        if (!seen.has(ls.service.id)) seen.set(ls.service.id, ls.service);
      })
    );
    return Array.from(seen.values());
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
