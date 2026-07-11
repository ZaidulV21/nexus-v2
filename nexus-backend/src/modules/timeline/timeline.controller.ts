import { Request, Response, NextFunction } from 'express';
import { timelineService } from './timeline.service';
import { ok } from '../../core/utils/response';

export const timelineController = {
  async getForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const events = await timelineService.getTimelineFor(entityType.toUpperCase(), entityId);
      return ok(res, events);
    } catch (err) {
      next(err);
    }
  },
};
