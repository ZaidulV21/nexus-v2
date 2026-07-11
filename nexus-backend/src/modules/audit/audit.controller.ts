import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { ok } from '../../core/utils/response';

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
};
