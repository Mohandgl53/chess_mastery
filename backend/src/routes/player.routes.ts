import { Router } from 'express';
import { playerController } from '../controllers/player.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import {
  recommendationIdParamSchema,
  processGameParamSchema,
  weaknessQuerySchema,
  evidenceQuerySchema
} from '../validators/player.schemas.js';

export const playerRoutes = Router();

// All routes enforce server-side authentication and never trust client-supplied player ID
playerRoutes.use(requireAuth);

playerRoutes.get('/profile', (req, res, next) => playerController.getProfile(req, res, next));
playerRoutes.get('/skills', (req, res, next) => playerController.getSkills(req, res, next));
playerRoutes.get('/weaknesses', validateQuery(weaknessQuerySchema), (req, res, next) => playerController.getWeaknesses(req, res, next));
playerRoutes.get('/strengths', (req, res, next) => playerController.getStrengths(req, res, next));
playerRoutes.get('/recommendations', (req, res, next) => playerController.getRecommendations(req, res, next));
playerRoutes.post('/recommendations/:id/complete', validateParams(recommendationIdParamSchema), (req, res, next) => playerController.completeRecommendation(req, res, next));
playerRoutes.get('/evidence', validateQuery(evidenceQuerySchema), (req, res, next) => playerController.getEvidence(req, res, next));
playerRoutes.get('/progress', (req, res, next) => playerController.getProgress(req, res, next));
playerRoutes.post('/process-game/:gameId', validateParams(processGameParamSchema), (req, res, next) => playerController.processGame(req, res, next));
playerRoutes.post('/recalculate', (req, res, next) => playerController.recalculate(req, res, next));
