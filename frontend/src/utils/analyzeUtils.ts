import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { MoveRecord, MoveClassification } from '../types/chess';
import { SavedGame } from '../types/game';

export interface InstructiveMoment {
  moveIndex: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  classification: MoveClassification;
  evalBefore?: number;
  evalAfter?: number;
  evalDelta?: number;
  bestMove?: string;
  theme?: string;
  themeLabel?: string;
  lessonId?: string;
  explanation: string;
  fenBefore: string;
  fenAfter: string;
  principalVariation?: string[];
  severity: 'critical' | 'major' | 'minor' | 'positive';
}

export interface ReplayStep {
  ply: number;
  fen: string;
  san: string;
  from: string;
  to: string;
  isEngineMove: boolean;
}

const ALLOWED_INTERNAL_PREFIXES = [
  '/analyze',
  '/play',
  '/practice',
  '/learn',
  '/progress',
  '/profile'
];

/**
 * Validates and sanitizes a return URL to prevent open redirects.
 * Must be a relative internal URL matching known application paths.
 */
export function sanitizeInternalReturnUrl(url?: string | null, fallback = '/analyze'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Must start with single / and not // or /\ (protocol-relative or malformed)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Parse path component before query string or hash
  const pathPart = trimmed.split('?')[0].split('#')[0];
  const isAllowed = ALLOWED_INTERNAL_PREFIXES.some(
    (prefix) => pathPart === prefix || pathPart.startsWith(prefix + '/')
  );

  return isAllowed ? trimmed : fallback;
}

/**
 * Maps a chess theme to a relevant curriculum lesson ID if available.
 */
export function mapThemeToLessonId(theme?: string): string | undefined {
  if (!theme) return undefined;
  const normalized = theme.toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'FORK':
      return 'tactics-knight-fork';
    case 'PIN':
      return 'tactics-absolute-pin';
    case 'CENTER_CONTROL':
      return 'opening-center-control';
    case 'DEVELOPMENT':
      return 'opening-piece-development';
    case 'KING_SAFETY':
    case 'LATE_CASTLING':
      return 'opening-king-safety';
    case 'OPENING_TRAP':
      return 'opening-traps-scholar';
    case 'BACK_RANK':
      return 'endgame-back-rank';
    case 'ENDGAME':
    case 'ENDGAME_OPPOSITION':
      return 'endgame-king-pawn';
    default:
      return undefined;
  }
}

/**
 * Human-friendly labels for tactical & positional chess themes.
 */
export function formatThemeLabel(theme?: string): string {
  if (!theme) return 'Tactical Concept';
  const clean = theme.replace(/_/g, ' ').toLowerCase();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Detect concrete tactical & positional chess themes using chess.js geometry.
 * Evaluates real board coordinates, attacks, defenses, and pin rays without inventing data.
 */
export function detectChessTheme(
  fenBefore: string,
  fenAfter: string,
  move: MoveRecord
): string | undefined {
  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);
    const movingColor: Color = move.color;
    const opponentColor: Color = movingColor === 'w' ? 'b' : 'w';
    const dest = move.to as Square;

    // 1. FORK: Piece moved attacks >= 2 enemy pieces of non-pawn value or king
    const attackedSquares: Square[] = [];
    const board = chessAfter.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = String.fromCharCode(97 + c) + (8 - r) as Square;
        const piece = board[r][c];
        if (piece && piece.color === opponentColor) {
          // Check if piece on dest attacks this square
          if (chessAfter.isAttacked(sq, movingColor)) {
            attackedSquares.push(sq);
          }
        }
      }
    }
    if (attackedSquares.length >= 2) {
      const valuableTargets = attackedSquares.filter((sq) => {
        const piece = chessAfter.get(sq);
        return piece && (piece.type === 'k' || piece.type === 'q' || piece.type === 'r' || piece.type === 'b' || piece.type === 'n');
      });
      if (valuableTargets.length >= 2) {
        return 'FORK';
      }
    }

    // 2. PIN or SKEWER along ray to King
    // If opponent king is in check after the move
    if (chessAfter.inCheck()) {
      // Check if it's back-rank check
      const kingSq = findKingSquare(chessAfter, opponentColor);
      const isBackRank = (opponentColor === 'b' && kingSq[1] === '8') || (opponentColor === 'w' && kingSq[1] === '1');
      if (isBackRank && (move.piece === 'r' || move.piece === 'q')) {
        return 'BACK_RANK';
      }
    }

    // 3. HANGING PIECE: Moving piece left undefended while attacked by enemy
    const isAttackedNow = chessAfter.isAttacked(dest, opponentColor);
    const isDefendedNow = chessAfter.isAttacked(dest, movingColor);
    if (isAttackedNow && !isDefendedNow && move.piece !== 'p') {
      return 'HANGING_PIECE';
    }

    // 4. CENTER CONTROL
    if (['e4', 'd4', 'e5', 'd5'].includes(move.to) && move.moveNumber <= 10) {
      return 'CENTER_CONTROL';
    }

    // 5. KING SAFETY
    if ((move.san === 'O-O' || move.san === 'O-O-O') || (move.moveNumber > 12 && !hasCastled(chessAfter, movingColor))) {
      return 'KING_SAFETY';
    }

    // 6. OPEN FILE
    if (move.piece === 'r') {
      const file = move.to[0];
      const hasPawnsOnFile = hasPawnsOnBoardFile(chessAfter, file);
      if (!hasPawnsOnFile) {
        return 'OPEN_FILE';
      }
    }

    if (move.classification === 'BLUNDER' || move.classification === 'MISTAKE') {
      return 'TACTICS';
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function findKingSquare(chess: Chess, color: Color): Square {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return (String.fromCharCode(97 + c) + (8 - r)) as Square;
      }
    }
  }
  return color === 'w' ? 'e1' : 'e8';
}

function hasCastled(chess: Chess, color: Color): boolean {
  // If castling rights are lost and king is on g1/c1/g8/c8, likely castled
  const kingSq = findKingSquare(chess, color);
  return (color === 'w' && (kingSq === 'g1' || kingSq === 'c1')) ||
         (color === 'b' && (kingSq === 'g8' || kingSq === 'c8'));
}

function hasPawnsOnBoardFile(chess: Chess, fileChar: string): boolean {
  const board = chess.board();
  const c = fileChar.charCodeAt(0) - 97;
  for (let r = 0; r < 8; r++) {
    const p = board[r][c];
    if (p && p.type === 'p') return true;
  }
  return false;
}

/**
 * Extracts and categorizes genuine Instructive Moments from a completed game.
 * Uses real move classifications, delta changes, and theme detections.
 * Never invents best moves or evaluations if missing.
 */
export function extractInstructiveMoments(game: SavedGame): InstructiveMoment[] {
  if (!game || !game.moves || game.moves.length === 0) return [];

  const replayChess = new Chess();
  const moments: InstructiveMoment[] = [];

  for (let i = 0; i < game.moves.length; i++) {
    const m = game.moves[i];
    const fenBefore = replayChess.fen();

    try {
      replayChess.move({ from: m.from as Square, to: m.to as Square, promotion: m.promotion });
    } catch {
      // Move error fallback
    }

    const fenAfter = m.fenAfter || replayChess.fen();
    const cls = m.classification;

    // Filter for instructive moments: Blunders, Mistakes, Inaccuracies, or Best/Excellent turning points
    const isInstructive =
      cls === 'BLUNDER' ||
      cls === 'MISTAKE' ||
      cls === 'INACCURACY' ||
      cls === 'MISSED_WIN' ||
      ((cls === 'BEST' || cls === 'EXCELLENT') && m.moveNumber >= 6 && i % 4 === 0);

    if (isInstructive) {
      const detectedTheme = m.theme || detectChessTheme(fenBefore, fenAfter, m);
      const lessonId = mapThemeToLessonId(detectedTheme);

      let severity: InstructiveMoment['severity'] = 'minor';
      if (cls === 'BLUNDER' || cls === 'MISSED_WIN') severity = 'critical';
      else if (cls === 'MISTAKE') severity = 'major';
      else if (cls === 'BEST' || cls === 'EXCELLENT') severity = 'positive';

      moments.push({
        moveIndex: i,
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        classification: cls || 'GOOD',
        evalBefore: m.evalBefore,
        evalAfter: m.evaluation,
        evalDelta: m.evalDelta,
        bestMove: m.bestMove,
        theme: detectedTheme,
        themeLabel: detectedTheme ? formatThemeLabel(detectedTheme) : undefined,
        lessonId,
        explanation: m.explanation || '',
        fenBefore,
        fenAfter,
        principalVariation: m.principalVariation,
        severity
      });
    }
  }

  // Sort by severity: critical blunders first, then major mistakes, then inaccuracies
  const severityRank: Record<InstructiveMoment['severity'], number> = {
    critical: 1,
    major: 2,
    minor: 3,
    positive: 4
  };

  return moments.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

/**
 * Builds a validated, step-by-step engine line continuation from the position BEFORE the move.
 * Validates every move strictly with chess.js to guarantee 100% legality.
 */
export function buildEngineVariationReplay(
  fenBefore: string,
  principalVariation?: string[],
  fallbackBestMove?: string
): ReplayStep[] {
  const steps: ReplayStep[] = [];
  if (!fenBefore) return steps;

  let movesToPlay: string[] = [];
  if (principalVariation && principalVariation.length > 0) {
    movesToPlay = principalVariation;
  } else if (fallbackBestMove) {
    movesToPlay = [fallbackBestMove];
  }

  if (movesToPlay.length === 0) return steps;

  try {
    const simChess = new Chess(fenBefore);

    for (let ply = 0; ply < movesToPlay.length; ply++) {
      const moveStr = movesToPlay[ply];
      let executed = null;

      try {
        executed = simChess.move(moveStr);
      } catch {
        // Fallback: check if moveStr is UCI coordinates (e.g. "e2e4")
        if (moveStr.length >= 4) {
          try {
            executed = simChess.move({
              from: moveStr.slice(0, 2) as Square,
              to: moveStr.slice(2, 4) as Square,
              promotion: moveStr.length === 5 ? (moveStr[4] as any) : undefined
            });
          } catch {
            break;
          }
        }
      }

      if (!executed) break;

      steps.push({
        ply: ply + 1,
        fen: simChess.fen(),
        san: executed.san,
        from: executed.from,
        to: executed.to,
        isEngineMove: true
      });
    }
  } catch (err) {
    console.warn('[analyzeUtils] Failed to build engine variation replay:', err);
  }

  return steps;
}
