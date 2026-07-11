import { Router } from 'express';
import { projectController } from './project.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize('project.create'), projectController.create);
router.get('/', authenticate, authorize('project.view'), projectController.list);
router.get('/:id', authenticate, authorize('project.view'), projectController.getById);
router.post('/:id/services', authenticate, authorize('project.edit'), projectController.addService);
router.patch('/services/:projectServiceId/status', authenticate, authorize('project.edit'), projectController.updateServiceStatus);
router.post('/:id/complete', authenticate, authorize('project.edit'), projectController.complete);

export default router;
