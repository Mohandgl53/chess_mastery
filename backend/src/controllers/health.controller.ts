import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

export async function getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Real test against PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: 'ok'
      }
    });
  } catch (err) {
    console.error('Health check database connection failed:', err);
    res.status(503).json({
      status: 'degraded',
      services: {
        api: 'ok',
        database: 'down'
      },
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Could not connect to PostgreSQL database'
      }
    });
  }
}
