import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * requireAuth middleware.
 *
 * Requires that req.user has been populated by authContext.
 * Returns 401 Unauthorized if the request is not authenticated.
 *
 * Usage: apply to any route that requires authentication.
 *
 * The separation between authContext (attempt auth) and requireAuth (enforce auth)
 * allows public endpoints to coexist with protected endpoints.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
    return;
  }
  next();
}
