import { Router } from 'express';
import { practiceController } from '../controllers/practice.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  startSessionSchema,
  recordAttemptSchema,
  sessionIdParamSchema,
  puzzleIdParamSchema
} from '../validators/practice.schemas.js';

export const practiceRoutes = Router();

// All practice endpoints require server-side session authentication
practiceRoutes.use(requireAuth);

practiceRoutes.get('/dashboard', (req, res, next) => practiceController.getDashboard(req, res, next));
practiceRoutes.post('/sessions', validateBody(startSessionSchema), (req, res, next) => practiceController.startSession(req, res, next));
practiceRoutes.get('/sessions/:sessionId', validateParams(sessionIdParamSchema), (req, res, next) => practiceController.getSession(req, res, next));
practiceRoutes.post('/sessions/:sessionId/attempts', validateParams(sessionIdParamSchema), validateBody(recordAttemptSchema), (req, res, next) => practiceController.recordAttempt(req, res, next));
practiceRoutes.post('/sessions/:sessionId/complete', validateParams(sessionIdParamSchema), (req, res, next) => practiceController.completeSession(req, res, next));
practiceRoutes.get('/mastery', (req, res, next) => practiceController.getMastery(req, res, next));
practiceRoutes.get('/puzzles/:id', validateParams(puzzleIdParamSchema), (req, res, next) => practiceController.getPuzzle(req, res, next));
