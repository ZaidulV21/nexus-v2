import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { ok, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const auditController = {
  async getForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const logs = await auditService.getAuditFor(entityType.toUpperCase(), entityId);
      return ok(res, logs);
    } catch (err) {
      next(err);
    }
  },

  async getGlobal(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const entityType =
        typeof req.query.entityType === 'string' && req.query.entityType
          ? req.query.entityType.toUpperCase()
          : undefined;
      const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
      const { items, total } = await auditService.getGlobalAudit({
        skip: pagination.skip,
        take: pagination.take,
        entityType,
        action,
        search: pagination.search,
      });
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },
};
