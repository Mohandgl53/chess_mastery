import { Request, Response, NextFunction } from 'express';
import { gameService } from '../services/game.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export async function listGames(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as any;
    const result = req.query.result as any;

    const resultPage = await gameService.listUserGames(userId, page, limit, { status, result });
    res.status(200).json(resultPage);
  } catch (err) {
    next(err);
  }
}

export async function getGameById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const gameId = getParam(req.params.gameId);

    const game = await gameService.getGameById(gameId, userId);
    res.status(200).json({ data: game });
  } catch (err) {
    next(err);
  }
}

export async function createGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const game = await gameService.createGame(userId, req.body);
    res.status(201).json({ data: game });
  } catch (err) {
    next(err);
  }
}

export async function updateGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const gameId = getParam(req.params.gameId);
    const updated = await gameService.updateGame(gameId, userId, req.body);
    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const gameId = getParam(req.params.gameId);
    await gameService.deleteGame(gameId, userId);
    res.status(200).json({ data: { message: 'Game successfully deleted', id: gameId } });
  } catch (err) {
    next(err);
  }
}
