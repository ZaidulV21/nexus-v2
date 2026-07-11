import { Router } from 'express';
import { timelineController } from './timeline.controller';
import { authenticate } from '../../core/middleware/authenticate';

const router = Router();

router.get('/:entityType/:entityId', authenticate, timelineController.getForEntity);

export default router;
