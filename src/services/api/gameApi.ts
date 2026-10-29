import { Chess, Square } from 'chess.js';
import { apiClient } from './client';
import { SavedGame } from '../../mock/mockGames';
import { MoveRecord, SquareName, PieceType, PieceColor, MoveClassification } from '../../types/chess';
import { GameResult } from '../../types/game';

export interface BackendMoveDto {
  id?: string;
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

export interface BackendAnalysisDto {
  id?: string;
  engineName: string;
  engineVersion: string;
  accuracyWhite?: number;
  accuracyBlack?: number;
  summary?: string;
  details?: Record<string, any>;
  analysisVersion?: number;
}

export interface BackendGameDto {
  id: string;
  userId?: string;
  opponentName: string;
  opponentType: 'AI' | 'HUMAN';
  playerColor: 'WHITE' | 'BLACK';
  result: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'RESIGNED' | 'DRAW';
  openingName?: string;
  openingEco?: string;
  startedAt?: string;
  endedAt?: string;
  finalFen: string;
  pgn?: string;
  createdAt: string;
  updatedAt: string;
  moves?: BackendMoveDto[];
  analysis?: BackendAnalysisDto | null;
  _count?: { moves: number };
}

export interface PaginatedBackendGames {
  data: BackendGameDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateGameDto {
  opponentName: string;
  opponentType?: 'AI' | 'HUMAN';
  playerColor?: 'WHITE' | 'BLACK';
  result?: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN';
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'RESIGNED' | 'DRAW';
  openingName?: string;
  openingEco?: string;
  startedAt?: string;
  endedAt?: string;
  finalFen: string;
  pgn?: string;
  moves: BackendMoveDto[];
  analysis?: {
    engineName: string;
    engineVersion: string;
    accuracyWhite?: number;
    accuracyBlack?: number;
    summary?: string;
    details?: Record<string, any>;
  };
}

// Convert Backend Game to Frontend SavedGame
export function mapBackendGameToSavedGame(bg: BackendGameDto): SavedGame {
  const isWhitePlayer = bg.playerColor === 'WHITE';
  const playerColor: PieceColor = isWhitePlayer ? 'w' : 'b';

  let result: GameResult = 'IN_PROGRESS';
  let resultString = 'In Progress';

  if (bg.result === 'WIN') {
    result = isWhitePlayer ? 'WHITE_WINS' : 'BLACK_WINS';
    resultString = isWhitePlayer ? '1 - 0 (Win)' : '0 - 1 (Win)';
  } else if (bg.result === 'LOSS') {
    result = isWhitePlayer ? 'BLACK_WINS' : 'WHITE_WINS';
    resultString = isWhitePlayer ? '0 - 1 (Loss)' : '1 - 0 (Loss)';
  } else if (bg.result === 'DRAW') {
    result = 'DRAW';
    resultString = '½ - ½ (Draw)';
  }

  // Replay moves with chess.js to hydrate piece, captured, flags
  const moves: MoveRecord[] = [];
  const chess = new Chess();
  const analysisDetails = bg.analysis?.details || {};

  const rawMoves = bg.moves || [];
  for (let i = 0; i < rawMoves.length; i++) {
    const raw = rawMoves[i];
    let from: SquareName = 'a1';
    let to: SquareName = 'a1';
    let piece: PieceType = 'p';
    let captured: PieceType | undefined;
    let flags = '';
    let promotion: PieceType | undefined;

    try {
      const executed = chess.move(raw.san);
      if (executed) {
        from = executed.from as SquareName;
        to = executed.to as SquareName;
        piece = executed.piece as PieceType;
        captured = executed.captured as PieceType | undefined;
        flags = executed.flags;
        promotion = executed.promotion as PieceType | undefined;
      }
    } catch {
      // Fallback to UCI coordinates if available
      if (raw.uci && raw.uci.length >= 4) {
        from = raw.uci.slice(0, 2) as SquareName;
        to = raw.uci.slice(2, 4) as SquareName;
        if (raw.uci.length > 4) {
          promotion = raw.uci[4] as PieceType;
        }
      }
    }

    const rawDetails = (analysisDetails as any)?.moves?.[i] || (analysisDetails as any)?.moveAnalysis?.[i] || {};

    moves.push({
      from,
      to,
      promotion,
      san: raw.san,
      piece,
      color: raw.color as PieceColor,
      captured,
      flags,
      fenAfter: raw.fen,
      evaluation: raw.evaluation,
      moveNumber: raw.moveNumber,
      classification: raw.classification,
      explanation: raw.explanation,
      timeSpentSeconds: raw.timeSpentSeconds,
      bestMove: (raw as any).bestMove || rawDetails.bestMove,
      principalVariation: (raw as any).principalVariation || rawDetails.principalVariation,
      evalBefore: (raw as any).evalBefore || rawDetails.evalBefore,
      evalDelta: (raw as any).evalDelta || rawDetails.evalDelta,
      theme: (raw as any).theme || (raw as any).detectedThemes?.[0] || rawDetails.theme
    });
  }

  const whiteAccuracy = bg.analysis?.accuracyWhite ?? 80;
  const blackAccuracy = bg.analysis?.accuracyBlack ?? 80;
  const playerAccuracy = isWhitePlayer ? whiteAccuracy : blackAccuracy;
  const opponentAccuracy = isWhitePlayer ? blackAccuracy : whiteAccuracy;

  return {
    id: bg.id,
    whitePlayer: isWhitePlayer ? 'You' : bg.opponentName,
    whiteRating: isWhitePlayer ? 1200 : 1400,
    blackPlayer: isWhitePlayer ? bg.opponentName : 'You',
    blackRating: isWhitePlayer ? 1400 : 1200,
    result,
    resultString,
    date: bg.createdAt ? new Date(bg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent',
    opening: {
      eco: bg.openingEco || 'A00',
      name: bg.openingName || 'Chess Opening',
      description: 'Recorded chess game'
    },
    accuracy: {
      white: whiteAccuracy,
      black: blackAccuracy
    },
    moves,
    pgn: bg.pgn || chess.pgn(),
    finalFen: bg.finalFen || chess.fen(),
    analysis: {
      result,
      resultReason: bg.analysis?.summary || resultString,
      playerColor,
      accuracy: {
        player: playerAccuracy,
        opponent: opponentAccuracy
      },
      opening: {
        eco: bg.openingEco || 'A00',
        name: bg.openingName || 'Chess Opening',
        description: 'Recorded chess game'
      },
      bestMove: analysisDetails.bestMove || (moves.find(m => m.classification === 'BEST')?.san || 'e4'),
      biggestMistake: analysisDetails.biggestMistake,
      keyLesson: analysisDetails.keyLesson || bg.analysis?.summary || 'Review tactical opportunities in the position.',
      moveBreakdown: analysisDetails.moveBreakdown || {
        best: moves.filter(m => m.classification === 'BEST').length,
        excellent: moves.filter(m => m.classification === 'EXCELLENT').length,
        good: moves.filter(m => m.classification === 'GOOD').length,
        inaccuracies: moves.filter(m => m.classification === 'INACCURACY').length,
        mistakes: moves.filter(m => m.classification === 'MISTAKE').length,
        blunders: moves.filter(m => m.classification === 'BLUNDER').length
      },
      phaseReviews: analysisDetails.phaseReviews || {
        opening: { title: 'Opening Phase', positivePoints: ['Consistent development'], negativePoints: [] },
        middlegame: { title: 'Middlegame Phase', positivePoints: ['Active piece placement'], negativePoints: [] },
        endgame: { title: 'Endgame Phase', positivePoints: ['Clean conversion'], negativePoints: [] }
      }
    }
  };
}

// Convert Frontend SavedGame to Backend CreateGameDto
export function mapSavedGameToCreateGameDto(game: SavedGame): CreateGameDto {
  const isWhite = game.analysis?.playerColor === 'w' || !game.whitePlayer.toLowerCase().includes('coach');
  const opponentName = isWhite ? game.blackPlayer : game.whitePlayer;

  let result: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN' = 'UNKNOWN';
  if (game.result === 'WHITE_WINS') {
    result = isWhite ? 'WIN' : 'LOSS';
  } else if (game.result === 'BLACK_WINS') {
    result = isWhite ? 'LOSS' : 'WIN';
  } else if (game.result === 'DRAW') {
    result = 'DRAW';
  }

  const moves: BackendMoveDto[] = game.moves.map((m, idx) => ({
    ply: idx + 1,
    moveNumber: m.moveNumber || Math.floor(idx / 2) + 1,
    color: m.color,
    san: m.san,
    uci: `${m.from}${m.to}${m.promotion || ''}`,
    fen: m.fenAfter,
    evaluation: m.evaluation,
    classification: m.classification,
    explanation: m.explanation,
    timeSpentSeconds: m.timeSpentSeconds
  }));

  // DATA OWNERSHIP:
  // GameMove stores per-ply results.
  // GameAnalysis stores whole-game summary info and engineVersion without duplicating per-move payloads.
  return {
    opponentName: opponentName || 'Stockfish AI',
    opponentType: 'AI',
    playerColor: isWhite ? 'WHITE' : 'BLACK',
    result,
    status: 'COMPLETED',
    openingName: game.opening?.name,
    openingEco: game.opening?.eco,
    finalFen: game.finalFen,
    pgn: game.pgn,
    moves,
    analysis: {
      engineName: 'Stockfish',
      engineVersion: 'Stockfish 19 Lite WASM',
      accuracyWhite: game.accuracy?.white ?? (isWhite ? game.analysis?.accuracy?.player : game.analysis?.accuracy?.opponent) ?? 80,
      accuracyBlack: game.accuracy?.black ?? (isWhite ? game.analysis?.accuracy?.opponent : game.analysis?.accuracy?.player) ?? 80,
      summary: game.analysis?.keyLesson || game.analysis?.resultReason || 'Game completed',
      details: {
        keyLesson: game.analysis?.keyLesson,
        bestMove: game.analysis?.bestMove,
        biggestMistake: game.analysis?.biggestMistake,
        moveBreakdown: game.analysis?.moveBreakdown,
        phaseReviews: game.analysis?.phaseReviews,
        moves: game.moves.map((m) => ({
          san: m.san,
          bestMove: m.bestMove,
          principalVariation: m.principalVariation,
          evalBefore: m.evalBefore,
          evalDelta: m.evalDelta,
          theme: m.theme
        }))
      }
    }
  };
}

export const gameApi = {
  async getGames(page = 1, limit = 20): Promise<PaginatedBackendGames> {
    return apiClient<PaginatedBackendGames>(`/games?page=${page}&limit=${limit}`);
  },

  async getGameById(id: string): Promise<{ data: BackendGameDto }> {
    return apiClient<{ data: BackendGameDto }>(`/games/${id}`);
  },

  async createGame(payload: CreateGameDto): Promise<{ data: BackendGameDto }> {
    return apiClient<{ data: BackendGameDto }>('/games', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateGame(id: string, payload: Partial<CreateGameDto>): Promise<{ data: BackendGameDto }> {
    return apiClient<{ data: BackendGameDto }>(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteGame(id: string): Promise<{ data: { id: string } }> {
    return apiClient<{ data: { id: string } }>(`/games/${id}`, {
      method: 'DELETE'
    });
  }
};
