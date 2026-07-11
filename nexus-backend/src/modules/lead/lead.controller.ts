import { Request, Response, NextFunction } from 'express';
import { leadService } from './lead.service';
import {
  createLeadSchema,
  updateLeadSchema,
  addServiceToLeadSchema,
  updateLeadServiceStatusSchema,
  addNoteSchema,
} from './lead.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const leadController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createLeadSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid lead payload', parsed.error.flatten());
      const result = await leadService.createLead(parsed.data);
      return created(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await leadService.getById(req.params.id);
      return ok(res, lead);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateLeadSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const lead = await leadService.update(req.params.id, parsed.data, req.user?.id);
      return ok(res, lead);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { items, total } = await leadService.list(pagination);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async addService(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = addServiceToLeadSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const leadServiceRecord = await leadService.addServiceToLead(req.params.id, parsed.data, req.user?.id);
      return created(res, leadServiceRecord);
    } catch (err) {
      next(err);
    }
  },

  async updateServiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateLeadServiceStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await leadService.updateLeadServiceStatus(req.params.leadServiceId, parsed.data, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = addNoteSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const note = await leadService.addNote(req.params.id, req.user.id, parsed.data.note);
      return created(res, note);
    } catch (err) {
      next(err);
    }
  },

  async listNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await leadService.listNotes(req.params.id);
      return ok(res, notes);
    } catch (err) {
      next(err);
    }
  },
};
