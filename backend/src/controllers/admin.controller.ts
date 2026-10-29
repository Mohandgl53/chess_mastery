import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export async function listAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          googleId: true,
          createdAt: true,
          profile: {
            select: {
              rating: true,
              gamesPlayed: true
            }
          }
        }
      }),
      prisma.user.count()
    ]);

    res.status(200).json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = getParam(req.params.userId);
    const newRole = req.body.role;
    const currentAdminId = req.user!.id;

    if (!['USER', 'ADMIN'].includes(newRole)) {
      throw new BadRequestError('Invalid role specified. Must be USER or ADMIN', 'INVALID_ROLE');
    }

    // Security check: Prevent admin from demoting themselves
    if (targetUserId === currentAdminId && newRole !== 'ADMIN') {
      throw new BadRequestError('Administrators cannot revoke their own admin role', 'CANNOT_DEMOTE_SELF');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!existingUser) {
      throw new NotFoundError('Target user not found', 'USER_NOT_FOUND');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        updatedAt: true
      }
    });

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getSystemStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [userCount, sessionCount, gameCount, puzzleCount] = await Promise.all([
      prisma.user.count(),
      prisma.session.count(),
      prisma.game.count(),
      prisma.puzzle.count()
    ]);

    res.status(200).json({
      data: {
        users: userCount,
        activeSessions: sessionCount,
        gamesPlayed: gameCount,
        puzzlesAvailable: puzzleCount,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version
      }
    });
  } catch (err) {
    next(err);
  }
}

