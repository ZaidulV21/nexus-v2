import { Router } from 'express';
import { authenticate, requireActorType } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import {
  handleCreateOrder,
  handleVerifyPayment,
  handleListPayments,
  handleRefundPayment,
  handleWebhook,
} from './payments.controller';

const router = Router();

// Public (signature-authenticated) webhook endpoint for Razorpay. The raw body
// is preserved by express.raw() mounted on this exact path in app.ts; the
// X-Razorpay-Signature header is verified inside handleRazorpayWebhook.
router.post('/webhook', handleWebhook);

router.post('/create-order', authenticate, requireActorType('CLIENT'), handleCreateOrder);
router.post('/verify', authenticate, requireActorType('CLIENT'), handleVerifyPayment);
router.post('/:paymentId/refund', authenticate, authorize('invoice.create'), handleRefundPayment);
router.get('/', authenticate, authorize('invoice.view'), handleListPayments);

export default router;
