import { Request, Response, NextFunction } from 'express';
import { curriculumService } from '../services/curriculum.service.js';

export class CurriculumController {
  async getCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const data = await curriculumService.getCatalog(userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const lessonId = req.params.lessonId as string;
      const data = await curriculumService.getLessonDetails(userId, lessonId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async validateStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const lessonId = req.params.lessonId as string;
      const result = await curriculumService.validateStep(userId, lessonId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const lessonId = req.params.lessonId as string;
      const result = await curriculumService.resetLesson(userId, lessonId);
      res.json({ success: true, progress: result });
    } catch (err) {
      next(err);
    }
  }
}

export const curriculumController = new CurriculumController();
