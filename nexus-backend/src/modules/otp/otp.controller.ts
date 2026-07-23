import { Request, Response, NextFunction } from 'express';
import { otpService } from './otp.service';
import { sendOtpSchema, verifyOtpSchema } from './otp.validation';
import { ok } from '../../core/utils/response';
import { ValidationError } from '../../core/errors/AppError';

export const otpController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = sendOtpSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid email', parsed.error.flatten());
      const result = await otpService.sendOtp(parsed.data.email);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await otpService.verifyOtp(parsed.data.email, parsed.data.otp);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
