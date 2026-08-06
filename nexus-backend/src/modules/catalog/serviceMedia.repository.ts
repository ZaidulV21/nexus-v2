import { prisma } from '../../config/database';
import { CreateServiceMediaInput, UpdateServiceMediaInput } from './catalog.types';

export const serviceMediaRepository = {
  create(serviceId: string, input: CreateServiceMediaInput) {
    return prisma.serviceMedia.create({ data: { ...input, serviceId } as any });
  },

  update(id: string, input: UpdateServiceMediaInput) {
    return prisma.serviceMedia.update({ where: { id }, data: input as any });
  },

  findById(id: string) {
    return prisma.serviceMedia.findFirst({ where: { id } });
  },

  // Ordered by sortOrder then creation time so the admin and public site both
  // see a stable, predictable sequence.
  listByService(serviceId: string, onlyActive: boolean, { take = 10000 }: { take?: number } = {}) {
    return prisma.serviceMedia.findMany({
      where: { serviceId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  },

  // Bulk-apply a manual sort order in a single transaction so the ordered
  // list can never be left half-applied.
  reorder(orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.serviceMedia.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },

  // Only one item per service can be featured: clearing the others and setting
  // the target happen atomically.
  setFeatured(serviceId: string, mediaId: string) {
    return prisma.$transaction([
      prisma.serviceMedia.updateMany({
        where: { serviceId, isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.serviceMedia.update({ where: { id: mediaId }, data: { isFeatured: true } }),
    ]);
  },

  setActive(id: string, isActive: boolean) {
    return prisma.serviceMedia.update({ where: { id }, data: { isActive } });
  },

  // Gallery items are lightweight, throwaway records: hard delete is fine
  // (unlike services/sub-services which are soft-deleted for historical
  // references).
  hardDelete(id: string) {
    return prisma.serviceMedia.delete({ where: { id } });
  },
};
