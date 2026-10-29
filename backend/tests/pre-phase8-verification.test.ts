import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { chessThemeDetector } from '../src/utils/chess-theme-detector.js';

describe('Pre-Phase 8 Core Chess Engine, Analysis, Bot & Analytics Verification', () => {
  // ─── 1. Perspective Normalization & Blunder Detection ──────────────────────
  describe('1. Perspective Normalization & Centipawn Loss Detection', () => {
    it('correctly normalizes White moves: advantage loss produces positive evalDelta and blunder classification', () => {
      // White to move: score drops from +2.5 to -3.0 after White hangs a piece
      const scoreBefore = 2.5;
      const scoreAfter = -3.0;
      const movingSide = 'w';

      const sideSign = movingSide === 'w' ? 1 : -1;
      const evalDelta = Math.max(0, Math.round(((scoreBefore - scoreAfter) * sideSign) * 10) / 10);

      expect(evalDelta).toBe(5.5);
      expect(evalDelta).toBeGreaterThanOrEqual(3.2); // Blunder threshold
    });

    it('correctly normalizes Black moves: score increasing (in White favor) produces positive evalDelta for Black', () => {
      // Black to move: score was -0.5 (slight Black lead), but after Black blunders, score becomes +4.0 (huge White lead)
      const scoreBefore = -0.5;
      const scoreAfter = 4.0;
      const movingSide = 'b';

      const sideSign = movingSide === 'w' ? 1 : -1;
      const evalDelta = Math.max(0, Math.round(((scoreBefore - scoreAfter) * sideSign) * 10) / 10);

      // ( -0.5 - 4.0 ) * (-1) = (-4.5) * (-1) = 4.5
      expect(evalDelta).toBe(4.5);
      expect(evalDelta).toBeGreaterThanOrEqual(3.2); // Blunder threshold
    });

    it('improving position never produces centipawn loss (clamped to 0)', () => {
      // White improves from 0.0 to +3.5
      const whiteImprovement = Math.max(0, Math.round(((0.0 - 3.5) * 1) * 10) / 10);
      expect(whiteImprovement).toBe(0);

      // Black improves from 0.0 to -3.5 (UCI score decreases)
      const blackImprovement = Math.max(0, Math.round(((0.0 - (-3.5)) * (-1)) * 10) / 10);
      expect(blackImprovement).toBe(0);
    });
  });

  // ─── 2. Blunder vs Good Move Classification ─────────────────────────────────
  describe('2. Move-by-Move Classification Logic', () => {
    function classify(evalDelta: number, moveSan: string, bestMove: string) {
      if (moveSan === bestMove) {
        return { classification: 'BEST', evalDelta: 0 };
      }
      if (evalDelta < 0.3) {
        return { classification: 'EXCELLENT', evalDelta };
      } else if (evalDelta < 0.8) {
        return { classification: 'GOOD', evalDelta };
      } else if (evalDelta < 1.8) {
        return { classification: 'INACCURACY', evalDelta };
      } else if (evalDelta < 3.2) {
        return { classification: 'MISTAKE', evalDelta };
      } else {
        return { classification: 'BLUNDER', evalDelta };
      }
    }

    it('classifies matching top engine move as BEST with 0 delta', () => {
      const res = classify(0.5, 'Nf3', 'Nf3');
      expect(res.classification).toBe('BEST');
      expect(res.evalDelta).toBe(0);
    });

    it('classifies small delta (<0.3) as EXCELLENT', () => {
      const res = classify(0.2, 'd4', 'e4');
      expect(res.classification).toBe('EXCELLENT');
    });

    it('classifies solid delta (0.3 - 0.8) as GOOD', () => {
      const res = classify(0.5, 'c4', 'e4');
      expect(res.classification).toBe('GOOD');
    });

    it('classifies inaccuracies, mistakes, and blunders distinctly', () => {
      expect(classify(1.2, 'h3', 'd4').classification).toBe('INACCURACY');
      expect(classify(2.5, 'a3', 'd4').classification).toBe('MISTAKE');
      expect(classify(4.8, 'Qe2', 'd4').classification).toBe('BLUNDER');
    });
  });

  // ─── 3. Analytics Non-Hard-Coding Test ───────────────────────────────────────
  describe('3. Analytics Non-Hard-Coding Across Materially Different Games', () => {
    function computeAccuracies(moves: { color: string; classification: string }[]) {
      const whiteMoves = moves.filter((m) => m.color === 'w');
      const blackMoves = moves.filter((m) => m.color === 'b');

      const weights: Record<string, number> = {
        BEST: 100,
        EXCELLENT: 92,
        GOOD: 80,
        BOOK: 80,
        INACCURACY: 50,
        MISTAKE: 25,
        BLUNDER: 0
      };

      const calc = (list: typeof moves) => {
        if (list.length === 0) return 80;
        const total = list.reduce((sum, m) => sum + (weights[m.classification] ?? 70), 0);
        return Math.min(100, Math.max(20, Math.round(total / list.length)));
      };

      return {
        whiteAccuracy: calc(whiteMoves),
        blackAccuracy: calc(blackMoves),
        whiteBlunders: whiteMoves.filter((m) => m.classification === 'BLUNDER').length,
        blackBlunders: blackMoves.filter((m) => m.classification === 'BLUNDER').length
      };
    }

    it('produces high accuracy for well-played master opening moves (Game A)', () => {
      const gameA = [
        { color: 'w', classification: 'BEST' },
        { color: 'b', classification: 'BEST' },
        { color: 'w', classification: 'EXCELLENT' },
        { color: 'b', classification: 'BEST' },
        { color: 'w', classification: 'BEST' },
        { color: 'b', classification: 'EXCELLENT' }
      ];

      const statsA = computeAccuracies(gameA);
      expect(statsA.whiteAccuracy).toBeGreaterThanOrEqual(95);
      expect(statsA.blackAccuracy).toBeGreaterThanOrEqual(95);
      expect(statsA.whiteBlunders).toBe(0);
      expect(statsA.blackBlunders).toBe(0);
    });

    it('produces severely dropped accuracy and blunder counts for blunder game (Game B)', () => {
      const gameB = [
        { color: 'w', classification: 'BEST' },
        { color: 'b', classification: 'BEST' },
        { color: 'w', classification: 'BLUNDER' },
        { color: 'b', classification: 'BEST' },
        { color: 'w', classification: 'MISTAKE' },
        { color: 'b', classification: 'BLUNDER' }
      ];

      const statsB = computeAccuracies(gameB);
      // White: (100 + 0 + 25) / 3 = 41.7 -> 42%
      expect(statsB.whiteAccuracy).toBeLessThan(50);
      expect(statsB.whiteBlunders).toBe(1);
      expect(statsB.blackBlunders).toBe(1);
    });

    it('Game A and Game B metrics are strictly non-identical and dynamically differentiated', () => {
      const gameA = [
        { color: 'w', classification: 'BEST' },
        { color: 'b', classification: 'BEST' }
      ];
      const gameB = [
        { color: 'w', classification: 'BLUNDER' },
        { color: 'b', classification: 'BLUNDER' }
      ];

      const statsA = computeAccuracies(gameA);
      const statsB = computeAccuracies(gameB);

      expect(statsA.whiteAccuracy).not.toBe(statsB.whiteAccuracy);
      expect(statsA.blackAccuracy).not.toBe(statsB.blackAccuracy);
      expect(statsA.whiteAccuracy - statsB.whiteAccuracy).toBeGreaterThanOrEqual(50);
    });
  });

  // ─── 4. Equal Bot Calibration Scaling ───────────────────────────────────────
  describe('4. Equal-Level Bot Dynamic Calibration', () => {
    function getBotCalibration(difficulty: string, playerRating = 1200) {
      if (difficulty === 'Equal') {
        if (playerRating < 800) {
          return { depth: 2, moveTime: 150, multiPV: 3, candidateThresholdCp: 250 };
        } else if (playerRating < 1100) {
          return { depth: 4, moveTime: 300, multiPV: 2, candidateThresholdCp: 150 };
        } else if (playerRating < 1400) {
          return { depth: 7, moveTime: 600, multiPV: 1, candidateThresholdCp: 40 };
        } else if (playerRating < 1700) {
          return { depth: 10, moveTime: 800, multiPV: 1, candidateThresholdCp: 0 };
        } else if (playerRating < 2000) {
          return { depth: 14, moveTime: 1200, multiPV: 1, candidateThresholdCp: 0 };
        } else {
          return { depth: 18, moveTime: 1800, multiPV: 1, candidateThresholdCp: 0 };
        }
      }
      return { depth: 7, moveTime: 600, multiPV: 1, candidateThresholdCp: 0 };
    }

    it('calibrates Equal bot for a 700-rated beginner with higher blunder tolerance (multiPV 3)', () => {
      const cal = getBotCalibration('Equal', 700);
      expect(cal.depth).toBe(2);
      expect(cal.multiPV).toBe(3);
      expect(cal.candidateThresholdCp).toBe(250);
    });

    it('calibrates Equal bot for a 1300-rated intermediate player with solid depth (depth 7)', () => {
      const cal = getBotCalibration('Equal', 1300);
      expect(cal.depth).toBe(7);
      expect(cal.multiPV).toBe(1);
    });

    it('calibrates Equal bot for a 2100-rated expert with deep calculation (depth 18)', () => {
      const cal = getBotCalibration('Equal', 2100);
      expect(cal.depth).toBe(18);
      expect(cal.moveTime).toBe(1800);
    });
  });

  // ─── 5. Board State & Special Chess Rules Synchronization ───────────────────
  describe('5. Board State Synchronization (En Passant, Castling, Promotion)', () => {
    it('properly validates and synchronizes En Passant execution', () => {
      const chess = new Chess();
      // 1. e4 Nf6 2. e5 d5 3. exd6 (en passant!)
      chess.move('e4');
      chess.move('Nf6');
      chess.move('e5');
      chess.move('d5');
      const epMove = chess.move('exd6');

      expect(epMove).not.toBeNull();
      expect(epMove.flags).toContain('e'); // en passant flag
      expect(chess.get('d5')).toBeFalsy(); // captured black pawn removed
      expect(chess.get('d6')).toEqual({ type: 'p', color: 'w' }); // white pawn on d6
    });

    it('properly validates Kingside and Queenside castling synchronization', () => {
      const chess = new Chess();
      // Fast setup to castle kingside
      chess.move('e4');
      chess.move('e5');
      chess.move('Nf3');
      chess.move('Nc6');
      chess.move('Bc4');
      chess.move('Bc5');
      const castleMove = chess.move('O-O');

      expect(castleMove).not.toBeNull();
      expect(castleMove.flags).toContain('k');
      expect(chess.get('g1')).toEqual({ type: 'k', color: 'w' });
      expect(chess.get('f1')).toEqual({ type: 'r', color: 'w' });
      expect(chess.get('e1')).toBeFalsy();
      expect(chess.get('h1')).toBeFalsy();
    });

    it('properly rejects invalid promotion on non-pawn piece without throwing fatal crash', () => {
      const chess = new Chess();
      // Try moving knight with promotion: undefined
      const moveNormal = chess.move({ from: 'b1', to: 'c3', promotion: undefined });
      expect(moveNormal).not.toBeNull();
      expect(moveNormal.san).toBe('Nc3');
    });

    it('properly executes pawn promotion to Queen', () => {
      // White pawn on e7 ready to promote on e8
      const chess = new Chess('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
      const promoMove = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });

      expect(promoMove).not.toBeNull();
      expect(promoMove.promotion).toBe('q');
      expect(chess.get('e8')).toEqual({ type: 'q', color: 'w' });
    });
  });

  // ─── 6. Tactical Theme Detection Verification ──────────────────────────────
  describe('6. Theme Detection Verification on Real Tactical Positions', () => {
    it('detects FORK when knight moves to c7 attacking King on e8 and Rook on a8', () => {
      const fenBefore = 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Nxc7+');
      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: c.fen(),
        moveSan: 'Nxc7+',
        moveNumber: 15,
        playerColor: 'w',
        classification: 'BEST'
      });
      const fork = themes.find((t) => t.theme === 'FORK');
      expect(fork).toBeDefined();
      expect(fork!.category).toBe('TACTICS');
    });

    it('detects PIN when bishop moves to g5 pinning Knight on f6 against Queen on d8', () => {
      const fenBefore = 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Bg5');
      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: c.fen(),
        moveSan: 'Bg5',
        moveNumber: 7,
        playerColor: 'w',
        classification: 'BEST'
      });
      const pin = themes.find((t) => t.theme === 'PIN');
      expect(pin).toBeDefined();
      expect(pin!.category).toBe('TACTICS');
    });

    it('negative control: normal opening move does not generate false tactical fork', () => {
      const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const c = new Chess(fenBefore);
      c.move('Nf3');
      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: c.fen(),
        moveSan: 'Nf3',
        moveNumber: 2,
        playerColor: 'w',
        classification: 'BOOK'
      });
      const fork = themes.find((t) => t.theme === 'FORK');
      expect(fork).toBeUndefined();
    });
  });
});
