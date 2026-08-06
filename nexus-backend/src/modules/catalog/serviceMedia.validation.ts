import { z } from 'zod';

const urlField = z.string().url().max(2000).or(z.literal(''));

export const createServiceMediaSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().url().max(2000),
  posterUrl: urlField.optional(),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// URL and type are immutable after creation; only presentation + visibility
// can change.
export const updateServiceMediaSchema = z.object({
  posterUrl: urlField.optional(),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const serviceMediaReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
