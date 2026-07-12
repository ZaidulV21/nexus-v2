import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

export const projectRepository = {
  create(data: { projectNumber: string; leadId: string; clientId: string }, tx: Prisma.TransactionClient) {
    return tx.project.create({ data });
  },

  findByLeadAndClient(leadId: string, clientId: string) {
    return prisma.project.findFirst({
      where: { leadId, clientId, deletedAt: null },
      include: {
        projectServices: {
          include: {
            service: true,
            assignedQuotationVersion: { include: { quotation: true, approvals: true } },
          },
        },
        client: true,
        lead: true,
      },
    });
  },

  findByQuotationVersionId(quotationVersionId: string) {
    return prisma.project.findFirst({
      where: {
        deletedAt: null,
        projectServices: {
          some: { assignedQuotationVersionId: quotationVersionId },
        },
      },
      include: {
        projectServices: {
          include: {
            service: true,
            assignedQuotationVersion: { include: { quotation: true, approvals: true } },
          },
        },
        client: true,
        lead: true,
      },
    });
  },

  findById(id: string) {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        projectServices: {
          include: {
            service: true,
            leadService: { include: { service: true } },
            assignedQuotationVersion: {
              include: {
                quotation: true,
                items: true,
                approvals: true,
              },
            },
          },
        },
        client: true,
        lead: true,
      },
    });
  },

  async list(pagination: PaginationParams) {
    const where: any = { deletedAt: null };
    if (pagination.search) {
      where.OR = [
        { projectNumber: { contains: pagination.search, mode: 'insensitive' } },
        { client: { contactName: { contains: pagination.search, mode: 'insensitive' } } },
        { client: { companyName: { contains: pagination.search, mode: 'insensitive' } } },
        { lead: { leadNumber: { contains: pagination.search, mode: 'insensitive' } } },
        { lead: { contactName: { contains: pagination.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        include: {
          projectServices: {
            include: {
              service: true,
              assignedQuotationVersion: { include: { quotation: true, approvals: true } },
            },
          },
          client: true,
          lead: true,
        },
      }),
      prisma.project.count({ where }),
    ]);
    return { items, total };
  },

  listStatusHistoryForServiceIds(projectServiceIds: string[]) {
    if (projectServiceIds.length === 0) return Promise.resolve([]);
    return prisma.statusTransitionLog.findMany({
      where: { entityType: 'PROJECT_SERVICE', entityId: { in: projectServiceIds } },
      orderBy: { createdAt: 'asc' },
    });
  },

  listForClient(clientId: string) {
    return prisma.project.findMany({
      where: { clientId, deletedAt: null },
      include: {
        projectServices: {
          include: {
            service: true,
            assignedQuotationVersion: { include: { quotation: true, approvals: true } },
          },
        },
        client: true,
        lead: true,
      },
    });
  },

  async generateProjectNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.project.count();
    return `P-${String(count + 1).padStart(5, '0')}`;
  },
};

export const projectServiceRepository = {
  createMany(
    projectId: string,
    services: Array<{ serviceId: string; leadServiceId?: string; assignedQuotationVersionId?: string }>,
    tx: Prisma.TransactionClient
  ) {
    return Promise.all(
      services.map((s) =>
        tx.projectService.create({
          data: {
            projectId,
            serviceId: s.serviceId,
            leadServiceId: s.leadServiceId,
            assignedQuotationVersionId: s.assignedQuotationVersionId,
            status: 'PROJECT CREATED',
          },
        })
      )
    );
  },

  create(
    data: { projectId: string; serviceId: string; assignedQuotationVersionId?: string },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.projectService.create({
      data: { ...data, status: 'PROJECT CREATED' },
    });
  },

  findById(id: string) {
    return prisma.projectService.findFirst({ where: { id }, include: { service: true, project: true } });
  },

  listForProject(projectId: string) {
    return prisma.projectService.findMany({ where: { projectId }, include: { service: true } });
  },
};
