import { Router } from 'express';
import { clientController } from './client.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Client-facing
router.get('/me', authenticate, clientController.me);

// Admin only
router.post('/convert/:leadId', authenticate, authorize('client.convert'), clientController.convert);
router.get('/', authenticate, authorize('client.view'), clientController.list);
router.get('/:id', authenticate, authorize('client.view'), clientController.getById);
router.patch('/:id', authenticate, authorize('client.edit'), clientController.update);

export default router;
