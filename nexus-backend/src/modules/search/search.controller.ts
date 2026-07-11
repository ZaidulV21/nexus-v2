import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';
import { ok } from '../../core/utils/response';
import { ValidationError } from '../../core/errors/AppError';

export const searchController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '');
      if (!q) throw new ValidationError('Query parameter "q" is required');
      const results = await searchService.search(q);
      return ok(res, results);
    } catch (err) {
      next(err);
    }
  },
};
