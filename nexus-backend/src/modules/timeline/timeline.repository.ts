import { prisma } from '../../config/database';
import { RecordEventInput } from './timeline.types';

export const timelineRepository = {
  create(input: RecordEventInput) {
    return prisma.timelineEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        eventType: input.eventType,
        description: input.description,
        actorUserId: input.actorUserId,
        metadata: input.metadata as any,
      },
    });
  },

  listForEntity(entityType: string, entityId: string) {
    return prisma.timelineEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  },

  // Global business-activity feed (Admin Timeline page). Newest first,
  // optionally narrowed by entity type and/or a description/event search.
  async listGlobal(params: {
    skip: number;
    take: number;
    entityType?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.entityType) where.entityType = params.entityType;
    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: 'insensitive' } },
        { eventType: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.timelineEvent.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.timelineEvent.count({ where }),
    ]);
    return { items, total };
  },
};
