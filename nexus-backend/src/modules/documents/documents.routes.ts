import { Router } from 'express';
import multer from 'multer';
import { documentsController } from './documents.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/', authenticate, authorize('document.upload'), upload.single('file'), documentsController.upload);
router.get('/', authenticate, documentsController.listForEntity);
router.get('/:id/download', authenticate, documentsController.download);
router.delete('/:id', authenticate, authorize('document.delete'), documentsController.remove);

export default router;
