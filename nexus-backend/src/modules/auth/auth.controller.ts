import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import { companyService } from '../company/company.service';
import { emailService } from '../email/email.service';
import { renderPasswordResetEmail } from '../email/templates/password-reset.template';
import { env } from '../../config/env';
import type { EmailBranding } from '../email/templates/base-email.template';
import { ok } from '../../core/utils/response';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

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

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid login payload', parsed.error.flatten());
      const result = await authService.login(parsed.data);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response) {
    // Stateless JWT in V1 - logout is a client-side token discard.
    // Endpoint exists for API completeness / future refresh-token revocation.
    return ok(res, { success: true });
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const profile = await authService.me(req.user.id, req.user.type);
      return ok(res, profile);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await authService.changePassword(req.user.id, req.user.type, parsed.data);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await authService.forgotPassword(parsed.data.email);

      // Send reset email if token was generated (client exists)
      if (result.token) {
        const branding = await getBranding();
        const appUrl = env.appUrl || 'http://localhost:5173';
        const resetUrl = `${appUrl}/reset-password?token=${result.token}`;

        const html = renderPasswordResetEmail(
          {
            clientName: result.clientName || 'there',
            resetUrl,
            expiryMinutes: 60,
          },
          branding
        );

        await emailService.send({
          to: parsed.data.email,
          subject: 'Reset your password',
          html,
          replyTo: branding.supportEmail || undefined,
        });
      }

      return ok(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid payload', parsed.error.flatten());
      const result = await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
