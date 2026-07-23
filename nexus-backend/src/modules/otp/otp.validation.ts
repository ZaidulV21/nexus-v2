import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only digits'),
});
