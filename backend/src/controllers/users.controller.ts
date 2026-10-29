import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export async function getCurrentUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const profile = await userService.getUserProfile(userId, userId, req.user!.role);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getParam(req.params.userId);
    const requestingUserId = req.user?.id;
    const requestingRole = req.user?.role;
    const profile = await userService.getUserProfile(userId, requestingUserId, requestingRole);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
}
