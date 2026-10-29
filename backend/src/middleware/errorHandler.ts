import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  // Handle CORS errors as 403 Forbidden instead of unhandled 500
  if (err.message && err.message.includes('not allowed by CORS')) {
    res.status(403).json({
      error: {
        code: 'CORS_FORBIDDEN',
        message: 'Origin not allowed by CORS'
      }
    });
    return;
  }

  // Log unexpected errors internally
  console.error('Unhandled server error:', err);

  const isDev = env.NODE_ENV === 'development';
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev ? err.message : 'An unexpected internal error occurred'
    }
  });
}
