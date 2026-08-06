import { z } from 'zod';

// Same rules as the service slug: lowercase letters, numbers, single hyphens.
export const subServiceSlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

const processStepSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000),
});

const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
});

export const createSubServiceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: subServiceSlugSchema.optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().max(10000).optional(),
  icon: z.string().max(50).optional(),
  heroImage: z.string().url().optional().or(z.literal('')),
  gallery: z.array(z.string().url()).max(50).optional(),
  features: z.array(z.string().min(1).max(500)).max(100).optional(),
  whatsIncluded: z.array(z.string().min(1).max(500)).max(100).optional(),
  process: z.array(processStepSchema).max(50).optional(),
  faqs: z.array(faqSchema).max(100).optional(),
  startingPrice: z.string().max(120).optional(),
  completionTime: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  seoTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  metaKeywords: z.string().max(300).optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
});

export const updateSubServiceSchema = createSubServiceSchema.partial();

export const subServiceListFiltersSchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'DELETED']).optional(),
  search: z.string().max(120).optional(),
});

export const subServiceReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
