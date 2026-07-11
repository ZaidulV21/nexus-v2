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

  softDelete(id: string) {
    return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
