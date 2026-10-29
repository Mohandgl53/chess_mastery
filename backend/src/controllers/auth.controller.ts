import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { userService } from '../services/user.service.js';
import { env } from '../config/env.js';
import type { AuthenticatedUser } from '../types/index.js';

const COOKIE_NAME = 'chess_coach_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000
  };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { safeResponse, rawToken } = await authService.register(req.body);

    // Set httpOnly cookie — rawToken is ONLY placed in cookie, never in response body
    res.cookie(COOKIE_NAME, rawToken, getSessionCookieOptions());

    res.status(201).json(safeResponse);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { safeResponse, rawToken } = await authService.login(req.body);

    res.cookie(COOKIE_NAME, rawToken, getSessionCookieOptions());

    res.status(200).json(safeResponse);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (rawToken) {
      await authService.logout(rawToken);
    }

    // Clear cookie regardless of whether session existed
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    });

    res.status(200).json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // requireAuth middleware guarantees req.user is set when this handler is reached
    const authUser = req.user as AuthenticatedUser;
    const profile = await userService.getUserProfile(authUser.id);

    res.status(200).json({
      user: {
        id: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}
