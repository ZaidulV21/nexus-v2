import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize('invoice.create'), invoiceController.create);
router.get('/', authenticate, authorize('invoice.view'), invoiceController.list);
router.get('/me', authenticate, invoiceController.listForClient);
router.get('/me/:id', authenticate, invoiceController.getForClient);
router.get('/project/:projectId', authenticate, authorize('invoice.view'), invoiceController.listForProject);
router.get('/project/:projectId/financial-summary', authenticate, authorize('invoice.view'), invoiceController.projectFinancialSummary);
router.get('/:id', authenticate, authorize('invoice.view'), invoiceController.getById);
router.post('/:id/send', authenticate, authorize('invoice.create'), invoiceController.send);
router.patch('/:id/cancel', authenticate, authorize('invoice.cancel'), invoiceController.cancel);
router.post('/:id/payments', authenticate, authorize('invoice.create'), invoiceController.recordPayment);

export default router;
