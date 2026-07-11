import { Router } from 'express';
import { quotationController } from './quotation.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize('quotation.create'), quotationController.create);
router.get('/', authenticate, authorize('quotation.view'), quotationController.list);
router.get('/:id', authenticate, authorize('quotation.view'), quotationController.getById);
router.post('/:id/revise', authenticate, authorize('quotation.create'), quotationController.revise);
router.post('/versions/:versionId/approve', authenticate, authorize('quotation.approve'), quotationController.approve);

export default router;
