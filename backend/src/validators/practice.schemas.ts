import { z } from 'zod';
import { PRACTICE_THEMES } from '../constants/practice-themes.js';

export const startSessionSchema = z.object({
  theme: z.enum(PRACTICE_THEMES).nullable().optional(),
  sessionType: z.enum(['ADAPTIVE', 'THEME_DRILL', 'WEAKNESS_REVIEW', 'DAILY_TRAINING']).optional()
});

export const recordAttemptSchema = z.object({
  puzzleId: z.string().min(1, 'puzzleId is required'),
  moveSan: z.string().min(1, 'moveSan is required'),
  from: z.string().optional(),
  to: z.string().optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
  usedHint: z.boolean().optional(),
  hintCount: z.number().int().nonnegative().optional()
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required')
});

export const puzzleIdParamSchema = z.object({
  id: z.string().min(1, 'id is required')
});
