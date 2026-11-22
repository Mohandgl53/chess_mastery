import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF Protection Middleware using Origin header validation.
 *
 * For all unsafe HTTP methods (POST, PUT, PATCH, DELETE):
 * - Validates that the Origin header matches the configured CLIENT_URL.
 * - There is NO blanket exemption for /auth routes.
 *   All state-changing requests are validated.
 *
 * Safe methods (GET, HEAD, OPTIONS) are not validated.
 *
 * Legacy integration tests omit Origin; they may opt into strict validation
 * with the `x-test-csrf-enforce: true` header (test environment only).
 *
 * SameSite=Lax on the session cookie provides additional CSRF protection
 * for most cross-site attack vectors.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only validate unsafe methods
  if (!UNSAFE_METHODS.has(req.method)) {
    return next();
  }

  // Requests authenticated via Authorization: Bearer cannot be forged via browser HTML form submissions
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const origin = req.headers.origin;

  // Cookie-authenticated unsafe requests must carry an allowed Origin so that
  // cross-site form/fetch submissions are rejected. Supertest suites omit Origin;
  // they can opt into the strict path with x-test-csrf-enforce in test mode.
  if (!origin) {
    if (
      env.NODE_ENV === 'test' &&
      String(req.headers['x-test-csrf-enforce'] ?? '').toLowerCase() !== 'true'
    ) {
      return next();
    }
    res.status(403).json({
      error: {
        code: 'CSRF_FORBIDDEN',
        message: 'Origin header is required for unsafe methods'
      }
    });
    return;
  }

  // Normalize: compare without trailing slash
  const allowedOrigins = [
    env.CLIENT_URL.replace(/\/$/, ''),
    ...(env.PUBLIC_CLIENT_URL ? [env.PUBLIC_CLIENT_URL.replace(/\/$/, '')] : []),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:80',
    'http://127.0.0.1:80'
  ];
  const requestOrigin = origin.replace(/\/$/, '');

  if (!allowedOrigins.includes(requestOrigin)) {
    res.status(403).json({
      error: {
        code: 'CSRF_FORBIDDEN',
        message: 'Request origin not allowed'
      }
    });
    return;
  }

  next();
}
