import { Request, Response, NextFunction } from 'express';
import { contactMessageService } from './contact.service';
import {
  createContactMessageSchema,
  replyContactMessageSchema,
  contactMessageListFiltersSchema,
} from './contact.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError } from '../../core/errors/AppError';

export const contactMessageController = {
  // Public - anyone can submit a support message (rate limited globally).
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createContactMessageSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid message payload', parsed.error.flatten());
      const message = await contactMessageService.submit(parsed.data);
      return created(res, message);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const parsedFilters = contactMessageListFiltersSchema.safeParse({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      if (!parsedFilters.success) throw new ValidationError('Invalid filters', parsedFilters.error.flatten());

      const { items, total } = await contactMessageService.list(pagination, parsedFilters.data);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactMessageService.getById(req.params.id);
      return ok(res, message);
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactMessageService.markRead(req.params.id);
      return ok(res, message);
    } catch (err) {
      next(err);
    }
  },

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = replyContactMessageSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid reply payload', parsed.error.flatten());
      const message = await contactMessageService.reply(req.params.id, parsed.data, req.user?.id);
      return ok(res, message);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactMessageService.archive(req.params.id);
      return ok(res, message);
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactMessageService.restore(req.params.id);
      return ok(res, message);
    } catch (err) {
      next(err);
    }
  },

  async counts(req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await contactMessageService.counts();
      return ok(res, counts);
    } catch (err) {
      next(err);
    }
  },
};
