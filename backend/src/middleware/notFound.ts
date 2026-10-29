import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/errors.js';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Resource not found: ${req.method} ${req.originalUrl}`));
}
