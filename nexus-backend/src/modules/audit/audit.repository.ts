import { prisma } from '../../config/database';
import { RecordAuditInput } from './audit.types';

export const auditRepository = {
  create(input: RecordAuditInput) {
    return prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorUserId: input.actorUserId,
        beforeState: input.beforeState as any,
        afterState: input.afterState as any,
      },
    });
  },

  listForEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
