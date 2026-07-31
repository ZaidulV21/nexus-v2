import { z } from 'zod';

export const createOrderSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
