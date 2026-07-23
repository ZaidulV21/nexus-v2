import { api } from '@/lib/api';

export interface SendOtpInput {
  email: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export const publicAuthService = {
  sendOtp: (input: SendOtpInput) => api.post<{ success: boolean }>('/public/auth/send-otp', input),

  verifyOtp: (input: VerifyOtpInput) => api.post<{ verified: boolean }>('/public/auth/verify-otp', input),

  forgotPassword: (input: ForgotPasswordInput) => api.post<{ success: boolean }>('/auth/forgot-password', input),

  resetPassword: (input: ResetPasswordInput) => api.post<{ success: boolean }>('/auth/reset-password', input),
};
