import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { ok, created } from '../../core/utils/response';
import { ValidationError } from '../../core/errors/AppError';

export const categoryController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid category payload', parsed.error.flatten());
      const category = await categoryService.create(parsed.data);
      return created(res, category);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid category payload', parsed.error.flatten());
      const category = await categoryService.update(req.params.id, parsed.data);
      return ok(res, category);
    } catch (err) {
      next(err);
    }
  },

  async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await categoryService.getTree();
      return ok(res, tree);
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.disable(req.params.id);
      return ok(res, category);
    } catch (err) {
      next(err);
    }
  },
};
