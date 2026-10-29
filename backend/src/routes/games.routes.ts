import { Router } from 'express';
import {
  listGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame
} from '../controllers/games.controller.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createGameSchema, updateGameSchema } from '../validators/game.schemas.js';
import { paginationSchema, idParamSchema } from '../validators/common.schemas.js';

export const gameRoutes = Router();

// All game routes require authentication — req.user.id determines ownership
gameRoutes.get('/', requireAuth, validateQuery(paginationSchema), listGames);
gameRoutes.get('/:gameId', requireAuth, validateParams(idParamSchema), getGameById);
gameRoutes.post('/', requireAuth, validateBody(createGameSchema), createGame);
gameRoutes.put('/:gameId', requireAuth, validateParams(idParamSchema), validateBody(updateGameSchema), updateGame);
gameRoutes.delete('/:gameId', requireAuth, validateParams(idParamSchema), deleteGame);
