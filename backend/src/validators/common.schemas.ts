import { z } from 'zod';

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'RESIGNED', 'DRAW']).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW', 'UNKNOWN']).optional()
});

export const idParamSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required')
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});
