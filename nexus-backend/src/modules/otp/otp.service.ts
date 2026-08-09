import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { otpRepository } from './otp.repository';
import { authRepository } from '../auth/auth.repository';
import { signToken } from '../auth/auth.service';
import { clientRepository } from '../client/client.repository';
import { emailService } from '../email/email.service';
import { companyService } from '../company/company.service';
import { env } from '../../config/env';
import { renderOtpVerificationEmail } from '../email/templates/otp-verification.template';
import type { EmailBranding } from '../email/templates/base-email.template';
import { ValidationError } from '../../core/errors/AppError';
import { normalizePhone, maskPhone, maskEmail } from '../../core/utils/phone';
import type { AuthPayload } from '../../core/middleware/authenticate';

const OTP_LENGTH = 6;
const OTP_MAX_VALUE = 999999;
const BCRYPT_ROUNDS = 10;

function generateOtp(): string {
  return String(randomInt(0, OTP_MAX_VALUE + 1)).padStart(OTP_LENGTH, '0');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getBranding(): Promise<EmailBranding> {
  try {
    const settings = await companyService.get();
    return {
      companyName: settings.companyName ?? undefined,
      logoUrl: settings.logoUrl ?? undefined,
      supportEmail: settings.supportEmail ?? undefined,
      phone: settings.phone ?? undefined,
      addressLine1: settings.addressLine1 ?? undefined,
      addressLine2: settings.addressLine2 ?? undefined,
      city: settings.city ?? undefined,
      state: settings.state ?? undefined,
      country: settings.country ?? undefined,
      pincode: settings.pincode ?? undefined,
    };
  } catch {
    return {};
  }
}

export const otpService = {
  // options.allowAlreadyVerified lets a login flow re-issue a code for an email
  // that was already verified during account creation (its record carries a
  // verifiedAt). The upsert below resets the record anyway, so the code is
  // always fresh; the flag only bypasses the "already verified" guard.
  async sendOtp(email: string, options?: { allowAlreadyVerified?: boolean }) {
    const normalizedEmail = normalizeEmail(email);

    const existing = await otpRepository.findActiveByEmail(normalizedEmail);
    if (existing && existing.verifiedAt && !options?.allowAlreadyVerified) {
      throw new ValidationError('Email is already verified');
    }

    if (existing && !existing.verifiedAt) {
      const timeSinceCreation = Date.now() - existing.createdAt.getTime();
      const rateLimitMs = otpRepository.RATE_LIMIT_MINUTES * 60 * 1000;
      if (timeSinceCreation < rateLimitMs) {
        throw new ValidationError('Please wait before requesting a new code');
      }
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + otpRepository.OTP_EXPIRY_MINUTES * 60 * 1000);

    await otpRepository.upsert(normalizedEmail, hashedOtp, expiresAt);

    const branding = await getBranding();
    const appUrl = env.appUrl || 'http://localhost:5173';

    const html = renderOtpVerificationEmail(
      {
        otp,
        expiryMinutes: otpRepository.OTP_EXPIRY_MINUTES,
        portalUrl: appUrl,
      },
      branding
    );

    await emailService.send({
      to: normalizedEmail,
      subject: 'Verify your email',
      html,
      replyTo: branding.supportEmail || undefined,
    });

    return { success: true };
  },

  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = normalizeEmail(email);

    const record = await otpRepository.findActiveByEmail(normalizedEmail);
    if (!record) {
      throw new ValidationError('No verification code found. Please request a new one.');
    }

    if (record.verifiedAt) {
      return { verified: true };
    }

    if (new Date() > record.expiresAt) {
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }

    if (record.attempts >= otpRepository.MAX_ATTEMPTS) {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }

    const isValid = await bcrypt.compare(otp, record.hashedOtp);
    if (!isValid) {
      await otpRepository.incrementAttempts(normalizedEmail);
      const remaining = otpRepository.MAX_ATTEMPTS - (record.attempts + 1);
      throw new ValidationError(
        remaining > 0
          ? `Invalid code. ${remaining} attempt(s) remaining.`
          : 'Invalid code. No attempts remaining. Please request a new code.'
      );
    }

    await otpRepository.markVerified(normalizedEmail);
    return { verified: true };
  },

  async isEmailVerified(email: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);
    const record = await otpRepository.findActiveByEmail(normalizedEmail);
    if (!record || !record.verifiedAt) return false;
    if (new Date() > record.expiresAt) return false;
    return true;
  },

  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const normalizedEmail = normalizeEmail(email);
    const existingClient = await authRepository.findClientByEmail(normalizedEmail);
    return { exists: !!existingClient };
  },

  // Public identity check for the quote wizard. A visitor is an EXISTING
  // client when their submitted email and/or phone matches an account on file.
  // Email is the stronger identifier (unique, verified at account creation),
  // so it always wins when both match different clients. The two identifiers
  // are never merged or auto-linked: a partial match (same email + different
  // phone, or same phone + different email) is surfaced so the frontend can
  // send the user through real verification before attaching the request.
  async checkAccount(input: { email?: string; phone?: string }) {
    const submittedEmail = (input.email || '').trim().toLowerCase();
    const submittedPhone = input.phone ? normalizePhone(input.phone) : '';

    const emailClient = submittedEmail ? await authRepository.findClientByEmail(submittedEmail) : null;
    const phoneClient = submittedPhone ? await clientRepository.findByPhone(input.phone!) : null;

    const accountPayload = (client: { id: string; email: string; phone: string }) => ({
      clientId: client.id,
      emailMasked: maskEmail(client.email),
      phoneMasked: maskPhone(client.phone),
    });

    if (emailClient && phoneClient && emailClient.id === phoneClient.id) {
      return {
        exists: true,
        match: 'both',
        account: accountPayload(emailClient),
        flags: { phoneMismatch: false, emailMismatch: false },
      };
    }

    if (emailClient) {
      const phoneMismatch = submittedPhone !== '' && submittedPhone !== normalizePhone(emailClient.phone);
      return {
        exists: true,
        match: 'email',
        account: accountPayload(emailClient),
        flags: { phoneMismatch, emailMismatch: false },
      };
    }

    if (phoneClient) {
      const emailMismatch = submittedEmail !== '' && submittedEmail !== (phoneClient.email || '').toLowerCase();
      return {
        exists: true,
        match: 'phone',
        account: accountPayload(phoneClient),
        flags: { phoneMismatch: false, emailMismatch },
      };
    }

    return {
      exists: false,
      match: null,
      account: null,
      flags: { phoneMismatch: false, emailMismatch: false },
    };
  },

  // OTP sign-in for EXISTING clients (Welcome Back flow). The code is sent to
  // the account's email ON FILE, never to the visitor's freshly typed email, so
  // a phone-matched account's address is never leaked. The email is masked in
  // every response; only the client's own code can complete the login.
  async sendOtpLogin(clientId: string) {
    const client = await authRepository.findClientById(clientId);
    if (!client || client.deletedAt || !client.isActive) {
      throw new ValidationError('Account not found');
    }
    if (!client.email) {
      throw new ValidationError('This account has no email on file');
    }
    return otpService.sendOtp(client.email, { allowAlreadyVerified: true });
  },

  async verifyOtpLogin(clientId: string, otp: string) {
    const client = await authRepository.findClientById(clientId);
    if (!client || client.deletedAt || !client.isActive) {
      throw new ValidationError('Account not found');
    }
    if (!client.email) {
      throw new ValidationError('This account has no email on file');
    }
    const result = await otpService.verifyOtp(client.email, otp);
    if (!result.verified) {
      throw new ValidationError('Invalid verification code');
    }
    const payload: AuthPayload = { id: client.id, type: 'CLIENT', email: client.email };
    return { token: signToken(payload), actor: { id: client.id, email: client.email, type: 'CLIENT' } };
  },

  async cleanupExpired() {
    return otpRepository.cleanupExpired();
  },
};
