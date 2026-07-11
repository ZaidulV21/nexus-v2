import { Request, Response, NextFunction } from 'express';
import { adminDashboardService, clientDashboardService } from './adminDashboard.service';
import { ok } from '../../core/utils/response';
import { UnauthorizedError } from '../../core/errors/AppError';

export const dashboardController = {
  async adminSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await adminDashboardService.getSummary();
      return ok(res, summary);
    } catch (err) {
      next(err);
    }
  },

  async clientSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'CLIENT') throw new UnauthorizedError();
      const summary = await clientDashboardService.getSummary(req.user.id);
      return ok(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
