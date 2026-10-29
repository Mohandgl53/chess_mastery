import { Router } from 'express';
import {
  explainMove,
  getHint,
  answerQuestion,
  generatePostGameReview
} from '../controllers/coach.controller.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { coachRateLimiter } from '../middleware/rateLimiter.js';
import {
  explainMoveSchema,
  hintSchema,
  chatSchema,
  postGameSchema
} from '../validators/coach.schemas.js';

export const coachRoutes = Router();

// All coach endpoints require authentication and rate limiting
coachRoutes.use(requireAuth);
coachRoutes.use(coachRateLimiter);

coachRoutes.post('/explain', validateBody(explainMoveSchema), explainMove);
coachRoutes.post('/hint', validateBody(hintSchema), getHint);
coachRoutes.post('/chat', validateBody(chatSchema), answerQuestion);
coachRoutes.post('/post-game', validateBody(postGameSchema), generatePostGameReview);
