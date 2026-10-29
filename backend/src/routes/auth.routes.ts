import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  changePassword,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  refreshToken,
  revokeToken
} from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema
} from '../validators/auth.schemas.js';

export const authRoutes = Router();

// POST /api/auth/register — protected with rate limiting & Zod validation
authRoutes.post('/register', authRateLimiter, validateBody(registerSchema), register);

// POST /api/auth/login — protected with rate limiting & Zod validation
authRoutes.post('/login', authRateLimiter, validateBody(loginSchema), login);

// POST /api/auth/google — Google OAuth 2.0 / OpenID Connect login
authRoutes.post('/google', authRateLimiter, validateBody(googleAuthSchema), googleLogin);

// POST /api/auth/change-password — Authenticated user password update
authRoutes.post('/change-password', requireAuth, authRateLimiter, validateBody(changePasswordSchema), changePassword);

// POST /api/auth/forgot-password — Account recovery link request
authRoutes.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);

// POST /api/auth/reset-password — Password reset with token
authRoutes.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), resetPassword);

// POST /api/auth/refresh-token — Rotate JWT refresh token
authRoutes.post('/refresh-token', validateBody(refreshTokenSchema), refreshToken);

// POST /api/auth/revoke-token — Invalidate a refresh token
authRoutes.post('/revoke-token', validateBody(refreshTokenSchema), revokeToken);

// POST /api/auth/logout — Invalidate current session
authRoutes.post('/logout', logout);

// POST /api/auth/logout-all — Invalidate all sessions across all devices
authRoutes.post('/logout-all', requireAuth, logoutAll);

// GET /api/auth/me — requires authentication
authRoutes.get('/me', requireAuth, me);
