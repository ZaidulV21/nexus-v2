import { Request, Response, NextFunction } from 'express';
import { serviceService } from './service.service';
import { createServiceSchema, updateServiceSchema, serviceListFiltersSchema } from './service.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError } from '../../core/errors/AppError';

export const serviceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid service payload', parsed.error.flatten());
      const service = await serviceService.create(parsed.data, req.user?.id);
      return created(res, service);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid service payload', parsed.error.flatten());
      const service = await serviceService.update(req.params.id, parsed.data, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.disable(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.archive(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.restore(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.getById(req.params.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      // Public callers (no req.user) only ever see active services.
      const onlyActive = !req.user;

      const parsedFilters = serviceListFiltersSchema.safeParse({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
      });
      if (!parsedFilters.success) throw new ValidationError('Invalid service filters', parsedFilters.error.flatten());

      const { items, total } = await serviceService.list(pagination, onlyActive, parsedFilters.data);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async getQuestionnaire(req: Request, res: Response, next: NextFunction) {
    try {
      const questionnaire = await serviceService.getQuestionnaire(req.params.id);
      return ok(res, questionnaire);
    } catch (err) {
      next(err);
    }
  },
};
