import { z } from 'zod';

export const explainMoveSchema = z.object({
  fenBefore: z.string().min(1, 'fenBefore is required'),
  fenAfter: z.string().min(1, 'fenAfter is required'),
  moveSan: z.string().min(1, 'moveSan is required'),
  moveNumber: z.number().int().positive(),
  playerColor: z.enum(['w', 'b']),
  classification: z.string().min(1),
  bestMove: z.string().optional(),
  evalBefore: z.number().optional(),
  evalAfter: z.number().optional(),
  evalDelta: z.number().optional(),
  principalVariation: z.array(z.string()).optional(),
  candidateMoves: z.array(z.object({
    san: z.string(),
    score: z.number(),
    explanation: z.string().optional()
  })).optional(),
  openingName: z.string().optional(),
  coachMode: z.enum(['FULL_COACHING', 'IMPORTANT_MISTAKES', 'HINTS_ONLY', 'POST_GAME_ONLY']).default('FULL_COACHING'),
  gameId: z.string().optional()
});

export const hintSchema = z.object({
  fen: z.string().min(1, 'fen is required'),
  playerColor: z.enum(['w', 'b']),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  candidateMoves: z.array(z.object({
    san: z.string(),
    score: z.number(),
    pv: z.array(z.string()).optional()
  })).default([]),
  openingName: z.string().optional(),
  gameId: z.string().optional()
});

export const chatSchema = z.object({
  query: z.string().min(1, 'query cannot be empty').max(500, 'query too long (max 500 characters)'),
  fen: z.string().min(1, 'fen is required'),
  playerColor: z.enum(['w', 'b']),
  moveHistorySan: z.array(z.string()).default([]),
  openingName: z.string().optional(),
  lastMoveEvaluation: z.object({
    san: z.string(),
    score: z.number(),
    bestMove: z.string().optional()
  }).optional(),
  gameId: z.string().optional()
});

export const postGameSchema = z.object({
  moves: z.array(z.object({
    moveNumber: z.number(),
    san: z.string(),
    color: z.enum(['w', 'b']),
    evaluation: z.number().optional(),
    classification: z.string().optional()
  })),
  playerColor: z.enum(['w', 'b']),
  result: z.enum(['WHITE_WINS', 'BLACK_WINS', 'DRAW']),
  resultReason: z.string().min(1),
  openingName: z.string().optional(),
  accuracyWhite: z.number().optional(),
  accuracyBlack: z.number().optional(),
  gameId: z.string().optional()
});

export const coachStructuredOutputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  lesson: z.string().optional(),
  suggestedMove: z.string().optional(),
  bestAlternative: z.string().optional(),
  highlightSquares: z.array(z.string()).optional(),
  arrowFromTo: z.tuple([z.string(), z.string()]).optional()
});

const phaseSectionSchema = z.object({
  title: z.string().min(1),
  positivePoints: z.array(z.string()),
  negativePoints: z.array(z.string())
});

export const postGameStructuredOutputSchema = z.object({
  summary: z.string().min(1),
  keyLesson: z.string().min(1),
  bestMove: z.string(),
  biggestMistake: z.string().optional(),
  phaseReviews: z.object({
    opening: phaseSectionSchema,
    middlegame: phaseSectionSchema,
    endgame: phaseSectionSchema
  })
});
