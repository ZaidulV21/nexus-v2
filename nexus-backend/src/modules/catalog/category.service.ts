import { categoryRepository } from './category.repository';
import { CreateCategoryInput } from './catalog.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';

export const categoryService = {
  async create(input: CreateCategoryInput) {
    if (input.parentCategoryId) {
      const parent = await categoryRepository.findById(input.parentCategoryId);
      if (!parent) throw new ValidationError('parentCategoryId does not reference an existing category');
    }
    return categoryRepository.create(input);
  },

  async update(id: string, input: Partial<CreateCategoryInput>) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found');
    return categoryRepository.update(id, input);
  },

  async getTree() {
    return categoryRepository.listTree();
  },

  async disable(id: string) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found');
    return categoryRepository.disable(id);
  },
};
