import { Request, Response, NextFunction } from 'express';
import { clientService } from './client.service';
import { updateClientSchema } from './client.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const clientController = {
  async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.convertLeadToClient(req.params.leadId, req.user?.id);
      return created(res, client);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.getById(req.params.id);
      return ok(res, client);
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'CLIENT') throw new UnauthorizedError();
      const client = await clientService.getById(req.user.id);
      return ok(res, client);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateClientSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const client = await clientService.update(req.params.id, parsed.data, req.user?.id);
      return ok(res, client);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { items, total } = await clientService.list(pagination);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },
};
