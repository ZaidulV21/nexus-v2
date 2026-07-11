import { z } from 'zod';

const itemSchema = z.object({
  serviceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
});

export const createQuotationSchema = z.object({
  leadId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  discount: z.number().nonnegative().optional(),
  transportation: z.number().nonnegative().optional(),
  installation: z.number().nonnegative().optional(),
  items: z.array(itemSchema).min(1, 'At least one line item is required'),
});

export const reviseQuotationSchema = createQuotationSchema.omit({ leadId: true, clientId: true });

export const approveQuotationSchema = z.object({
  approvalMethod: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON']),
});
