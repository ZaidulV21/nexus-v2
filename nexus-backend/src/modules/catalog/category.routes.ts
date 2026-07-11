import { Router } from 'express';
import { categoryController } from './category.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Public - used by the enquiry wizard
router.get('/', categoryController.getTree);

// Admin only
router.post('/', authenticate, authorize('category.manage'), categoryController.create);
router.put('/:id', authenticate, authorize('category.manage'), categoryController.update);
router.patch('/:id/disable', authenticate, authorize('category.manage'), categoryController.disable);

export default router;
