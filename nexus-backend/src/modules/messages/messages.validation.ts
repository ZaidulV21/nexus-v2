import { z } from 'zod';

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty'),
});
