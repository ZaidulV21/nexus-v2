import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize('invoice.create'), invoiceController.create);
router.get('/', authenticate, authorize('invoice.view'), invoiceController.list);
router.get('/:id', authenticate, authorize('invoice.view'), invoiceController.getById);
router.patch('/:id/cancel', authenticate, authorize('invoice.cancel'), invoiceController.cancel);
router.post('/:id/payments', authenticate, authorize('invoice.create'), invoiceController.recordPayment);
router.get('/project/:projectId/financial-summary', authenticate, authorize('invoice.view'), invoiceController.projectFinancialSummary);

export default router;
