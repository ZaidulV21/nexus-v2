import { z } from 'zod';

export const updateClientSchema = z.object({
  companyName: z.string().optional(),
  contactName: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
});
