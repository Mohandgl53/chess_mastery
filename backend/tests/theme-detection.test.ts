import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { chessThemeDetector } from '../src/utils/chess-theme-detector.js';
import { playerMemoryService } from '../src/services/player-memory.service.js';
import { prisma } from '../src/config/database.js';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Phase 6.1: Practical Chess Theme Detection & Negative Control Tests', () => {
  describe('1. Tactical Theme: FORK Detection', () => {
    it('Positive Case: Detects Knight Fork attacking King and Rook simultaneously', () => {
      // Position: White Knight on d5, Black King on e8, Black Rook on a8
      // Move: Nxc7+
      const fenBefore = 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Nxc7+');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Nxc7+',
        moveNumber: 15,
        playerColor: 'w',
        classification: 'BEST'
      });

      const forkTheme = themes.find((t) => t.theme === 'FORK');
      expect(forkTheme).toBeDefined();
      expect(forkTheme!.category).toBe('TACTICS');
      expect(forkTheme!.evidenceType).toBe('POSITIVE');
      expect(forkTheme!.confidence).toBeGreaterThanOrEqual(0.8);
      expect(forkTheme!.metadata?.targets).toContain('e8');
      expect(forkTheme!.metadata?.targets).toContain('a8');
    });

    it('Positive Case: Detects Pawn Fork attacking two minor pieces', () => {
      // White pawn on d4 pushes to d5, forking Black knight on c6 and Black bishop on e6
      const fenBefore = 'r2qk2r/ppp2ppp/2n1b3/8/3P4/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('d5');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'd5',
        moveNumber: 8,
        playerColor: 'w',
        classification: 'BEST'
      });

      const forkTheme = themes.find((t) => t.theme === 'FORK');
      expect(forkTheme).toBeDefined();
      expect(forkTheme!.category).toBe('TACTICS');
      expect(forkTheme!.metadata?.targets).toContain('c6');
      expect(forkTheme!.metadata?.targets).toContain('e6');
    });

    it('Negative Control: Normal developing move attacking 1 piece is NOT a fork', () => {
      // 1. e4 e5 2. Nf3 (Nf3 attacks only e5 pawn, not a fork)
      const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const c = new Chess(fenBefore);
      c.move('Nf3');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Nf3',
        moveNumber: 2,
        playerColor: 'w',
        classification: 'BOOK'
      });

      const forkTheme = themes.find((t) => t.theme === 'FORK');
      expect(forkTheme).toBeUndefined();
    });
  });

  describe('2. Tactical Theme: PIN Detection', () => {
    it('Positive Case: Detects Relative Pin of Knight on f6 against Queen on d8', () => {
      // White bishop on c1 moves to g5, Black knight on f6, Black queen on d8 (open diagonal)
      const fenBefore = 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Bg5');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Bg5',
        moveNumber: 6,
        playerColor: 'w',
        classification: 'BEST'
      });

      const pinTheme = themes.find((t) => t.theme === 'PIN');
      expect(pinTheme).toBeDefined();
      expect(pinTheme!.category).toBe('TACTICS');
      expect(pinTheme!.metadata?.pinnedSquare).toBe('f6');
      expect(pinTheme!.metadata?.pinType).toBe('RELATIVE');
    });

    it('Positive Case: Detects Absolute Pin of Knight on c6 against King on e8', () => {
      // White bishop on b5, Black knight on c6, Black king on e8 (d7 pawn moved to d6)
      const fenBefore = 'r1bqk2r/ppp2ppp/2np1n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Bb5');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Bb5',
        moveNumber: 5,
        playerColor: 'w',
        classification: 'BEST'
      });

      const pinTheme = themes.find((t) => t.theme === 'PIN');
      expect(pinTheme).toBeDefined();
      expect(pinTheme!.metadata?.pinnedSquare).toBe('c6');
      expect(pinTheme!.metadata?.pinType).toBe('ABSOLUTE');
    });

    it('Negative Control: Bishop move without target piece behind is NOT a pin', () => {
      // Bc4 attacking f7 pawn defended by king (f7 is not pinning anything behind it)
      const fenBefore = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const c = new Chess(fenBefore);
      c.move('Bc4');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Bc4',
        moveNumber: 3,
        playerColor: 'w',
        classification: 'BOOK'
      });

      const pinTheme = themes.find((t) => t.theme === 'PIN');
      expect(pinTheme).toBeUndefined();
    });
  });

  describe('3. Tactical Theme: SKEWER Detection', () => {
    it('Positive Case: Detects Skewer where King in front is forced to move, exposing Rook behind', () => {
      // Position: White Rook on f1, Black King on e7, Black Rook on e8
      // Move: Re1+ (King is checked on e7, must step aside, exposing e8 Rook)
      const fenBefore = '4r3/4k3/8/8/8/8/8/3K1R2 w - - 0 1';
      const c = new Chess(fenBefore);
      c.move('Re1+');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Re1+',
        moveNumber: 30,
        playerColor: 'w',
        classification: 'BEST'
      });

      const skewerTheme = themes.find((t) => t.theme === 'SKEWER');
      expect(skewerTheme).toBeDefined();
      expect(skewerTheme!.category).toBe('TACTICS');
      expect(skewerTheme!.metadata?.frontSquare).toBe('e7');
      expect(skewerTheme!.metadata?.rearSquare).toBe('e8');
      expect(skewerTheme!.metadata?.frontPiece).toBe('k');
      expect(skewerTheme!.metadata?.rearPiece).toBe('r');
    });

    it('Negative Control: Pin is NOT misclassified as a Skewer', () => {
      // In a pin, the LOWER value piece is in front (f6 knight in front of d8 queen)
      const fenBefore = 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Bg5');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Bg5',
        moveNumber: 6,
        playerColor: 'w',
        classification: 'BEST'
      });

      const skewerTheme = themes.find((t) => t.theme === 'SKEWER');
      // Must NOT be detected as skewer because Knight value (3) < Queen value (9)
      expect(skewerTheme).toBeUndefined();
    });
  });

  describe('4. Blunder Prevention: HANGING PIECE Detection', () => {
    it('Positive Case: Detects blunder leaving minor piece on undefended square under attack', () => {
      // Black moves knight to e4 where White pawn on d3 attacks it with 0 Black defenders
      const fenBefore = 'r1bqk2r/pppp1ppp/2n5/4p3/4n3/3P1N2/PPP2PPP/RNBQKB1R b KQkq - 0 4';
      const themes = chessThemeDetector.detectThemes({
        fenBefore: 'r1bqk2r/pppp1ppp/2n5/4p3/8/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
        fenAfter: fenBefore,
        moveSan: 'Ne4',
        moveNumber: 4,
        playerColor: 'b',
        classification: 'BLUNDER'
      });

      const hanging = themes.find((t) => t.theme === 'HANGING_PIECE');
      expect(hanging).toBeDefined();
      expect(hanging!.category).toBe('BLUNDER_PREVENTION');
      expect(hanging!.evidenceType).toBe('NEGATIVE');
      expect(hanging!.metadata?.hangingSquare).toBe('e4');
    });

    it('Negative Control / False-Positive Defense: Tactically protected piece by equal recapture is NOT hanging', () => {
      // White pawn on e4 is attacked by Black knight on f6, but defended by White knight on c3 and pawn on d3
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R b KQkq - 0 4';
      const themes = chessThemeDetector.detectThemes({
        fenBefore: fen,
        fenAfter: fen,
        moveSan: 'Nf6',
        moveNumber: 4,
        playerColor: 'w',
        classification: 'BOOK'
      });

      const hanging = themes.find((t) => t.theme === 'HANGING_PIECE');
      expect(hanging).toBeUndefined();
    });
  });

  describe('5. Tactical Theme: BACK-RANK Detection', () => {
    it('Positive Case: Detects back-rank check against King trapped behind unmoved pawn shield', () => {
      // Black King on g8 trapped behind pawns f7, g7, h7 with no luft. White plays Rd8+
      const fenBefore = '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
      const c = new Chess(fenBefore);
      c.move('Rd8+');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Rd8+',
        moveNumber: 25,
        playerColor: 'w',
        classification: 'BEST'
      });

      const backRank = themes.find((t) => t.theme === 'BACK_RANK');
      expect(backRank).toBeDefined();
      expect(backRank!.category).toBe('TACTICS');
    });

    it('Negative Control: Rook check on back rank when King has open flight square (luft) is NOT back-rank weakness', () => {
      // Black pawn has moved to h6 (luft on h7). King is NOT trapped
      const fenBefore = '3r2k1/5pp1/7p/8/8/8/5PPP/3R2K1 w - - 0 1';
      const c = new Chess(fenBefore);
      c.move('Rd8+');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Rd8+',
        moveNumber: 25,
        playerColor: 'w',
        classification: 'GOOD'
      });

      // Since Black has escape square h7, it is not an inescapable back-rank trap
      const backRank = themes.find((t) => t.theme === 'BACK_RANK');
      expect(backRank).toBeUndefined();
    });
  });

  describe('6. King Safety: LATE CASTLING Detection', () => {
    it('Positive Case: Detects king lingering on e1 past move 12 with open center and castling available', () => {
      // Center e and d files have 0 pawns, White king still on e1 at move 13 with O-O available
      const fen = 'r1bq1rk1/ppp2ppp/2n5/8/8/2N2N2/PPP2PPP/R1BQK2R w KQ - 0 13';
      const c = new Chess(fen);

      const theme = chessThemeDetector.detectLateCastling(c, {
        fenBefore: fen,
        fenAfter: fen,
        moveSan: 'Qe2',
        moveNumber: 13,
        playerColor: 'w',
        hasCastled: false
      });

      expect(theme).toBeDefined();
      expect(theme!.theme).toBe('LATE_CASTLING');
      expect(theme!.category).toBe('KING_SAFETY');
      expect(theme!.evidenceType).toBe('NEGATIVE');
    });

    it('Negative Control: Uncastled king in early opening (move 4) is NOT marked late castling', () => {
      const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const c = new Chess(fen);

      const theme = chessThemeDetector.detectLateCastling(c, {
        fenBefore: fen,
        fenAfter: fen,
        moveSan: 'Bc4',
        moveNumber: 3,
        playerColor: 'w',
        hasCastled: false
      });

      expect(theme).toBeNull();
    });
  });

  describe('7. Positional Theme: CENTER CONTROL Detection', () => {
    it('Positive Case: 1. e4 occupies central square and attacks d5/f5', () => {
      const fenBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('e4');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'e4',
        moveNumber: 1,
        playerColor: 'w',
        classification: 'BEST'
      });

      const center = themes.find((t) => t.theme === 'CENTER_CONTROL');
      expect(center).toBeDefined();
      expect(center!.category).toBe('OPENING');
      expect(center!.evidenceType).toBe('POSITIVE');
    });

    it('Negative Control: Flank pawn push 1. h4 does NOT claim center control', () => {
      const fenBefore = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('h4');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'h4',
        moveNumber: 1,
        playerColor: 'w',
        classification: 'INACCURACY'
      });

      const center = themes.find((t) => t.theme === 'CENTER_CONTROL');
      expect(center).toBeUndefined();
    });
  });

  describe('8. Positional Theme: OPEN FILE Detection', () => {
    it('Positive Case: Detects Rook moving to fully open d-file with zero pawns', () => {
      // d-file has no white or black pawns. White rook moves to d1
      const fenBefore = 'r4rk1/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1';
      const c = new Chess(fenBefore);
      c.move('Rad1');
      const fenAfter = c.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Rad1',
        moveNumber: 16,
        playerColor: 'w',
        classification: 'BEST'
      });

      const openFile = themes.find((t) => t.theme === 'OPEN_FILE');
      expect(openFile).toBeDefined();
      expect(openFile!.category).toBe('MIDDLEGAME');
      expect(openFile!.metadata?.isFullyOpen).toBe(true);
    });

    it('Negative Control: Rook on closed file with friendly pawn is NOT open file', () => {
      // f-file has White pawn on f2 and Black pawn on f7. Move Rf1 is closed
      const fenBefore = 'r4rk1/ppp2ppp/8/8/8/8/PPP2PPP/4RRK1 w - - 0 1';
      const c = new Chess(fenBefore);
      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: fenBefore,
        moveSan: 'Rf1',
        moveNumber: 16,
        playerColor: 'w',
        classification: 'GOOD'
      });

      const openFile = themes.find((t) => t.theme === 'OPEN_FILE');
      expect(openFile).toBeUndefined();
    });
  });

  describe('9. Cross-Theme Distinction Tests', () => {
    it('Distinguishes FORK from SKEWER cleanly', () => {
      // A Knight fork attacks two separate targets from divergent rays
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

      expect(themes.some((t) => t.theme === 'FORK')).toBe(true);
      expect(themes.some((t) => t.theme === 'SKEWER')).toBe(false);
    });

    it('Distinguishes PIN from SKEWER cleanly', () => {
      // Bishop on g5 pinning f6 knight against d8 queen
      const fenBefore = 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1';
      const c = new Chess(fenBefore);
      c.move('Bg5');

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: c.fen(),
        moveSan: 'Bg5',
        moveNumber: 6,
        playerColor: 'w',
        classification: 'BEST'
      });

      expect(themes.some((t) => t.theme === 'PIN')).toBe(true);
      expect(themes.some((t) => t.theme === 'SKEWER')).toBe(false);
    });
  });
});
