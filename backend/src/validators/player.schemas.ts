import { z } from 'zod';

export const recommendationIdParamSchema = z.object({
  id: z.string().min(1, 'Recommendation ID is required')
});

export const processGameParamSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required')
});

export const weaknessQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'IMPROVING', 'RESOLVED', 'DORMANT']).optional(),
  category: z.enum([
    'OPENING',
    'MIDDLEGAME',
    'ENDGAME',
    'TACTICS',
    'STRATEGY',
    'PSYCHOLOGY',
    'TIME_MANAGEMENT',
    'CALCULATION',
    'KING_SAFETY',
    'BLUNDER_PREVENTION'
  ]).optional()
});

export const evidenceQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 30)),
  category: z.string().optional(),
  theme: z.string().optional()
});
