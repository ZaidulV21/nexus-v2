import { prisma } from '../../config/database';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MINUTES = 1;

export const otpRepository = {
  findActiveByEmail(email: string) {
    return prisma.otpVerification.findUnique({ where: { email } });
  },

  upsert(email: string, hashedOtp: string, expiresAt: Date) {
    return prisma.otpVerification.upsert({
      where: { email },
      create: { email, hashedOtp, expiresAt },
      update: { hashedOtp, expiresAt, attempts: 0, verifiedAt: null },
    });
  },

  markVerified(email: string) {
    return prisma.otpVerification.update({
      where: { email },
      data: { verifiedAt: new Date() },
    });
  },

  incrementAttempts(email: string) {
    return prisma.otpVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
  },

  deleteByEmail(email: string) {
    return prisma.otpVerification.deleteMany({ where: { email } });
  },

  cleanupExpired() {
    return prisma.otpVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },

  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  RATE_LIMIT_MINUTES,
};
