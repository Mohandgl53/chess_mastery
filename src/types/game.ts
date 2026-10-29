import { PieceColor, MoveRecord, CapturedPiecesState, EvaluationData } from './chess';
export type { PieceColor };

export type GameDifficulty = 'Beginner' | 'Easy' | 'Intermediate' | 'Advanced' | 'Expert' | 'Equal';

export type GameStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'CHECK'
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'DRAW_REPETITION'
  | 'DRAW_MATERIAL'
  | 'DRAW_50_MOVES'
  | 'RESIGNED'
  | 'TIMEOUT';

export type GameResult = 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW' | 'IN_PROGRESS';

export interface OpeningInfo {
  eco: string;
  name: string;
  variation?: string;
  description?: string;
}

export interface PlayerStats {
  name: string;
  rating: number;
  avatarUrl?: string;
  color: PieceColor;
  isAi: boolean;
  timeRemainingSeconds: number;
}

export interface PhaseReview {
  title: string;
  positivePoints: string[];
  negativePoints: string[];
}

export interface PostGameAnalysis {
  result: GameResult;
  resultReason: string;
  playerColor: PieceColor;
  accuracy: {
    player: number;
    opponent: number;
  };
  opening: OpeningInfo;
  bestMove: string;
  biggestMistake?: string;
  keyLesson: string;
  moveBreakdown: {
    best: number;
    excellent: number;
    good: number;
    inaccuracies: number;
    mistakes: number;
    blunders: number;
  };
  phaseReviews: {
    opening: PhaseReview;
    middlegame: PhaseReview;
    endgame: PhaseReview;
  };
  detectedThemes?: string[];
  gameId?: string;
}

export interface GameSettings {
  playerColor: PieceColor;
  difficulty: GameDifficulty;
  timeControlMinutes: number;
  incrementSeconds: number;
  autoCoachReaction: boolean;
}
