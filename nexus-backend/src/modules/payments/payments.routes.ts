import { Router } from 'express';
import { authenticate, requireActorType } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { handleCreateOrder, handleVerifyPayment, handleListPayments } from './payments.controller';

const router = Router();

router.post('/create-order', authenticate, requireActorType('CLIENT'), handleCreateOrder);
router.post('/verify', authenticate, requireActorType('CLIENT'), handleVerifyPayment);
router.get('/', authenticate, authorize('invoice.view'), handleListPayments);

export default router;
