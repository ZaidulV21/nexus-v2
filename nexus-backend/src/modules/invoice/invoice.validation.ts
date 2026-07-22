import { z } from 'zod';

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  hsnSacCode: z.string().min(1),
  taxRate: z.number().min(0).max(100),
});

export const createInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  clientId: z.string().uuid(),
  label: z.string().min(1),
  items: z.array(itemSchema).min(1, 'At least one line item is required'),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1, 'A reason is required to cancel an invoice'),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than zero'),
  method: z.string().min(1, 'Payment method is required'),
  transactionReference: z.string().optional(),
  referenceNote: z.string().optional(),
});
