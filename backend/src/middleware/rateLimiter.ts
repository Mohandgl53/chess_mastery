import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  limit?: number;
  windowMs?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipInTest?: boolean;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const skipInTest = options.skipInTest ?? true;
  const tracker = new Map<string, RateLimitRecord>();

  // Cleanup stale keys periodically
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        tracker.delete(key);
      }
    }
  }, 120_000);
  cleanupTimer.unref();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    // In test environment, skip unless explicitly testing rate limiter
    if (env.NODE_ENV === 'test' && skipInTest && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.user?.id || req.ip || req.socket.remoteAddress || 'unknown');

    const now = Date.now();
    let record = tracker.get(key);
    if (!record) {
      record = { timestamps: [] };
      tracker.set(key, record);
    }

    // Retain only requests within sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const remaining = Math.max(0, limit - record.timestamps.length);
    const resetTime = record.timestamps.length > 0
      ? Math.ceil((record.timestamps[0] + windowMs - now) / 1000)
      : Math.ceil(windowMs / 1000);

    // Standard RFC RateLimit headers
    res.setHeader('RateLimit-Limit', limit.toString());
    res.setHeader('RateLimit-Remaining', Math.max(0, remaining - 1).toString());
    res.setHeader('RateLimit-Reset', resetTime.toString());

    if (record.timestamps.length >= limit) {
      res.setHeader('Retry-After', resetTime.toString());
      return next(
        new AppError(
          options.message || `Rate limit exceeded: maximum ${limit} requests per ${windowMs / 1000}s. Please wait before retrying.`,
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    record.timestamps.push(now);
    next();
  };
}

/**
 * Strict Rate Limiter for Authentication endpoints (login, register, reset password).
 * 10 attempts per 15 minutes per IP/client.
 */
export const authRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  skipInTest: true,
  keyGenerator: (req) => {
    // Key by IP and email (if provided) to stop credential stuffing
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const ip = req.ip || req.socket.remoteAddress || 'anonymous';
    return email ? `${ip}:${email}` : ip;
  }
});

/**
 * General API Rate Limiter for all routes.
 * 200 requests per minute per IP.
 */
export const generalApiRateLimiter = createRateLimiter({
  limit: 200,
  windowMs: 60 * 1000,
  message: 'Too many API requests. Please slow down.',
  skipInTest: true
});

/**
 * Coach Rate Limiter for LLM calls (prevents token exhaustion).
 * 30 requests per minute per user/IP.
 */
export const coachRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000,
  skipInTest: true
});

/**
 * Puzzle Rate Limiter for outbound proxy queries (Chess.com / Lichess).
 * 40 requests per minute.
 */
export const puzzleRateLimiter = createRateLimiter({
  limit: 40,
  windowMs: 60 * 1000,
  skipInTest: true
});
