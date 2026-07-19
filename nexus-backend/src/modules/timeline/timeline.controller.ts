import { Request, Response, NextFunction } from 'express';
import { timelineService } from './timeline.service';
import { enrichWithRefs } from '../entity-ref/entityRef.service';
import { ok, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';

export const timelineController = {
  async getForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const events = await timelineService.getTimelineFor(entityType.toUpperCase(), entityId);
      return ok(res, await enrichWithRefs(events));
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
      const { items, total } = await timelineService.getGlobalTimeline({
        skip: pagination.skip,
        take: pagination.take,
        entityType,
        search: pagination.search,
      });
      return paginated(res, await enrichWithRefs(items), { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },
};
