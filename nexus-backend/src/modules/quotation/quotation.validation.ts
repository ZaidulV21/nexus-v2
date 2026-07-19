import { z } from 'zod';

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
});

const quotationPayloadSchema = z.object({
  clientId: z.string().uuid('Client ID is required'), // REQUIRED - quotations are Client-only
  discount: z.number().nonnegative().optional(),
  transportation: z.number().nonnegative().optional(),
  installation: z.number().nonnegative().optional(),
  items: z.array(itemSchema).min(1, 'At least one line item is required'),
});

export const createQuotationSchema = quotationPayloadSchema;

// Omit ownership field (clientId) from revision schema - quotations already have ownership
export const reviseQuotationSchema = quotationPayloadSchema.omit({ clientId: true });

export const approveQuotationSchema = z.object({
  approvalMethod: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON']),
});

export const sendQuotationSchema = z.object({
  resend: z.boolean().optional(),
});

export const rejectQuotationSchema = z.object({
  reason: z.string().min(1, 'A reason is required to reject a quotation'),
});

export const requestQuotationRevisionSchema = z.object({
  reason: z.string().min(1, 'A reason is required to request a revision'),
});
