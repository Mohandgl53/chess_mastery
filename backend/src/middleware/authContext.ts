import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

const COOKIE_NAME = 'chess_coach_session';

/**
 * Phase 3B Session Authentication Middleware.
 *
 * Reads the chess_coach_session cookie and attempts to verify it.
 * - On success: attaches authenticated user to req.user.
 * - On failure (missing/expired/invalid): req.user remains undefined.
 *
 * This middleware does NOT reject unauthenticated requests.
 * Protected routes must additionally use requireAuth middleware.
 *
 * This keeps public endpoints (register, login, health) accessible
 * while authenticated-only routes explicitly enforce authentication.
 */
export async function authContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (!rawToken || typeof rawToken !== 'string') {
      return next();
    }

    const user = await authService.verifySession(rawToken);
    if (user) {
      req.user = user;
    }

    next();
  } catch {
    // On any unexpected error, treat as unauthenticated — do not crash
    next();
  }
}
