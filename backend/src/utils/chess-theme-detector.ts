/**
 * Phase 6.1: Authoritative Chess-Aware Theme Detector
 *
 * Implements concrete board geometry, ray-tracing, piece values, and state-transition
 * analysis using chess.js.
 *
 * ARCHITECTURAL RULE:
 * - chess.js & Stockfish are the authoritative source of truth.
 * - NO LLM is used to guess or classify chess themes.
 * - Real board coordinates, attacks, defenses, and piece interactions are analyzed.
 */

import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { KnowledgeCategory, EvidenceType, EvidenceSeverity, MoveClassification } from '@prisma/client';

export interface DetectedChessTheme {
  theme: string;
  category: KnowledgeCategory;
  evidenceType: EvidenceType;
  severity: EvidenceSeverity;
  confidence: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface MoveAnalysisParams {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveUci?: string;
  moveNumber: number;
  playerColor: 'w' | 'b';
  classification?: MoveClassification;
  evalBefore?: number;
  evalAfter?: number;
  evalDelta?: number;
  bestMoveSan?: string;
  bestMoveUci?: string;
  hasCastled?: boolean;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100
};

const CENTER_SQUARES: Square[] = ['e4', 'd4', 'e5', 'd5'];
const EXTENDED_CENTER: Square[] = ['c4', 'c5', 'f4', 'f5'];

export class ChessThemeDetector {
  /**
   * Run full chess-aware theme analysis on a position transition.
   */
  public detectThemes(params: MoveAnalysisParams): DetectedChessTheme[] {
    const results: DetectedChessTheme[] = [];
    const isBlunder = params.classification === 'BLUNDER';
    const isMistake = params.classification === 'MISTAKE';
    const isError = isBlunder || isMistake;
    const isBest = params.classification === 'BEST' || params.classification === 'EXCELLENT';

    let chessBefore: Chess | null = null;
    let chessAfter: Chess | null = null;

    try {
      chessBefore = new Chess(params.fenBefore);
    } catch {
      chessBefore = null;
    }

    try {
      chessAfter = new Chess(params.fenAfter);
    } catch {
      chessAfter = null;
    }

    if (!chessAfter) return results;

    const opponentColor: Color = params.playerColor === 'w' ? 'b' : 'w';

    // 1. FORK DETECTION (Executed by player or missed opportunity / blundered into)
    const forkTheme = this.detectFork(chessBefore, chessAfter, params, isError);
    if (forkTheme) results.push(forkTheme);

    // 2. PIN DETECTION (Absolute or relative pin)
    const pinTheme = this.detectPin(chessBefore, chessAfter, params, isError);
    if (pinTheme) results.push(pinTheme);

    // 3. SKEWER DETECTION
    const skewerTheme = this.detectSkewer(chessBefore, chessAfter, params, isError);
    if (skewerTheme) results.push(skewerTheme);

    // 4. HANGING PIECE DETECTION
    const hangingTheme = this.detectHangingPiece(chessBefore, chessAfter, params, isError);
    if (hangingTheme) results.push(hangingTheme);

    // 5. BACK-RANK DETECTION
    const backRankTheme = this.detectBackRank(chessBefore, chessAfter, params, isError);
    if (backRankTheme) results.push(backRankTheme);

    // 6. KING SAFETY & LATE CASTLING
    const lateCastlingTheme = this.detectLateCastling(chessAfter, params);
    if (lateCastlingTheme) results.push(lateCastlingTheme);

    // 7. CENTER CONTROL
    const centerTheme = this.detectCenterControl(chessBefore, chessAfter, params, isBest);
    if (centerTheme) results.push(centerTheme);

    // 8. OPEN FILE UTILIZATION
    const openFileTheme = this.detectOpenFile(chessBefore, chessAfter, params, isBest);
    if (openFileTheme) results.push(openFileTheme);

    return results;
  }

  /**
   * FORK: A single piece attacks >= 2 enemy pieces of value/importance simultaneously.
   * Can be executed by the player, or missed by the player (best move was a fork).
   */
  public detectFork(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isError: boolean
  ): DetectedChessTheme | null {
    const color = params.playerColor;
    const opponent: Color = color === 'w' ? 'b' : 'w';

    // A. Check if the move executed a fork
    const executedMove = this.getLastMoveDestination(chessBefore, chessAfter, params.moveSan);
    if (executedMove) {
      const attackedSquares = this.getAttackedSquares(chessAfter, executedMove.to, color);
      const enemyPiecesAttacked = attackedSquares
        .map((sq) => ({ sq, piece: chessAfter.get(sq) }))
        .filter((item) => item.piece && item.piece.color === opponent);

      // A genuine fork attacks at least 2 distinct enemy pieces
      // At least one target must be a high-value piece (King, Queen, Rook) or both must be undefended/valuable
      if (enemyPiecesAttacked.length >= 2) {
        const hasMajorTarget = enemyPiecesAttacked.some(
          (p) => p.piece!.type === 'k' || p.piece!.type === 'q' || p.piece!.type === 'r'
        );
        const movingPiece = chessAfter.get(executedMove.to);
        const movingValue = movingPiece ? PIECE_VALUES[movingPiece.type] : 3;

        // Verify attacker is not simply attacking two pawns defended by pawns
        const targetsWorthy = enemyPiecesAttacked.filter(
          (p) => PIECE_VALUES[p.piece!.type] >= movingValue || p.piece!.type === 'k'
        );

        if (hasMajorTarget || targetsWorthy.length >= 2) {
          return {
            theme: 'FORK',
            category: 'TACTICS',
            evidenceType: 'POSITIVE',
            severity: 'LOW',
            confidence: 0.85,
            description: `Executed a ${movingPiece?.type.toUpperCase() || 'piece'} fork attacking ${enemyPiecesAttacked
              .map((p) => p.sq)
              .join(' and ')}.`,
            metadata: {
              from: executedMove.from,
              to: executedMove.to,
              targets: enemyPiecesAttacked.map((p) => p.sq)
            }
          };
        }
      }
    }

    // B. Check if player MISSED a fork or allowed an opponent fork on a blunder
    if (isError && params.bestMoveSan && chessBefore) {
      try {
        const tempChess = new Chess(chessBefore.fen());
        const bestMoveObj = tempChess.move(params.bestMoveSan);
        if (bestMoveObj) {
          const attacksFromBest = this.getAttackedSquares(tempChess, bestMoveObj.to, color);
          const enemyAttacked = attacksFromBest
            .map((sq) => ({ sq, piece: tempChess.get(sq) }))
            .filter((item) => item.piece && item.piece.color === opponent);

          if (enemyAttacked.length >= 2 && enemyAttacked.some((p) => p.piece!.type === 'k' || p.piece!.type === 'q' || p.piece!.type === 'r')) {
            return {
              theme: 'FORK',
              category: 'TACTICS',
              evidenceType: 'NEGATIVE',
              severity: isError ? 'HIGH' : 'MEDIUM',
              confidence: 0.85,
              description: `Missed tactical fork opportunity with ${params.bestMoveSan}.`,
              metadata: { missedMove: params.bestMoveSan, targets: enemyAttacked.map((p) => p.sq) }
            };
          }
        }
      } catch {
        // bestMoveSan parse fallback
      }
    }

    return null;
  }

  /**
   * PIN: A sliding piece attacks a piece that shields a higher-value piece behind it.
   * Absolute pin (shielding King) or Relative pin (shielding Queen/Rook).
   */
  public detectPin(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isError: boolean
  ): DetectedChessTheme | null {
    const color = params.playerColor;
    const opponent: Color = color === 'w' ? 'b' : 'w';

    // Check all opponent pieces to see if any are pinned by player's sliding pieces
    const board = chessAfter.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === opponent && p.type !== 'k') {
          const pinnedSquare = p.square;
          const pinResult = this.checkIfPieceIsPinned(chessAfter, pinnedSquare, opponent);
          if (pinResult.isPinned && pinResult.pinningColor === color) {
            // Player executed/maintained a pin
            return {
              theme: 'PIN',
              category: 'TACTICS',
              evidenceType: 'POSITIVE',
              severity: 'LOW',
              confidence: 0.85,
              description: `Utilized ${pinResult.pinType} pin on ${pinnedSquare} against ${pinResult.targetSquare}.`,
              metadata: {
                pinnedSquare,
                attackerSquare: pinResult.attackerSquare,
                targetSquare: pinResult.targetSquare,
                pinType: pinResult.pinType
              }
            };
          }
        }
      }
    }

    // Check if player's own piece was pinned resulting in a blunder
    if (isError) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.color === color && p.type !== 'k') {
            const pinResult = this.checkIfPieceIsPinned(chessAfter, p.square, color);
            if (pinResult.isPinned && pinResult.pinningColor === opponent) {
              return {
                theme: 'PIN',
                category: 'TACTICS',
                evidenceType: 'NEGATIVE',
                severity: 'HIGH',
                confidence: 0.8,
                description: `Vulnerable to ${pinResult.pinType} pin on ${p.square} shielding ${pinResult.targetSquare}.`,
                metadata: {
                  pinnedSquare: p.square,
                  attackerSquare: pinResult.attackerSquare,
                  targetSquare: pinResult.targetSquare
                }
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * SKEWER: A sliding piece attacks a valuable front piece (King/Queen),
   * which is forced to move and exposes an equal or lesser piece behind it.
   */
  public detectSkewer(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isError: boolean
  ): DetectedChessTheme | null {
    const color = params.playerColor;
    const opponent: Color = color === 'w' ? 'b' : 'w';

    const lastMove = this.getLastMoveDestination(chessBefore, chessAfter, params.moveSan);
    const attackerSq = lastMove ? lastMove.to : null;

    if (attackerSq) {
      const attacker = chessAfter.get(attackerSq);
      if (attacker && attacker.color === color && (attacker.type === 'b' || attacker.type === 'r' || attacker.type === 'q')) {
        const skewer = this.findSkewerOnBoard(chessAfter, attackerSq, color, opponent);
        if (skewer) {
          return {
            theme: 'SKEWER',
            category: 'TACTICS',
            evidenceType: 'POSITIVE',
            severity: 'LOW',
            confidence: 0.85,
            description: `Executed skewer with ${attacker.type.toUpperCase()} on ${skewer.frontSquare} shielding ${skewer.rearSquare}.`,
            metadata: skewer
          };
        }
      }
    }

    // Check if player suffered a skewer on blunder
    if (isError) {
      const board = chessAfter.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.color === opponent && (p.type === 'b' || p.type === 'r' || p.type === 'q')) {
            const skewer = this.findSkewerOnBoard(chessAfter, p.square, opponent, color);
            if (skewer) {
              return {
                theme: 'SKEWER',
                category: 'TACTICS',
                evidenceType: 'NEGATIVE',
                severity: 'HIGH',
                confidence: 0.85,
                description: `Vulnerable to skewer on ${skewer.frontSquare} exposing ${skewer.rearSquare}.`,
                metadata: skewer
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * HANGING PIECE: A piece is undefended or under-defended with material loss.
   * False-positive filter: Checks if piece is defended by immediate recapture trade.
   */
  public detectHangingPiece(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isError: boolean
  ): DetectedChessTheme | null {
    const color = params.playerColor;
    const opponent: Color = color === 'w' ? 'b' : 'w';

    // If player made a blunder/mistake, check if a player piece was left hanging
    if (isError) {
      const board = chessAfter.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.color === color && p.type !== 'k') {
            const sq = p.square;
            const attackers = chessAfter.attackers(sq, opponent);
            const defenders = chessAfter.attackers(sq, color);

            if (attackers.length > 0) {
              const victimVal = PIECE_VALUES[p.type];
              const minAttackerVal = Math.min(
                ...attackers.map((a) => {
                  const piece = chessAfter.get(a);
                  return piece ? PIECE_VALUES[piece.type] : 100;
                })
              );

              // 1. Completely undefended piece under attack
              const isCompletelyUndefended = defenders.length === 0;

              // 2. Attacked by lower value piece (e.g. pawn attacking rook/queen) even if defended
              const isFavorableTrade = minAttackerVal < victimVal;

              // 3. More attackers than defenders
              const isUnderdefended = attackers.length > defenders.length;

              if (isCompletelyUndefended || isFavorableTrade || isUnderdefended) {
                return {
                  theme: 'HANGING_PIECE',
                  category: 'BLUNDER_PREVENTION',
                  evidenceType: 'NEGATIVE',
                  severity: isError ? 'HIGH' : 'MEDIUM',
                  confidence: 0.85,
                  description: `Left ${p.type.toUpperCase()} on ${sq} hanging (${attackers.length} attackers vs ${defenders.length} defenders).`,
                  metadata: {
                    hangingSquare: sq,
                    pieceType: p.type,
                    attackers,
                    defenders
                  }
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * BACK-RANK: Rook or Queen checks/attacks the king trapped on 1st/8th rank
   * without flight squares (luft).
   */
  public detectBackRank(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isError: boolean
  ): DetectedChessTheme | null {
    const color = params.playerColor;
    const opponent: Color = color === 'w' ? 'b' : 'w';

    // Find Kings
    const kingSquare = this.findKingSquare(chessAfter, color);
    const opponentKingSquare = this.findKingSquare(chessAfter, opponent);

    // Check if player attacked opponent's back rank
    if (opponentKingSquare) {
      const oppRank = opponent === 'w' ? '1' : '8';
      if (opponentKingSquare.endsWith(oppRank)) {
        const isTrapped = this.isKingTrappedOnBackRank(chessAfter, opponentKingSquare, opponent);
        const inCheck = chessAfter.inCheck() && chessAfter.turn() === opponent;
        if (isTrapped && (inCheck || this.isSquareAttackedByHeavyPiece(chessAfter, opponentKingSquare, color))) {
          return {
            theme: 'BACK_RANK',
            category: 'TACTICS',
            evidenceType: 'POSITIVE',
            severity: 'LOW',
            confidence: 0.85,
            description: `Applied back-rank tactical pressure on ${opponentKingSquare}.`,
            metadata: { kingSquare: opponentKingSquare }
          };
        }
      }
    }

    // Check if player suffered back-rank vulnerability
    if (kingSquare && isError) {
      const myRank = color === 'w' ? '1' : '8';
      if (kingSquare.endsWith(myRank)) {
        const isTrapped = this.isKingTrappedOnBackRank(chessAfter, kingSquare, color);
        if (isTrapped && this.isBackRankUnderAttack(chessAfter, myRank, opponent)) {
          return {
            theme: 'BACK_RANK',
            category: 'TACTICS',
            evidenceType: 'NEGATIVE',
            severity: 'HIGH',
            confidence: 0.9,
            description: `Vulnerable to back-rank mate/threat on rank ${myRank} without luft.`,
            metadata: { kingSquare, rank: myRank }
          };
        }
      }
    }

    return null;
  }

  /**
   * LATE CASTLING: Player king remains uncastled past move 10 with open center files.
   */
  public detectLateCastling(
    chessAfter: Chess,
    params: MoveAnalysisParams
  ): DetectedChessTheme | null {
    if (params.moveNumber <= 10) return null;
    if (params.hasCastled) return null;

    const color = params.playerColor;
    const startSq: Square = color === 'w' ? 'e1' : 'e8';
    const kingPiece = chessAfter.get(startSq);

    // If king is not on start square, player either castled or moved king
    if (!kingPiece || kingPiece.type !== 'k' || kingPiece.color !== color) {
      return null;
    }

    // Check if e or d file is open/semi-open
    const eFilePawns = this.countPawnsOnFile(chessAfter, 'e');
    const dFilePawns = this.countPawnsOnFile(chessAfter, 'd');
    const isCenterExposed = eFilePawns <= 1 || dFilePawns <= 1;

    // Check if castling rights still exist or were lost
    const rights = chessAfter.getCastlingRights(color);
    const hasRights = rights.k || rights.q;

    if (isCenterExposed && hasRights && params.moveNumber >= 12) {
      return {
        theme: 'LATE_CASTLING',
        category: 'KING_SAFETY',
        evidenceType: 'NEGATIVE',
        severity: 'MEDIUM',
        confidence: 0.75,
        description: `King remains in the exposed center on move ${params.moveNumber} despite castling rights being available.`,
        metadata: { moveNumber: params.moveNumber, centerPawns: eFilePawns + dFilePawns }
      };
    }

    return null;
  }

  /**
   * CENTER CONTROL: Move occupies or establishes pawn/piece control over e4, d4, e5, d5.
   */
  public detectCenterControl(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isBest: boolean
  ): DetectedChessTheme | null {
    if (params.moveNumber > 10) return null;

    const lastMove = this.getLastMoveDestination(chessBefore, chessAfter, params.moveSan);
    if (!lastMove) return null;

    const color = params.playerColor;
    const isOccupyingCenter = CENTER_SQUARES.includes(lastMove.to);
    const isOccupyingExtended = EXTENDED_CENTER.includes(lastMove.to);

    // Check how many central squares are attacked by this piece
    const attacks = this.getAttackedSquares(chessAfter, lastMove.to, color);
    const centerAttacks = attacks.filter((sq) => CENTER_SQUARES.includes(sq)).length;

    if ((isOccupyingCenter || (isOccupyingExtended && centerAttacks >= 1) || centerAttacks >= 2) && isBest) {
      return {
        theme: 'CENTER_CONTROL',
        category: 'OPENING',
        evidenceType: 'POSITIVE',
        severity: 'LOW',
        confidence: 0.8,
        description: `Established strong central presence on ${lastMove.to} controlling ${centerAttacks} central squares.`,
        metadata: { toSquare: lastMove.to, centerAttacks }
      };
    }

    return null;
  }

  /**
   * OPEN FILE: Rook or Queen occupies a file with 0 pawns or 0 friendly pawns.
   */
  public detectOpenFile(
    chessBefore: Chess | null,
    chessAfter: Chess,
    params: MoveAnalysisParams,
    isBest: boolean
  ): DetectedChessTheme | null {
    const lastMove = this.getLastMoveDestination(chessBefore, chessAfter, params.moveSan);
    if (!lastMove) return null;

    const piece = chessAfter.get(lastMove.to);
    if (!piece || (piece.type !== 'r' && piece.type !== 'q')) return null;

    const file = lastMove.to[0];
    const pawnCounts = this.getPawnCountByColorOnFile(chessAfter, file);

    const isFullyOpen = pawnCounts.w === 0 && pawnCounts.b === 0;
    const isSemiOpen = params.playerColor === 'w' ? pawnCounts.w === 0 : pawnCounts.b === 0;

    if (isFullyOpen || isSemiOpen) {
      return {
        theme: 'OPEN_FILE',
        category: 'MIDDLEGAME',
        evidenceType: 'POSITIVE',
        severity: 'LOW',
        confidence: 0.8,
        description: `Activated ${piece.type === 'r' ? 'Rook' : 'Queen'} along the ${isFullyOpen ? 'open' : 'semi-open'} ${file}-file.`,
        metadata: { file, isFullyOpen, isSemiOpen }
      };
    }

    return null;
  }

  // ==========================================
  // HELPER CALCULATIONS & GEOMETRY UTILITIES
  // ==========================================

  private getLastMoveDestination(
    chessBefore: Chess | null,
    chessAfter: Chess,
    san: string
  ): { from: Square; to: Square } | null {
    if (!chessBefore) return null;
    const legalMoves = chessBefore.moves({ verbose: true });
    const matched = legalMoves.find((m) => m.san === san);
    if (matched) {
      return { from: matched.from, to: matched.to };
    }
    return null;
  }

  private getAttackedSquares(chess: Chess, fromSquare: Square, color: Color): Square[] {
    const attacks: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const f of files) {
      for (const r of ranks) {
        const target = `${f}${r}` as Square;
        if (target === fromSquare) continue;
        const attackers = chess.attackers(target, color);
        if (attackers.includes(fromSquare)) {
          attacks.push(target);
        }
      }
    }
    return attacks;
  }

  private checkIfPieceIsPinned(
    chess: Chess,
    targetSquare: Square,
    pieceColor: Color
  ): {
    isPinned: boolean;
    attackerSquare?: Square;
    targetSquare?: Square;
    pinType?: 'ABSOLUTE' | 'RELATIVE';
    pinningColor?: Color;
  } {
    const opponent: Color = pieceColor === 'w' ? 'b' : 'w';
    const kingSquare = this.findKingSquare(chess, pieceColor);
    const queenSquare = this.findPieceSquare(chess, 'q', pieceColor);

    // Test with the target piece removed
    const clone = new Chess(chess.fen());
    clone.remove(targetSquare);

    // 1. Absolute Pin Check (King exposed)
    if (kingSquare) {
      const attackersOnKing = clone.attackers(kingSquare, opponent);
      const originalAttackers = chess.attackers(kingSquare, opponent);
      const newAttackers = attackersOnKing.filter((a) => !originalAttackers.includes(a));

      if (newAttackers.length > 0) {
        return {
          isPinned: true,
          attackerSquare: newAttackers[0],
          targetSquare: kingSquare,
          pinType: 'ABSOLUTE',
          pinningColor: opponent
        };
      }
    }

    // 2. Relative Pin Check (Queen exposed)
    if (queenSquare && queenSquare !== targetSquare) {
      const attackersOnQueen = clone.attackers(queenSquare, opponent);
      const originalAttackers = chess.attackers(queenSquare, opponent);
      const newAttackers = attackersOnQueen.filter((a) => !originalAttackers.includes(a));

      if (newAttackers.length > 0) {
        return {
          isPinned: true,
          attackerSquare: newAttackers[0],
          targetSquare: queenSquare,
          pinType: 'RELATIVE',
          pinningColor: opponent
        };
      }
    }

    return { isPinned: false };
  }

  private findSkewerOnBoard(
    chess: Chess,
    attackerSquare: Square,
    attackerColor: Color,
    targetColor: Color
  ): { frontSquare: Square; rearSquare: Square; frontPiece: PieceSymbol; rearPiece: PieceSymbol } | null {
    const attacked = this.getAttackedSquares(chess, attackerSquare, attackerColor);
    const attackedPieces = attacked
      .map((sq) => ({ sq, piece: chess.get(sq) }))
      .filter((item) => item.piece && item.piece.color === targetColor);

    // For each attacked piece, check if removing it exposes a piece behind it along the same ray
    for (const front of attackedPieces) {
      const frontVal = PIECE_VALUES[front.piece!.type];

      // Front piece must be valuable (King, Queen, or Rook)
      if (frontVal >= 5 || front.piece!.type === 'k') {
        const clone = new Chess(chess.fen());
        clone.remove(front.sq);

        const newAttacks = this.getAttackedSquares(clone, attackerSquare, attackerColor);
        const rearTargets = newAttacks
          .map((sq) => ({ sq, piece: clone.get(sq) }))
          .filter((item) => item.piece && item.piece.color === targetColor);

        for (const rear of rearTargets) {
          const rearVal = PIECE_VALUES[rear.piece!.type];
          // SKEWER DEFINITION: Front piece is MORE or EQUAL value than rear piece
          // (Distinct from Pin where front piece is LESS value than rear piece)
          if (frontVal >= rearVal && rearVal >= 3) {
            return {
              frontSquare: front.sq,
              rearSquare: rear.sq,
              frontPiece: front.piece!.type,
              rearPiece: rear.piece!.type
            };
          }
        }
      }
    }
    return null;
  }

  private isKingTrappedOnBackRank(chess: Chess, kingSquare: Square, color: Color): boolean {
    const rank = kingSquare[1];
    const file = kingSquare[0];
    const nextRank = color === 'w' ? '2' : '7';

    // Check the squares directly in front of the King on nextRank
    const fileIndex = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(file);
    const candidateFlightFiles = [fileIndex - 1, fileIndex, fileIndex + 1].filter((idx) => idx >= 0 && idx < 8);
    const opponent: Color = color === 'w' ? 'b' : 'w';

    let openFlightSquares = 0;
    for (const fIdx of candidateFlightFiles) {
      const flightSq = `${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][fIdx]}${nextRank}` as Square;
      const pieceOnFlight = chess.get(flightSq);
      const isAttacked = chess.isAttacked(flightSq, opponent);

      // If square has friendly pawn or is attacked by opponent, King cannot escape there
      if (!pieceOnFlight && !isAttacked) {
        openFlightSquares++;
      }
    }

    // If 0 open flight squares on rank 2 or 7, king is trapped behind pawn shield
    return openFlightSquares === 0;
  }

  private isBackRankUnderAttack(chess: Chess, rank: string, attackerColor: Color): boolean {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const f of files) {
      const sq = `${f}${rank}` as Square;
      const attackers = chess.attackers(sq, attackerColor);
      for (const a of attackers) {
        const piece = chess.get(a);
        if (piece && (piece.type === 'r' || piece.type === 'q')) {
          return true;
        }
      }
    }
    return false;
  }

  private isSquareAttackedByHeavyPiece(chess: Chess, square: Square, attackerColor: Color): boolean {
    const attackers = chess.attackers(square, attackerColor);
    return attackers.some((a) => {
      const p = chess.get(a);
      return p && (p.type === 'r' || p.type === 'q');
    });
  }

  private findKingSquare(chess: Chess, color: Color): Square | null {
    return this.findPieceSquare(chess, 'k', color);
  }

  private findPieceSquare(chess: Chess, pieceType: PieceSymbol, color: Color): Square | null {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === pieceType && p.color === color) {
          return p.square;
        }
      }
    }
    return null;
  }

  private countPawnsOnFile(chess: Chess, file: string): number {
    const board = chess.board();
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'p' && p.square[0] === file) {
          count++;
        }
      }
    }
    return count;
  }

  private getPawnCountByColorOnFile(chess: Chess, file: string): { w: number; b: number } {
    const board = chess.board();
    let w = 0;
    let b = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'p' && p.square[0] === file) {
          if (p.color === 'w') w++;
          else b++;
        }
      }
    }
    return { w, b };
  }
}

export const chessThemeDetector = new ChessThemeDetector();
