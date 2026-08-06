import { z } from 'zod';

// Same rules as the service slug: lowercase letters, numbers, single hyphens.
export const serviceSlugSchema = z
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

const testimonialSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200),
  company: z.string().max(200),
  content: z.string().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  avatar: z.string().url().optional().or(z.literal('')),
});

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
  features: z.array(z.string().min(1).max(500)).max(100).optional(),
  whatsIncluded: z.array(z.string().min(1).max(500)).max(100).optional(),
  process: z.array(processStepSchema).max(50).optional(),
  faqs: z.array(faqSchema).max(100).optional(),
  testimonials: z.array(testimonialSchema).max(100).optional(),
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
