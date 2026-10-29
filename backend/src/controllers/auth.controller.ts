import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { jwtService } from '../services/jwt.service.js';
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

export async function googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { safeResponse, rawToken } = await authService.googleLogin(req.body.credential);

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

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = req.user as AuthenticatedUser;

    await authService.logoutAll(authUser.id);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    });

    res.status(200).json({ data: { message: 'All active sessions have been revoked across all devices' } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = req.user as AuthenticatedUser;
    const profile = await userService.getUserProfile(authUser.id);

    res.status(200).json({
      user: {
        id: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName,
        role: authUser.role
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = req.user as AuthenticatedUser;
    const result = await authService.changePassword(authUser.id, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenPair = await jwtService.rotateRefreshToken(req.body.refreshToken);
    res.status(200).json({ data: tokenPair });
  } catch (err) {
    next(err);
  }
}

export async function revokeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await jwtService.revokeRefreshToken(req.body.refreshToken);
    res.status(200).json({ data: { message: 'Refresh token revoked' } });
  } catch (err) {
    next(err);
  }
}
