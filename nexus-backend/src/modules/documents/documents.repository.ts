import { prisma } from '../../config/database';

export const documentsRepository = {
  create(data: {
    entityType: string;
    entityId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedByUserId: string;
    clientId?: string;
    projectRefId?: string;
  }) {
    return prisma.document.create({ data });
  },

  findById(id: string) {
    return prisma.document.findFirst({ where: { id, deletedAt: null } });
  },

  listForEntity(entityType: string, entityId: string) {
    return prisma.document.findMany({
      where: { entityType, entityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  listForClient(clientId: string) {
    return prisma.document.findMany({ where: { clientId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  },

  // Global admin listing across every Lead and Project, paginated,
  // with optional type/entity/date filters and filename search.
  async listAll(params: {
    skip: number;
    take: number;
    search?: string;
    documentType?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { deletedAt: null };
    if (params.documentType) where.documentType = params.documentType;
    if (params.entityType) where.entityType = params.entityType;
    if (params.search) {
      where.fileName = { contains: params.search, mode: 'insensitive' };
    }
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, contactName: true, companyName: true } },
          projectRef: { select: { id: true, projectNumber: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);
    return { items, total };
  },

  softDelete(id: string) {
    return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
