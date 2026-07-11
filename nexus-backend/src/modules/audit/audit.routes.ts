import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Admin-only, technical log view (PRD: Audit Log is technical, not client-facing)
router.get('/:entityType/:entityId', authenticate, authorize('audit.view'), auditController.getForEntity);

export default router;
