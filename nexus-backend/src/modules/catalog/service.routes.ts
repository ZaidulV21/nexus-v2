import { Router } from 'express';
import multer from 'multer';
import { serviceController } from './service.controller';
import { authenticate, authenticateOptional } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Public - service list and detail power the enquiry wizard. Optional auth
// lets the admin panel reuse the same list endpoint with status filters.
router.get('/', authenticateOptional, serviceController.list);
router.get('/:id', serviceController.getById);
router.get('/:id/questionnaire', serviceController.getQuestionnaire);

// Admin only
router.post('/', authenticate, authorize('service.manage'), serviceController.create);
router.put('/:id', authenticate, authorize('service.manage'), serviceController.update);
router.patch('/:id', authenticate, authorize('service.manage'), serviceController.update);
router.post('/:id/image', authenticate, authorize('service.manage'), upload.single('file'), serviceController.uploadImage);
router.delete('/:id/image', authenticate, authorize('service.manage'), serviceController.removeImage);
router.patch('/:id/disable', authenticate, authorize('service.manage'), serviceController.disable);
router.patch('/:id/archive', authenticate, authorize('service.manage'), serviceController.archive);
router.patch('/:id/restore', authenticate, authorize('service.manage'), serviceController.restore);

export default router;
