import {
  OpponentType,
  PlayerColor,
  GameStatus,
  GameResult,
  MoveClassification
} from '@prisma/client';

import type {
  Game,
  GameMove,
  GameAnalysis,
  User,
  PlayerProfile,
  Session
} from '@prisma/client';

export {
  OpponentType,
  PlayerColor,
  GameStatus,
  GameResult,
  MoveClassification
};

export type {
  Game,
  GameMove,
  GameAnalysis,
  User,
  PlayerProfile,
  Session
};

/**
 * Safe authenticated user attached to req.user after session validation.
 * Never includes passwordHash, session token, or tokenHash.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StandardResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateGameMoveInput {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci?: string;
  fen: string;
  evaluation?: number;
  isMate?: boolean;
  mateIn?: number;
  classification?: MoveClassification;
  explanation?: string;
  timeSpentSeconds?: number;
}

export interface CreateGameAnalysisInput {
  engineName?: string;
  engineVersion: string;
  accuracyWhite?: number;
  accuracyBlack?: number;
  summary?: string;
  details?: Record<string, unknown>;
  analysisVersion?: number;
}

export interface CreateGameInput {
  opponentName: string;
  opponentType?: OpponentType;
  playerColor?: PlayerColor;
  result?: GameResult;
  status?: GameStatus;
  openingName?: string;
  openingEco?: string;
  startedAt?: Date;
  endedAt?: Date;
  finalFen: string;
  pgn?: string;
  moves: CreateGameMoveInput[];
  analysis?: CreateGameAnalysisInput;
}

export interface UpdateGameInput {
  status?: GameStatus;
  result?: GameResult;
  finalFen?: string;
  pgn?: string;
  endedAt?: Date;
}

/**
 * Safe auth response — never contains passwordHash, tokenHash, or raw session token.
 */
export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}

export interface SafeProfile {
  id: string;
  userId: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
}

export interface SafeAuthResponse {
  user: SafeUser;
  profile: SafeProfile;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}
