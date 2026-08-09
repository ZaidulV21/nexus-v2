import { api } from '@/lib/api';
import type { AuthActor } from '@/types';

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

export interface CheckEmailResult {
  exists: boolean;
}

/** A matched client account, with identifiers masked so account details are
 *  never leaked to someone probing the check-account endpoint. */
export interface AccountCheckAccount {
  clientId: string;
  emailMasked: string;
  phoneMasked: string;
}

export interface AccountCheckResult {
  exists: boolean;
  /** which identifier found the account: 'both', 'email' or 'phone'. */
  match: 'both' | 'email' | 'phone' | null;
  account: AccountCheckAccount | null;
  flags: {
    /** submitted phone differs from the account's phone on file */
    phoneMismatch: boolean;
    /** submitted email differs from the account's email on file */
    emailMismatch: boolean;
  };
}

export interface OtpLoginResult {
  token: string;
  actor: AuthActor;
}

export const publicAuthService = {
  sendOtp: (input: SendOtpInput) => api.post<{ success: boolean }>('/public/auth/send-otp', input),

  verifyOtp: (input: VerifyOtpInput) => api.post<{ verified: boolean }>('/public/auth/verify-otp', input),

  forgotPassword: (input: ForgotPasswordInput) => api.post<{ success: boolean }>('/auth/forgot-password', input),

  resetPassword: (input: ResetPasswordInput) => api.post<{ success: boolean }>('/auth/reset-password', input),

  checkEmail: (email: string) => api.post<CheckEmailResult>('/public/auth/check-email', { email }),

  checkAccount: (input: { email: string; phone: string }) =>
    api.post<AccountCheckResult>('/public/auth/check-account', input),

  sendOtpLogin: (input: { clientId: string }) =>
    api.post<{ success: boolean }>('/public/auth/send-otp-login', input),

  verifyOtpLogin: (input: { clientId: string; otp: string }) =>
    api.post<OtpLoginResult>('/public/auth/verify-otp-login', input),
};
