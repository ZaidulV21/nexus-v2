import { Router } from 'express';
import { contactMessageController } from './contact.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Public - visitors submit a support message from the /contact page. No auth,
// globally rate limited by the security middleware.
router.post('/', contactMessageController.submit);

// Admin only - the Support inbox.
router.get('/counts', authenticate, authorize('support.manage'), contactMessageController.counts);
router.get('/', authenticate, authorize('support.manage'), contactMessageController.list);
router.get('/:id', authenticate, authorize('support.manage'), contactMessageController.getById);
router.patch('/:id/read', authenticate, authorize('support.manage'), contactMessageController.markRead);
router.post('/:id/reply', authenticate, authorize('support.manage'), contactMessageController.reply);
router.patch('/:id/archive', authenticate, authorize('support.manage'), contactMessageController.archive);
router.patch('/:id/restore', authenticate, authorize('support.manage'), contactMessageController.restore);

export default router;
