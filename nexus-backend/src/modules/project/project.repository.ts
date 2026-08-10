import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

// Phase 9: every Project Service read resolves its derived Sub Services so
// API consumers see the service + sub-service lineage without a second lookup.
const PROJECT_SERVICE_INCLUDE = {
  service: true,
  subServices: { include: { subService: true } },
  leadService: { include: { service: true } },
  assignedQuotationVersion: { include: { quotation: true, approvals: true } },
} as const;

// Every Project read resolves the origin quotation directly (project.quotationId)
// plus the client/lead records so a Project can always trace its full lineage.
const PROJECT_INCLUDE = {
  projectServices: { include: PROJECT_SERVICE_INCLUDE },
  client: true,
  lead: true,
  quotation: true,
} as const;

export const projectRepository = {
  create(
    data: { projectNumber: string; leadId: string; clientId: string; quotationId?: string | null },
    tx: Prisma.TransactionClient
  ) {
    return tx.project.create({ data });
  },

  findByLeadAndClient(leadId: string, clientId: string) {
    return prisma.project.findFirst({
      where: { leadId, clientId, deletedAt: null },
      include: PROJECT_INCLUDE,
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
      include: PROJECT_INCLUDE,
    });
  },

  findById(id: string) {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...PROJECT_INCLUDE,
        projectServices: {
          include: {
            service: true,
            subServices: { include: { subService: true } },
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
        media: true,
      },
    });
  },

  // The single "Project became Completed" moment. `completedAt` drives the
  // public portfolio (completed projects appear automatically) and unlocks the
  // completion-gallery uploads.
  setCompleted(id: string, actorUserId?: string) {
    return prisma.project.update({
      where: { id },
      data: { completedAt: new Date(), completedByUserId: actorUserId ?? null },
    });
  },

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
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
          ...PROJECT_INCLUDE,
          media: true,
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

  listForClient(clientId: string, pagination?: { skip: number; take: number; search?: string }) {
    const where: any = { clientId, deletedAt: null };
    if (pagination?.search) {
      where.OR = [
        { projectNumber: { contains: pagination.search, mode: 'insensitive' } },
        { title: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const base = { where, include: PROJECT_INCLUDE, orderBy: { createdAt: 'desc' as const } };
    if (!pagination) return prisma.project.findMany(base);
    return Promise.all([
      prisma.project.findMany({ ...base, skip: pagination.skip, take: pagination.take }),
      prisma.project.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  },

  async generateProjectNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.project.count();
    return `P-${String(count + 1).padStart(5, '0')}`;
  },
};

export const projectServiceRepository = {
  createMany(
    projectId: string,
    services: Array<{ serviceId: string; leadServiceId?: string; assignedQuotationVersionId?: string; subServiceIds?: string[] }>,
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
            // Phase 9: persist the derived Sub Services atomically with the
            // Project Service so the Project knows its sub-service lineage.
            ...(s.subServiceIds && s.subServiceIds.length > 0
              ? { subServices: { create: s.subServiceIds.map((subServiceId) => ({ subServiceId })) } }
              : {}),
          },
        })
      )
    );
  },

  create(
    data: {
      projectId: string;
      serviceId: string;
      assignedQuotationVersionId?: string;
      subServiceIds?: string[];
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.projectService.create({
      data: {
        ...data,
        status: 'PROJECT CREATED',
        ...(data.subServiceIds && data.subServiceIds.length > 0
          ? { subServices: { create: data.subServiceIds.map((subServiceId) => ({ subServiceId })) } }
          : {}),
      },
    });
  },

  findById(id: string) {
    return prisma.projectService.findFirst({
      where: { id },
      include: { service: true, project: true, subServices: { include: { subService: true } } },
    });
  },

  listForProject(projectId: string) {
    return prisma.projectService.findMany({
      where: { projectId },
      include: { service: true, subServices: { include: { subService: true } } },
    });
  },
};
