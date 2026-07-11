import { z } from 'zod';

export const createServiceSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  basePrice: z.number().nonnegative().optional(),
  requiresSiteVisit: z.enum(['YES', 'NO', 'OPTIONAL']),
});

export const updateServiceSchema = createServiceSchema.partial();
