import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the required roles.
 */
export function requireRole(...allowedRoles: Array<'USER' | 'ADMIN'>) {
  return function (req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied: Required role (${allowedRoles.join(', ')}) not held by current user (${req.user.role}).`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
