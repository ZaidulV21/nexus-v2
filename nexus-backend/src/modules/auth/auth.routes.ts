import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../core/middleware/authenticate';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
