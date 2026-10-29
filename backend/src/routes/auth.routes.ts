import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { registerSchema, loginSchema } from '../validators/auth.schemas.js';

export const authRoutes = Router();

// POST /api/auth/register
authRoutes.post('/register', validateBody(registerSchema), register);

// POST /api/auth/login
authRoutes.post('/login', validateBody(loginSchema), login);

// POST /api/auth/logout
authRoutes.post('/logout', logout);

// GET /api/auth/me — requires authentication
authRoutes.get('/me', requireAuth, me);
