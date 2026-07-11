import { z } from 'zod';

const leadServiceSchema = z.object({
  serviceId: z.string().uuid(),
  questionnaireAnswers: z.record(z.any()).optional(),
});

export const createLeadSchema = z.object({
  contactName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  companyName: z.string().optional(),
  source: z.string().optional(),
  services: z.array(leadServiceSchema).min(1, 'At least one service must be selected'),
});

export const addServiceToLeadSchema = leadServiceSchema;

export const updateLeadSchema = z.object({
  contactName: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
  companyName: z.string().optional(),
});

export const updateLeadServiceStatusSchema = z.object({
  toStatus: z.string().min(1),
  reason: z.string().optional(),
});

export const addNoteSchema = z.object({
  note: z.string().min(1),
});
