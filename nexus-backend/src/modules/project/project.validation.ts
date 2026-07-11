import { z } from 'zod';

export const createProjectSchema = z.object({
  leadId: z.string().uuid(),
  clientId: z.string().uuid(),
  quotationVersionId: z.string().uuid().optional(),
});

export const addServiceToProjectSchema = z.object({
  serviceId: z.string().uuid(),
  assignedQuotationVersionId: z.string().uuid().optional(),
});

export const updateProjectServiceStatusSchema = z.object({
  toStatus: z.string().min(1),
  reason: z.string().optional(),
});
