import { Router } from 'express';
import { pdfController } from './pdf.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

router.post('/generate', authenticate, authorize('quotation.create'), pdfController.generate);
router.get('/:documentType/:documentId', authenticate, pdfController.download);
router.post('/:documentType/:documentId/regenerate', authenticate, authorize('quotation.create'), pdfController.regenerate);

export default router;
