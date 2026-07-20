import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../core/middleware/authenticate';

const router = Router();

router.get('/', authenticate, notificationsController.list);
router.get('/unread-count', authenticate, notificationsController.unreadCount);
router.patch('/read-all', authenticate, notificationsController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationsController.markAsRead);

export default router;
