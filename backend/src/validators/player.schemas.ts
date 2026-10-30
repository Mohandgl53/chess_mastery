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

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  avatarUrl: z.string().max(500000, 'Image payload too large (max ~350KB)').nullable().optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  preferredStyle: z.string().max(50).nullable().optional(),
  favoriteOpening: z.string().max(80).nullable().optional(),
  favoriteOpeningBlack: z.string().max(80).nullable().optional(),
  flair: z.string().max(30).nullable().optional(),
  statusMessage: z.string().max(120).nullable().optional()
});
