import { prisma } from '../../config/database';
import { CreateCategoryInput } from './catalog.types';

export const categoryRepository = {
  create(input: CreateCategoryInput) {
    return prisma.category.create({ data: input });
  },

  update(id: string, input: Partial<CreateCategoryInput>) {
    return prisma.category.update({ where: { id }, data: input });
  },

  findById(id: string) {
    return prisma.category.findFirst({ where: { id } });
  },

  // Returns top-level categories with their children nested one level deep.
  // Sufficient for V1's expected depth (Category -> Sub-category); a deeper
  // recursive CTE can replace this later without changing the API shape.
  listTree() {
    return prisma.category.findMany({
      where: { parentCategoryId: null, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    });
  },

  disable(id: string) {
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  },
};
