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
};
