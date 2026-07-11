import { Router } from 'express';
import { conversationController } from './conversation.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Admin - list all client conversations with unread previews
router.get('/', authenticate, authorize('message.view'), conversationController.listAll);

// Shared by both Admin and Client (permission enforced inside the service
// via assertAccess, not via authorize(), since a Client is not role ADMIN)
router.post('/:clientId/messages', authenticate, conversationController.sendMessage);
router.get('/:clientId/messages', authenticate, conversationController.listMessages);
router.patch('/:clientId/messages/read', authenticate, conversationController.markRead);

export default router;
