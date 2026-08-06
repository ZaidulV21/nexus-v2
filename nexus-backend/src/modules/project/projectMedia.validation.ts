import { z } from 'zod';

const urlField = z.string().url().max(2000).or(z.literal(''));

export const createProjectMediaSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
  url: z.string().url().max(2000),
  posterUrl: urlField.optional(),
  title: z.string().max(200).optional(),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(),
  fileSize: z.number().int().nonnegative().max(500 * 1024 * 1024).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// URL and type are immutable after creation; only presentation + visibility
// can change. Document metadata is kept editable so admins can fix labels.
export const updateProjectMediaSchema = z.object({
  posterUrl: urlField.optional(),
  title: z.string().max(200).optional(),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  fileName: z.string().max(255).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const projectMediaReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
