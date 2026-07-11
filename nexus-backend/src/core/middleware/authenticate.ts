import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/AppError';

export type AuthActorType = 'ADMIN' | 'CLIENT';

export interface AuthPayload {
  id: string;
  type: AuthActorType;
  email: string;
  // Present only for ADMIN actors - Clients have no Role in V1 (PRD: no
  // internal roles for Clients). Carried in the JWT so authorize() can
  // check permissions without a User lookup on every request.
  roleId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    return next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}

// Restricts a route to a specific actor type (ADMIN or CLIENT), used in
// addition to (not instead of) permission checks for admin-only routes.
export function requireActorType(type: AuthActorType) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.type !== type) {
      return next(new UnauthorizedError(`This route requires ${type} authentication`));
    }
    return next();
  };
}
