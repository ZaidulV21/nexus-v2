import { Router } from 'express';
import { timelineController } from './timeline.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Global business-activity feed - Admin only (clients see per-entity
// timelines on their own detail pages, never the global feed).
router.get('/', authenticate, authorize('dashboard.view'), timelineController.getGlobal);
router.get('/:entityType/:entityId', authenticate, timelineController.getForEntity);

export default router;
