import { Request, Response, NextFunction } from 'express';
import { invoiceService } from './invoice.service';
import { createInvoiceSchema, cancelInvoiceSchema, recordPaymentSchema } from './invoice.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const invoiceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid invoice payload', parsed.error.flatten());
      const invoice = await invoiceService.create(parsed.data, req.user.id);
      return created(res, invoice);
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = cancelInvoiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('A reason is required', parsed.error.flatten());
      const invoice = await invoiceService.cancel(req.params.id, parsed.data, req.user.id);
      return ok(res, invoice);
    } catch (err) {
      next(err);
    }
  },

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const invoice = await invoiceService.send(req.params.id, req.user.id, !!req.body?.resend);
      return ok(res, invoice);
    } catch (err) {
      next(err);
    }
  },

  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = recordPaymentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payment payload', parsed.error.flatten());
      const payment = await invoiceService.recordPayment(req.params.id, parsed.data, req.user.id);
      return created(res, payment);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await invoiceService.getById(req.params.id);
      return ok(res, invoice);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { items, total } = await invoiceService.list(pagination);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async listForProject(req: Request, res: Response, next: NextFunction) {
    try {
      const invoices = await invoiceService.listForProject(req.params.projectId);
      return ok(res, invoices);
    } catch (err) {
      next(err);
    }
  },

  async listForClient(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'CLIENT') throw new UnauthorizedError();
      const invoices = await invoiceService.listForClient(req.user.id);
      return ok(res, invoices);
    } catch (err) {
      next(err);
    }
  },

  async getForClient(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'CLIENT') throw new UnauthorizedError();
      const invoice = await invoiceService.getForClient(req.params.id, req.user.id);
      return ok(res, invoice);
    } catch (err) {
      next(err);
    }
  },

  async projectFinancialSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await invoiceService.getProjectFinancialSummary(req.params.projectId);
      return ok(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
