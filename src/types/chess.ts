export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPieceData {
  type: PieceType;
  color: PieceColor;
}

export type SquareName =
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

export interface MoveRecord {
  from: SquareName;
  to: SquareName;
  promotion?: PieceType;
  san: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  flags: string;
  fenAfter: string;
  evaluation?: number; // centipawns or null
  moveNumber: number;
  classification?: MoveClassification;
  bestMove?: string;
  explanation?: string;
  timeSpentSeconds?: number;
  theme?: string;
  evalBefore?: number;
  evalDelta?: number;
  principalVariation?: string[];
}

export type MoveClassification =
  | 'BEST'
  | 'EXCELLENT'
  | 'GOOD'
  | 'BOOK'
  | 'INACCURACY'
  | 'MISTAKE'
  | 'BLUNDER'
  | 'MISSED_WIN';

export interface EvaluationData {
  score: number; // e.g. +1.2 or -0.5 in pawns
  isMate: boolean;
  mateIn?: number;
  label: 'Winning' | 'Better' | 'Slightly Better' | 'Equal' | 'Slightly Worse' | 'Worse' | 'Losing';
  source?: 'stockfish' | 'heuristic';
  depth?: number;
}

export interface CapturedPiecesState {
  w: PieceType[]; // Pieces captured by White (Black's lost pieces)
  b: PieceType[]; // Pieces captured by Black (White's lost pieces)
  materialDelta: number; // White's score minus Black's score (+2 means White is up 2 pawns)
}

export type BoardOrientation = 'white' | 'black';

export type BoardTheme = 'wood' | 'tournament' | 'classic' | 'slate';
export type PieceTheme = 'classic' | 'modern' | 'neo';
