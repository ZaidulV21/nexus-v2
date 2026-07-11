import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export const statusEngineRepository = {
  logTransition(
    data: {
      entityType: string;
      entityId: string;
      fromStatus: string | null;
      toStatus: string;
      actorUserId?: string;
      reason?: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.statusTransitionLog.create({ data });
  },

  updateLeadServiceStatus(id: string, status: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.leadService.update({ where: { id }, data: { status } });
  },

  updateProjectServiceStatus(id: string, status: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.projectService.update({ where: { id }, data: { status } });
  },
};
