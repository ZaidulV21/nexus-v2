import { prisma } from '../../config/database';

export interface PortfolioListParams {
  take?: number;
  serviceId?: string;
}

// Completed projects only (`completedAt` set by the explicit mark-complete
// action) - this is what makes the public Portfolio grow automatically as
// projects finish. Media is limited to visible items and ordered so the
// website can render a stable cover + gallery.
export const portfolioRepository = {
  listCompleted({ take = 100, serviceId }: PortfolioListParams) {
    return prisma.project.findMany({
      where: {
        deletedAt: null,
        completedAt: { not: null },
        ...(serviceId ? { projectServices: { some: { serviceId } } } : {}),
      },
      include: {
        client: true,
        media: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        projectServices: {
          include: { service: true },
        },
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  },

  countCompleted() {
    return prisma.project.count({
      where: { deletedAt: null, completedAt: { not: null } },
    });
  },
};
