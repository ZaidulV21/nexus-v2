import { Request, Response, NextFunction } from 'express';
import { portfolioService } from './portfolio.service';
import { ok } from '../../core/utils/response';

// Public endpoints - no auth. The Portfolio is fed entirely by the explicit
// project completion action, so it grows automatically with zero manual setup.
export const portfolioController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const serviceSlug = typeof req.query.serviceSlug === 'string' ? req.query.serviceSlug : undefined;
      const items = await portfolioService.list({ limit, serviceSlug });
      return ok(res, items);
    } catch (err) {
      next(err);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await portfolioService.summary();
      return ok(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
