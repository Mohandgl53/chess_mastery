import { Router } from 'express';
import { listAdminUsers, updateUserRole, getSystemStats } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireRole.js';
import { validateParams } from '../middleware/validate.js';
import { userIdParamSchema } from '../validators/common.schemas.js';

export const adminRoutes = Router();

// All admin routes strictly enforce authentication and ADMIN role verification
adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

adminRoutes.get('/users', listAdminUsers);
adminRoutes.patch('/users/:userId/role', validateParams(userIdParamSchema), updateUserRole);
adminRoutes.get('/system', getSystemStats);

