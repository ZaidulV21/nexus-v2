import { z } from 'zod';

export const createServiceSchema = z.object({
  // Not .uuid() - seeded categories use readable fixed ids ("seed-energy").
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  icon: z.string().optional(),
  basePrice: z.number().nonnegative().optional(),
  estimatedDuration: z.string().max(120).optional(),
  requiresSiteVisit: z.enum(['YES', 'NO', 'OPTIONAL']).default('OPTIONAL'),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const serviceListFiltersSchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  categoryId: z.string().min(1).optional(),
});
