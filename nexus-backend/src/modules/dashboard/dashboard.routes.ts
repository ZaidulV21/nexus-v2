import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.get('/admin/summary', authenticate, authorize('dashboard.view'), dashboardController.adminSummary);
router.get('/client/summary', authenticate, dashboardController.clientSummary);

export default router;
