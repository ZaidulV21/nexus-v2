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
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  },

  // Idempotency guard: identical business events recorded in a short window are
  // treated as accidental duplicates and skipped. Payment-related events pass a
  // dedupeKey (paymentId / gateway transaction id) so the identity becomes
  // (entityType, entityId, eventType, dedupeKey): two legitimate payments on
  // the same invoice are distinct, while a retry of the SAME payment still
  // matches and is ignored. Non-payment events keep dedupeKey NULL and keep the
  // historical (entityType, entityId, eventType) behaviour.
  findRecentDuplicate(
    entityType: string,
    entityId: string,
    eventType: string,
    withinMs: number,
    dedupeKey?: string
  ) {
    const since = new Date(Date.now() - withinMs);
    return prisma.timelineEvent.findFirst({
      where: {
        entityType,
        entityId,
        eventType,
        createdAt: { gte: since },
        dedupeKey: dedupeKey ?? null,
      },
      orderBy: { createdAt: 'desc' },
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
