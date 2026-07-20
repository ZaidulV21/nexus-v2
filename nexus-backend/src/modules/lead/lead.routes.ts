import { Router } from 'express';
import { leadController } from './lead.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Public - the enquiry wizard submission
router.post('/', leadController.create);

// Admin only
router.get('/', authenticate, authorize('lead.view'), leadController.list);
router.get('/:id', authenticate, authorize('lead.view'), leadController.getById);
router.patch('/:id', authenticate, authorize('lead.edit'), leadController.update);
router.post('/:id/services', authenticate, authorize('lead.edit'), leadController.addService);
router.patch('/:leadServiceId/status', authenticate, authorize('lead.edit'), leadController.updateServiceStatus);
router.post('/:id/notes', authenticate, authorize('lead.edit'), leadController.addNote);
router.get('/:id/notes', authenticate, authorize('lead.view'), leadController.listNotes);

// Archive / Restore (Admin only)
router.patch('/:id/archive', authenticate, authorize('lead.edit'), leadController.archive);
router.patch('/:id/restore', authenticate, authorize('lead.edit'), leadController.restore);

export default router;
