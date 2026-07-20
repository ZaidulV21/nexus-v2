import { Router } from 'express';
import multer from 'multer';
import { companyController } from './company.controller';
import { authenticate } from '../../core/middleware/authenticate';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/settings', authenticate, companyController.get);
router.patch('/settings', authenticate, companyController.update);
router.post('/settings/upload', authenticate, upload.single('file'), companyController.upload);

export default router;
