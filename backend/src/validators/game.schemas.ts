import { z } from 'zod';
import { MoveClassification, OpponentType, PlayerColor, GameStatus, GameResult } from '../types/index.js';

export const createGameMoveSchema = z.object({
  ply: z.number().int().min(1),
  moveNumber: z.number().int().min(1),
  color: z.enum(['w', 'b']),
  san: z.string().min(1),
  uci: z.string().optional(),
  fen: z.string().min(1),
  evaluation: z.number().optional(),
  isMate: z.boolean().optional(),
  mateIn: z.number().int().optional(),
  classification: z.nativeEnum(MoveClassification).optional(),
  explanation: z.string().optional(),
  timeSpentSeconds: z.number().optional()
});

export const createGameAnalysisSchema = z.object({
  engineName: z.string().default('Stockfish'),
  engineVersion: z.string().min(1, 'Engine version is required'),
  accuracyWhite: z.number().min(0).max(100).optional(),
  accuracyBlack: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
  details: z.record(z.any()).optional(),
  analysisVersion: z.number().int().default(1)
});

export const createGameSchema = z.object({
  opponentName: z.string().min(1, 'Opponent name is required'),
  opponentType: z.nativeEnum(OpponentType).default(OpponentType.AI),
  playerColor: z.nativeEnum(PlayerColor).default(PlayerColor.WHITE),
  result: z.nativeEnum(GameResult).default(GameResult.UNKNOWN),
  status: z.nativeEnum(GameStatus).default(GameStatus.IN_PROGRESS),
  openingName: z.string().optional(),
  openingEco: z.string().optional(),
  startedAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endedAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  finalFen: z.string().min(1, 'Final FEN is required'),
  pgn: z.string().optional(),
  moves: z.array(createGameMoveSchema).default([]),
  analysis: createGameAnalysisSchema.optional()
});

export const updateGameSchema = z.object({
  status: z.nativeEnum(GameStatus).optional(),
  result: z.nativeEnum(GameResult).optional(),
  finalFen: z.string().optional(),
  pgn: z.string().optional(),
  endedAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
});
