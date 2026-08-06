import { Router } from 'express';
import multer from 'multer';
import { serviceController } from './service.controller';
import { subServiceController } from './subService.controller';
import { serviceMediaController } from './serviceMedia.controller';
import { authenticate, authenticateOptional } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Public - service list and detail power the enquiry wizard. Optional auth
// lets the admin panel reuse the same list endpoint with status filters, and
// lets admins view soft-deleted services (for the restore flow).
router.get('/', authenticateOptional, serviceController.list);
router.get('/:id', authenticateOptional, serviceController.getById);
router.get('/:id/questionnaire', serviceController.getQuestionnaire);

// Sub-services live under a service and resolve `:id` as either the service
// UUID (admin) or its public slug (public site). The public list endpoint
// returns only ACTIVE sub-services for the /services/:slug/:subSlug pages.
router.get('/:id/sub-services', authenticateOptional, subServiceController.listByService);

// Service marketing gallery (images + videos for the website showcase). Same
// `:id` resolution as sub-services; the public list returns only visible items.
router.get('/:id/media', authenticateOptional, serviceMediaController.listByService);

// Admin only
router.post('/', authenticate, authorize('service.manage'), serviceController.create);
router.put('/:id', authenticate, authorize('service.manage'), serviceController.update);
router.patch('/:id', authenticate, authorize('service.manage'), serviceController.update);
router.post('/:id/image', authenticate, authorize('service.manage'), upload.single('file'), serviceController.uploadImage);
router.delete('/:id/image', authenticate, authorize('service.manage'), serviceController.removeImage);
router.patch('/:id/disable', authenticate, authorize('service.manage'), serviceController.disable);
router.patch('/:id/archive', authenticate, authorize('service.manage'), serviceController.archive);
router.patch('/:id/restore', authenticate, authorize('service.manage'), serviceController.restore);
router.delete('/:id', authenticate, authorize('service.manage'), serviceController.softDelete);
router.post('/:id/undelete', authenticate, authorize('service.manage'), serviceController.undelete);
router.post('/:id/duplicate', authenticate, authorize('service.manage'), serviceController.duplicate);

// Service gallery admin routes
router.post('/:id/media/upload', authenticate, authorize('service.manage'), upload.single('file'), serviceMediaController.upload);
router.post('/:id/media/:mediaId/poster', authenticate, authorize('service.manage'), upload.single('file'), serviceMediaController.uploadPoster);
router.post('/:id/media', authenticate, authorize('service.manage'), serviceMediaController.create);
router.patch('/:id/media/:mediaId', authenticate, authorize('service.manage'), serviceMediaController.update);
router.post('/:id/media/reorder', authenticate, authorize('service.manage'), serviceMediaController.reorder);
router.post('/:id/media/:mediaId/feature', authenticate, authorize('service.manage'), serviceMediaController.setFeatured);
router.delete('/:id/media/:mediaId', authenticate, authorize('service.manage'), serviceMediaController.remove);

// Sub-service admin routes
router.post('/:id/sub-services', authenticate, authorize('service.manage'), subServiceController.create);
router.post('/:id/sub-services/reorder', authenticate, authorize('service.manage'), subServiceController.reorder);
router.put('/:id/sub-services/:subId', authenticate, authorize('service.manage'), subServiceController.update);
router.patch('/:id/sub-services/:subId', authenticate, authorize('service.manage'), subServiceController.update);
router.post(
  '/:id/sub-services/:subId/image',
  authenticate,
  authorize('service.manage'),
  upload.single('file'),
  subServiceController.uploadImage,
);
router.delete('/:id/sub-services/:subId/image', authenticate, authorize('service.manage'), subServiceController.removeImage);
router.patch('/:id/sub-services/:subId/disable', authenticate, authorize('service.manage'), subServiceController.disable);
router.patch('/:id/sub-services/:subId/archive', authenticate, authorize('service.manage'), subServiceController.archive);
router.patch('/:id/sub-services/:subId/restore', authenticate, authorize('service.manage'), subServiceController.restore);
router.delete('/:id/sub-services/:subId', authenticate, authorize('service.manage'), subServiceController.softDelete);
router.post('/:id/sub-services/:subId/undelete', authenticate, authorize('service.manage'), subServiceController.undelete);
router.post('/:id/sub-services/:subId/duplicate', authenticate, authorize('service.manage'), subServiceController.duplicate);

export default router;
