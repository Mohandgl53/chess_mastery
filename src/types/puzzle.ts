import { PieceColor, SquareName } from './chess';

export type PuzzleTheme =
  | 'Fork'
  | 'Pin'
  | 'Skewer'
  | 'Discovered Attack'
  | 'Back-Rank Mate'
  | 'Deflection'
  | 'Removing Defender'
  | 'Smothered Mate'
  | 'Pawn Endgame'
  | 'Double Attack'
  | 'Hanging Piece'
  | 'Clearance'
  | 'Decoy'
  | 'Zugzwang'
  | 'Greek Gift'
  | 'Intermezzo'
  | 'Queen Sacrifice'
  | 'Tactics';

export interface PuzzleMove {
  from: SquareName;
  to: SquareName;
  san: string;
  response?: {
    from: SquareName;
    to: SquareName;
    san: string;
  };
}

export interface PuzzleHint {
  level: 1 | 2 | 3;
  title: string;
  description: string;
  highlightSquares?: SquareName[];
}

export interface Puzzle {
  id: string;
  title: string;
  rating: number;
  theme: PuzzleTheme;
  themeDescription: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  fen: string;
  playerColor: PieceColor;
  solutionMoves: PuzzleMove[];
  hints: PuzzleHint[];
  tacticalExplanation: string;
  coachInsight: string;
  source?: 'Chess.com' | 'Lichess' | 'Mastery Archive' | string;
  externalUrl?: string;
  plays?: number;
}

