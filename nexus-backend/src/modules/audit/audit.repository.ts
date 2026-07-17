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

  // Global technical log (Admin Audit page). Newest first, optionally
  // narrowed by entity type, action, or a free-text search.
  async listGlobal(params: {
    skip: number;
    take: number;
    entityType?: string;
    action?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;
    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
        { entityId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  },
};
