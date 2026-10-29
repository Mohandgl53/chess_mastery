import { Request, Response, NextFunction } from 'express';
import { coachService } from '../services/coach.service.js';

export async function explainMove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await coachService.explainMove(req.body, userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getHint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await coachService.getHint(req.body, userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function answerQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await coachService.answerQuestion(req.body, userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function generatePostGameReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await coachService.generatePostGameReview(req.body, userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
