import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

interface RateLimitRecord {
  timestamps: number[];
}

export function createRateLimiter(options: { limit?: number; windowMs?: number } = {}) {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const tracker = new Map<string, RateLimitRecord>();

  // Cleanup stale keys every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        tracker.delete(key);
      }
    }
  }, 300_000).unref();

  return function rateLimiter(req: Request, _res: Response, next: NextFunction): void {
    const key = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let record = tracker.get(key);
    if (!record) {
      record = { timestamps: [] };
      tracker.set(key, record);
    }

    // Keep only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= limit) {
      return next(
        new AppError(
          `Rate limit exceeded: maximum ${limit} requests per ${windowMs / 1000}s. Please wait before retrying.`,
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    record.timestamps.push(now);
    next();
  };
}

export const coachRateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
