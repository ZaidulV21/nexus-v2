import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { ok, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const notificationsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));

      const pagination = parsePagination(req);
      const isReadStr = typeof req.query.isRead === 'string' ? req.query.isRead : undefined;
      const isRead = isReadStr === 'true' ? true : isReadStr === 'false' ? false : undefined;

      const { items, total } = await notificationsService.listByRecipient({
        recipientId: req.user.id,
        recipientType: req.user.type,
        isRead,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });

      return paginated(res, items, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      });
    } catch (err) {
      next(err);
    }
  },

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const count = await notificationsService.getUnreadCount(req.user.id, req.user.type);
      return ok(res, { count });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const { id } = req.params;
      const result = await notificationsService.markAsRead(id, req.user.id);
      return ok(res, { updated: result.count });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Unauthorized'));
      const result = await notificationsService.markAllAsRead(req.user.id, req.user.type);
      return ok(res, { updated: result.count });
    } catch (err) {
      next(err);
    }
  },
};
