import { Router } from 'express';
import { serviceController } from './service.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Public - service list and detail power the enquiry wizard
router.get('/', serviceController.list);
router.get('/:id', serviceController.getById);
router.get('/:id/questionnaire', serviceController.getQuestionnaire);

// Admin only
router.post('/', authenticate, authorize('service.manage'), serviceController.create);
router.put('/:id', authenticate, authorize('service.manage'), serviceController.update);
router.patch('/:id/disable', authenticate, authorize('service.manage'), serviceController.disable);

export default router;
