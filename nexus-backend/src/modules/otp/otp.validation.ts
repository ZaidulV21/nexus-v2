import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only digits'),
});

export const checkEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const checkAccountSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').optional(),
    phone: z.string().min(6).optional(),
  })
  .refine((d) => d.email || d.phone, { message: 'Provide an email or phone number' });

export const sendOtpLoginSchema = z.object({
  clientId: z.string().uuid(),
});

export const verifyOtpLoginSchema = z.object({
  clientId: z.string().uuid(),
  otp: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Verification code must contain only digits'),
});
