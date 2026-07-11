import { Request, Response, NextFunction } from 'express';
import { quotationService } from './quotation.service';
import { createQuotationSchema, reviseQuotationSchema, approveQuotationSchema } from './quotation.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const quotationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = createQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid quotation payload', parsed.error.flatten());
      const quotation = await quotationService.create(parsed.data, req.user.id);
      return created(res, quotation);
    } catch (err) {
      next(err);
    }
  },

  async revise(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = reviseQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid quotation payload', parsed.error.flatten());
      const quotation = await quotationService.revise(req.params.id, parsed.data, req.user.id);
      return ok(res, quotation);
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = approveQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const quotation = await quotationService.approve(req.params.versionId, parsed.data, req.user.id);
      return ok(res, quotation);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const quotation = await quotationService.getById(req.params.id);
      return ok(res, quotation);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { items, total } = await quotationService.list(pagination);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },
};
