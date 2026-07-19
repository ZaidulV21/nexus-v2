import { z } from 'zod';

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
});

const quotationPayloadSchema = z.object({
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  discount: z.number().nonnegative().optional(),
  transportation: z.number().nonnegative().optional(),
  installation: z.number().nonnegative().optional(),
  items: z.array(itemSchema).min(1, 'At least one line item is required'),
});

export const createQuotationSchema = quotationPayloadSchema
  .refine((data) => data.leadId || data.clientId, {
    message: 'Either leadId or clientId is required',
  })
  .refine((data) => !(data.leadId && data.clientId), {
    message: 'Cannot specify both leadId and clientId',
  });

// Omit ownership fields before applying the create-only XOR refinements.
// ZodEffects (the result of refine) intentionally has no .omit() method.
export const reviseQuotationSchema = quotationPayloadSchema.omit({ leadId: true, clientId: true });

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
