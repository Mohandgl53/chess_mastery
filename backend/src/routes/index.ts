import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { userRoutes } from './users.routes.js';
import { gameRoutes } from './games.routes.js';
import { authRoutes } from './auth.routes.js';
import { coachRoutes } from './coach.routes.js';
import { playerRoutes } from './player.routes.js';
import { practiceRoutes } from './practice.routes.js';
import { curriculumRoutes } from './curriculum.routes.js';
import { puzzleRoutes } from './puzzles.routes.js';
import { adminRoutes } from './admin.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/games', gameRoutes);
apiRouter.use('/coach', coachRoutes);
apiRouter.use('/player', playerRoutes);
apiRouter.use('/practice', practiceRoutes);
apiRouter.use('/curriculum', curriculumRoutes);
apiRouter.use('/puzzles', puzzleRoutes);
