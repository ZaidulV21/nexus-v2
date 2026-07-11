import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { createProjectSchema, addServiceToProjectSchema, updateProjectServiceStatusSchema } from './project.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const projectController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid project payload', parsed.error.flatten());
      const project = await projectService.create(parsed.data, req.user.id);
      return created(res, project);
    } catch (err) {
      next(err);
    }
  },

  async addService(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = addServiceToProjectSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const projectServiceRecord = await projectService.addServiceToProject(req.params.id, parsed.data, req.user.id);
      return created(res, projectServiceRecord);
    } catch (err) {
      next(err);
    }
  },

  async updateServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateProjectServiceStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await projectService.updateProjectServiceStatus(req.params.projectServiceId, parsed.data, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.complete(req.params.id, req.user?.id);
      return ok(res, project);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(req.params.id);
      return ok(res, project);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { items, total } = await projectService.list(pagination);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },
};
