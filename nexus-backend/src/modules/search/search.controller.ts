import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';
import { ok } from '../../core/utils/response';
import { ValidationError } from '../../core/errors/AppError';
import { SearchEntityType, SEARCH_ENTITY_TYPES } from './search.types';

export const searchController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '');
      if (!q) throw new ValidationError('Query parameter "q" is required');

      const rawType = req.query.type;
      let type: SearchEntityType | undefined;
      if (rawType && typeof rawType === 'string') {
        if (!SEARCH_ENTITY_TYPES.includes(rawType as SearchEntityType)) {
          throw new ValidationError(`Invalid type filter. Must be one of: ${SEARCH_ENTITY_TYPES.join(', ')}`);
        }
        type = rawType as SearchEntityType;
      }

      const results = await searchService.search(q, type);
      return ok(res, results);
    } catch (err) {
      next(err);
    }
  },
};
