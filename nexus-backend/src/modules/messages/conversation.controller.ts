import { Request, Response, NextFunction } from 'express';
import { conversationService } from './conversation.service';
import { sendMessageSchema } from './messages.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

export const conversationController = {
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid message payload', parsed.error.flatten());
      const message = await conversationService.sendMessage(req.params.clientId, parsed.data.body, req.user);
      return created(res, message);
    } catch (err) {
      next(err);
    }
  },

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const pagination = parsePagination(req);
      const { items, total } = await conversationService.listMessages(req.params.clientId, pagination, req.user);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await conversationService.markRead(req.params.clientId, req.user);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await conversationService.listAllConversations();
      return ok(res, conversations);
    } catch (err) {
      next(err);
    }
  },
};
