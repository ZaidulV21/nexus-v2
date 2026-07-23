import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { otpRepository } from './otp.repository';
import { emailService } from '../email/email.service';
import { companyService } from '../company/company.service';
import { env } from '../../config/env';
import { renderOtpVerificationEmail } from '../email/templates/otp-verification.template';
import type { EmailBranding } from '../email/templates/base-email.template';
import { ValidationError } from '../../core/errors/AppError';

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
  async sendOtp(email: string) {
    const normalizedEmail = normalizeEmail(email);

    const existing = await otpRepository.findActiveByEmail(normalizedEmail);
    if (existing && existing.verifiedAt) {
      throw new ValidationError('Email is already verified');
    }

    if (existing) {
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

  async cleanupExpired() {
    return otpRepository.cleanupExpired();
  },
};
