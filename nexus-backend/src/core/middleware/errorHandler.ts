import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

// Single centralized error handler. No module should implement its own
// try/catch-and-format logic - controllers throw, this catches.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      // eslint-disable-next-line no-console
      console.error('[NON-OPERATIONAL ERROR]', err);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details ?? undefined,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    success: false,
    error: { message: 'Internal server error' },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}
