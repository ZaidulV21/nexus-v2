import { z } from 'zod';

// Lowercase letters, numbers and single hyphens — a clean, URL-safe segment.
export const serviceSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

export const createServiceSchema = z.object({
  // Not .uuid() - seeded categories use readable fixed ids ("seed-energy").
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: serviceSlugSchema.optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  icon: z.string().max(50).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  bannerImage: z.string().url().optional().or(z.literal('')),
  thumbnail: z.string().url().optional().or(z.literal('')),
  heroImage: z.string().url().optional().or(z.literal('')),
  basePrice: z.number().nonnegative().optional(),
  estimatedDuration: z.string().max(120).optional(),
  requiresSiteVisit: z.enum(['YES', 'NO', 'OPTIONAL']).default('OPTIONAL'),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  seoTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  metaKeywords: z.string().max(300).optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const serviceListFiltersSchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'DELETED']).optional(),
  categoryId: z.string().min(1).optional(),
  featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  popular: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});
