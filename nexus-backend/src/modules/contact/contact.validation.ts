import { z } from 'zod';

export const createContactMessageSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
});

export const replyContactMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const contactMessageListFiltersSchema = z.object({
  status: z.enum(['ALL', 'NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  search: z.string().max(200).optional(),
});
