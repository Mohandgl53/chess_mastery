import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { jwtService } from '../services/jwt.service.js';

const COOKIE_NAME = 'chess_coach_session';

/**
 * Dual Authentication Context Middleware.
 *
 * Supports both:
 * 1. Authorization: Bearer <jwt_or_session_token> header (standard for APIs, mobile, SPA)
 * 2. chess_coach_session httpOnly cookie (standard for same-site web browser sessions)
 *
 * - On success: attaches authenticated user (with id, email, displayName, role) to req.user.
 * - On failure: req.user remains undefined.
 *
 * Does not reject requests; protected routes enforce authentication via requireAuth.
 */
export async function authContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Check Authorization: Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          // Attempt JWT verification first
          const jwtUser = jwtService.verifyAccessToken(token);
          if (jwtUser) {
            req.user = jwtUser;
            return next();
          }
        } catch {
          // If JWT verification fails, fallback to checking as an opaque session token
          const sessionUser = await authService.verifySession(token);
          if (sessionUser) {
            req.user = sessionUser;
            return next();
          }
        }
      }
    }

    // 2. Check httpOnly session cookie
    const rawCookieToken = req.cookies?.[COOKIE_NAME];
    if (rawCookieToken && typeof rawCookieToken === 'string') {
      const user = await authService.verifySession(rawCookieToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    next();
  } catch {
    // On any unexpected error, safely treat as unauthenticated
    next();
  }
}
