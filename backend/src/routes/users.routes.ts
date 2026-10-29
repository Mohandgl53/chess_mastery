import { Router } from 'express';
import { getCurrentUserProfile, getUserById } from '../controllers/users.controller.js';
import { validateParams } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { userIdParamSchema } from '../validators/common.schemas.js';

export const userRoutes = Router();

// /profile requires authentication — derives user from req.user.id set by session
userRoutes.get('/profile', requireAuth, getCurrentUserProfile);
userRoutes.get('/:userId', validateParams(userIdParamSchema), getUserById);
