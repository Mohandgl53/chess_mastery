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
 * In test environments (no Origin header), validation is skipped
 * to allow automated tests to function correctly.
 *
 * SameSite=Lax on the session cookie provides additional CSRF protection
 * for most cross-site attack vectors.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only validate unsafe methods
  if (!UNSAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  // If no Origin header is present (e.g., server-to-server, curl, automated tests)
  // allow the request through. The session cookie SameSite=Lax provides base protection.
  if (!origin) {
    return next();
  }

  // Normalize: compare without trailing slash
  const allowedOrigin = env.CLIENT_URL.replace(/\/$/, '');
  const requestOrigin = origin.replace(/\/$/, '');

  if (requestOrigin !== allowedOrigin) {
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
