import { Request, Response, NextFunction } from 'express';
import { practiceService } from '../services/practice.service.js';
import { practiceRepository } from '../repositories/practice.repository.js';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { NotFoundError } from '../utils/errors.js';

export class PracticeController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const data = await practiceService.getDashboard(userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { theme } = req.body;
      const data = await practiceService.startSession(userId, theme);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const session = await practiceRepository.getSessionById(sessionId);
      if (!session) {
        throw new NotFoundError(`Practice session ${sessionId} not found`);
      }
      res.json(session);
    } catch (err) {
      next(err);
    }
  }

  async recordAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const result = await practiceService.recordAttempt(userId, sessionId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.sessionId as string;
      const result = await practiceService.completeSession(userId, sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMastery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const masteries = await practiceRepository.getAllThemeMasteries(profile.id);
      res.json({ masteries });
    } catch (err) {
      next(err);
    }
  }

  async getPuzzle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const puzzle = await practiceRepository.getPuzzleById(id);
      if (!puzzle) {
        throw new NotFoundError(`Puzzle ${id} not found`);
      }
      res.json(puzzle);
    } catch (err) {
      next(err);
    }
  }
}

export const practiceController = new PracticeController();
