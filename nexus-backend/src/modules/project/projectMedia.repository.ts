import { prisma } from '../../config/database';
import { CreateProjectMediaInput, UpdateProjectMediaInput } from './project.types';

export const projectMediaRepository = {
  create(projectId: string, input: CreateProjectMediaInput) {
    return prisma.projectMedia.create({ data: { ...input, projectId } as any });
  },

  update(id: string, input: UpdateProjectMediaInput) {
    return prisma.projectMedia.update({ where: { id }, data: input as any });
  },

  findById(id: string) {
    return prisma.projectMedia.findFirst({ where: { id } });
  },

  listByProject(projectId: string, onlyActive: boolean) {
    return prisma.projectMedia.findMany({
      where: { projectId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  // Bulk-apply a manual sort order in a single transaction so the ordered
  // list can never be left half-applied.
  reorder(orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.projectMedia.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },

  // Only one item per project can be featured (the portfolio cover): clearing
  // the others and setting the target happen atomically.
  setFeatured(projectId: string, mediaId: string) {
    return prisma.$transaction([
      prisma.projectMedia.updateMany({
        where: { projectId, isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.projectMedia.update({ where: { id: mediaId }, data: { isFeatured: true } }),
    ]);
  },

  setActive(id: string, isActive: boolean) {
    return prisma.projectMedia.update({ where: { id }, data: { isActive } });
  },

  // Completion-media records are lightweight, throwaway records: hard delete
  // is fine (unlike projects which are soft-deleted for historical records).
  hardDelete(id: string) {
    return prisma.projectMedia.delete({ where: { id } });
  },
};
