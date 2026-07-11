import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, changePasswordSchema } from './auth.validation';
import { ok } from '../../core/utils/response';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';

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
};
