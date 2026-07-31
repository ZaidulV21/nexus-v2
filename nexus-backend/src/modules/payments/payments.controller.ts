import { Request, Response, NextFunction } from 'express';
import { createRazorpayOrder, verifyPayment } from './payments.service';
import { createOrderSchema, verifyPaymentSchema } from './payments.validation';
import { ok, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { paymentRepository } from '../invoice/invoice.repository';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export async function handleCreateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
    const result = await createRazorpayOrder(parsed.data.invoiceId, req.user.id);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
    const result = await verifyPayment(parsed.data, req.user.id);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function handleListPayments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const pagination = parsePagination(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    const { items, total } = await paymentRepository.listAll({
      skip: pagination.skip,
      take: pagination.take,
      search: pagination.search,
      status,
      clientId,
      invoiceId,
      projectId,
      dateFrom,
      dateTo,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });

    return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
  } catch (err) {
    next(err);
  }
}
