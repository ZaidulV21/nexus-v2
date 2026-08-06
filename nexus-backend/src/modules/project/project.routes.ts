import { Router } from 'express';
import multer from 'multer';
import { projectController } from './project.controller';
import { projectMediaController } from './projectMedia.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/', authenticate, authorize('project.create'), projectController.create);
router.get('/', authenticate, authorize('project.view'), projectController.list);
router.get('/me', authenticate, projectController.listForClient);
router.get('/me/:id', authenticate, projectController.getForClient);
router.get('/:id', authenticate, authorize('project.view'), projectController.getById);
router.post('/:id/services', authenticate, authorize('project.edit'), projectController.addService);
router.patch('/:id', authenticate, authorize('project.edit'), projectController.updateTitle);
router.patch('/services/:projectServiceId/status', authenticate, authorize('project.edit'), projectController.updateServiceStatus);
router.post('/:id/complete', authenticate, authorize('project.edit'), projectController.complete);

// Completion media (portfolio gallery) - admin CRUD on a completed project.
router.get('/:id/media', authenticate, authorize('project.view'), projectMediaController.listByProject);
router.post('/:id/media/upload', authenticate, authorize('project.edit'), upload.single('file'), projectMediaController.upload);
router.post('/:id/media/:mediaId/poster', authenticate, authorize('project.edit'), upload.single('file'), projectMediaController.uploadPoster);
router.post('/:id/media', authenticate, authorize('project.edit'), projectMediaController.create);
router.patch('/:id/media/:mediaId', authenticate, authorize('project.edit'), projectMediaController.update);
router.post('/:id/media/reorder', authenticate, authorize('project.edit'), projectMediaController.reorder);
router.post('/:id/media/:mediaId/feature', authenticate, authorize('project.edit'), projectMediaController.setFeatured);
router.delete('/:id/media/:mediaId', authenticate, authorize('project.edit'), projectMediaController.remove);

export default router;
