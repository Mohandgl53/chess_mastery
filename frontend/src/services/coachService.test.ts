import { describe, it, expect } from 'vitest';
import { MockCoachService } from '../services/coachService';
import { LLMCoachService } from '../services/LLMCoachService';

describe('Coach Services: getPracticeTheme mapping to 8 backend puzzle themes', () => {
  const mockService = new MockCoachService();
  const llmService = new LLMCoachService();

  const allThemes = [
    'FORK',
    'PIN',
    'SKEWER',
    'HANGING_PIECE',
    'BACK_RANK',
    'LATE_CASTLING',
    'CENTER_CONTROL',
    'OPEN_FILE'
  ];

  describe('Theme: FORK', () => {
    it('Knight capture/check maps to FORK', () => {
      const result = mockService.getPracticeTheme('BEST', 15, 'Nxc7+');
      expect(result?.theme).toBe('FORK');
      expect(result?.title).toBe('Knight & Pawn Forks');
    });

    it('Knight non-capture check maps to FORK', () => {
      const result = mockService.getPracticeTheme('BEST', 15, 'Ne7+');
      expect(result?.theme).toBe('FORK');
    });

    it('Pawn capture maps to FORK (pawn fork)', () => {
      const result = mockService.getPracticeTheme('BEST', 12, 'exd5');
      expect(result?.theme).toBe('FORK');
    });

    it('Pawn check maps to FORK (pawn fork)', () => {
      const result = mockService.getPracticeTheme('BEST', 12, 'e4+');
      expect(result?.theme).toBe('FORK');
    });

    it('Both services return identical FORK mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 15, 'Nxc7+');
      const llmResult = llmService.getPracticeTheme('BEST', 15, 'Nxc7+');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: PIN', () => {
    it('Bishop capture maps to PIN', () => {
      const result = mockService.getPracticeTheme('BEST', 15, 'Bxc6');
      expect(result?.theme).toBe('PIN');
      expect(result?.title).toBe('Pins & Paralyzed Pieces');
    });

    it('Bishop check maps to PIN', () => {
      const result = mockService.getPracticeTheme('BEST', 15, 'Bg5+');
      expect(result?.theme).toBe('PIN');
    });

    it('MISTAKE classification maps to PIN', () => {
      const result = mockService.getPracticeTheme('MISTAKE', 15, 'Be3');
      expect(result?.theme).toBe('PIN');
    });

    it('Both services return identical PIN mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 15, 'Bxc6');
      const llmResult = llmService.getPracticeTheme('BEST', 15, 'Bxc6');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: SKEWER', () => {
    it('Rook non-capture non-check on back rank maps to SKEWER', () => {
      const result = mockService.getPracticeTheme('BEST', 20, 'Re1');
      expect(result?.theme).toBe('SKEWER');
      expect(result?.title).toBe('Linear Skewers');
    });

    it('Rook non-capture non-check not on back rank maps to SKEWER', () => {
      const result = mockService.getPracticeTheme('BEST', 20, 'Re5');
      expect(result?.theme).toBe('SKEWER');
    });

    it('Queen non-capture non-check maps to SKEWER', () => {
      const result = mockService.getPracticeTheme('BEST', 20, 'Qe2');
      expect(result?.theme).toBe('SKEWER');
    });

    it('Both services return identical SKEWER mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 20, 'Re1');
      const llmResult = llmService.getPracticeTheme('BEST', 20, 'Re1');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: HANGING_PIECE', () => {
    it('BLUNDER classification maps to HANGING_PIECE', () => {
      const result = mockService.getPracticeTheme('BLUNDER', 15, 'Nf3');
      expect(result?.theme).toBe('HANGING_PIECE');
      expect(result?.title).toBe('Hanging & Undefended Pieces');
    });

    it('BLUNDER overrides piece type (even for Knight)', () => {
      const result = mockService.getPracticeTheme('BLUNDER', 15, 'Nxd5');
      expect(result?.theme).toBe('HANGING_PIECE');
    });

    it('Both services return identical HANGING_PIECE mapping', () => {
      const mockResult = mockService.getPracticeTheme('BLUNDER', 15, 'Nf3');
      const llmResult = llmService.getPracticeTheme('BLUNDER', 15, 'Nf3');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: BACK_RANK', () => {
    it('Rook check on rank 1 or 8 maps to BACK_RANK', () => {
      const result = mockService.getPracticeTheme('BEST', 25, 'Rd8+');
      expect(result?.theme).toBe('BACK_RANK');
      expect(result?.title).toBe('Back-Rank Defense & Mate');
    });

    it('Rook check on rank 1 maps to BACK_RANK', () => {
      const result = mockService.getPracticeTheme('BEST', 25, 'Rd1+');
      expect(result?.theme).toBe('BACK_RANK');
    });

    it('Queen check on rank 1 or 8 maps to BACK_RANK', () => {
      const result = mockService.getPracticeTheme('BEST', 25, 'Qd8+');
      expect(result?.theme).toBe('BACK_RANK');
    });

    it('Endgame (move > 30) defaults to BACK_RANK', () => {
      const result = mockService.getPracticeTheme('GOOD', 35, 'Re1');
      expect(result?.theme).toBe('BACK_RANK');
    });

    it('Both services return identical BACK_RANK mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 25, 'Rd8+');
      const llmResult = llmService.getPracticeTheme('BEST', 25, 'Rd8+');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: LATE_CASTLING', () => {
    it('Kingside castling (O-O) maps to LATE_CASTLING', () => {
      const result = mockService.getPracticeTheme('BEST', 12, 'O-O');
      expect(result?.theme).toBe('LATE_CASTLING');
      expect(result?.title).toBe('King Safety & Proactive Castling');
    });

    it('Queenside castling (O-O-O) maps to LATE_CASTLING', () => {
      const result = mockService.getPracticeTheme('BEST', 12, 'O-O-O');
      expect(result?.theme).toBe('LATE_CASTLING');
    });

    it('Castling overrides classification', () => {
      const result = mockService.getPracticeTheme('BLUNDER', 12, 'O-O');
      expect(result?.theme).toBe('LATE_CASTLING');
    });

    it('Both services return identical LATE_CASTLING mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 12, 'O-O');
      const llmResult = llmService.getPracticeTheme('BEST', 12, 'O-O');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: CENTER_CONTROL', () => {
    it('Opening phase (move <= 10) maps to CENTER_CONTROL', () => {
      const result = mockService.getPracticeTheme('BEST', 5, 'e4');
      expect(result?.theme).toBe('CENTER_CONTROL');
      expect(result?.title).toBe('Center Occupation & Space');
    });

    it('Opening phase with INACCURACY maps to CENTER_CONTROL', () => {
      const result = mockService.getPracticeTheme('INACCURACY', 8, 'h4');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('Opening phase with MISTAKE maps to CENTER_CONTROL', () => {
      const result = mockService.getPracticeTheme('MISTAKE', 8, 'h4');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('Opening phase with BLUNDER maps to CENTER_CONTROL (overrides BLUNDER)', () => {
      const result = mockService.getPracticeTheme('BLUNDER', 8, 'h4');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('INACCURACY classification maps to CENTER_CONTROL', () => {
      const result = mockService.getPracticeTheme('INACCURACY', 15, 'h4');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('Good move in middlegame defaults to CENTER_CONTROL', () => {
      const result = mockService.getPracticeTheme('GOOD', 15, 'Nf3');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('Both services return identical CENTER_CONTROL mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 5, 'e4');
      const llmResult = llmService.getPracticeTheme('BEST', 5, 'e4');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Theme: OPEN_FILE', () => {
    it('Rook capture maps to OPEN_FILE', () => {
      const result = mockService.getPracticeTheme('BEST', 16, 'Rxd1');
      expect(result?.theme).toBe('OPEN_FILE');
      expect(result?.title).toBe('Rook Infiltration on Open Files');
    });

    it('Rook capture on non-back-rank maps to OPEN_FILE', () => {
      const result = mockService.getPracticeTheme('BEST', 16, 'Rxd5');
      expect(result?.theme).toBe('OPEN_FILE');
    });

    it('Both services return identical OPEN_FILE mapping', () => {
      const mockResult = mockService.getPracticeTheme('BEST', 16, 'Rxd1');
      const llmResult = llmService.getPracticeTheme('BEST', 16, 'Rxd1');
      expect(mockResult).toEqual(llmResult);
    });
  });

  describe('Service consistency: All 8 themes covered', () => {
    it('MockCoachService covers all 8 backend themes', () => {
      const themesCovered = new Set<string>();
      
      // FORK
      themesCovered.add(mockService.getPracticeTheme('BEST', 15, 'Nxc7+')?.theme || '');
      // PIN
      themesCovered.add(mockService.getPracticeTheme('BEST', 15, 'Bxc6')?.theme || '');
      // SKEWER
      themesCovered.add(mockService.getPracticeTheme('BEST', 20, 'Re1')?.theme || '');
      // HANGING_PIECE
      themesCovered.add(mockService.getPracticeTheme('BLUNDER', 15, 'Nf3')?.theme || '');
      // BACK_RANK
      themesCovered.add(mockService.getPracticeTheme('BEST', 25, 'Rd8+')?.theme || '');
      // LATE_CASTLING
      themesCovered.add(mockService.getPracticeTheme('BEST', 12, 'O-O')?.theme || '');
      // CENTER_CONTROL
      themesCovered.add(mockService.getPracticeTheme('BEST', 5, 'e4')?.theme || '');
      // OPEN_FILE
      themesCovered.add(mockService.getPracticeTheme('BEST', 16, 'Rxd1')?.theme || '');

      expect(themesCovered).toEqual(new Set(allThemes));
    });

    it('LLMCoachService covers all 8 backend themes', () => {
      const themesCovered = new Set<string>();
      
      // FORK
      themesCovered.add(llmService.getPracticeTheme('BEST', 15, 'Nxc7+')?.theme || '');
      // PIN
      themesCovered.add(llmService.getPracticeTheme('BEST', 15, 'Bxc6')?.theme || '');
      // SKEWER
      themesCovered.add(llmService.getPracticeTheme('BEST', 20, 'Re1')?.theme || '');
      // HANGING_PIECE
      themesCovered.add(llmService.getPracticeTheme('BLUNDER', 15, 'Nf3')?.theme || '');
      // BACK_RANK
      themesCovered.add(llmService.getPracticeTheme('BEST', 25, 'Rd8+')?.theme || '');
      // LATE_CASTLING
      themesCovered.add(llmService.getPracticeTheme('BEST', 12, 'O-O')?.theme || '');
      // CENTER_CONTROL
      themesCovered.add(llmService.getPracticeTheme('BEST', 5, 'e4')?.theme || '');
      // OPEN_FILE
      themesCovered.add(llmService.getPracticeTheme('BEST', 16, 'Rxd1')?.theme || '');

      expect(themesCovered).toEqual(new Set(allThemes));
    });
  });

  describe('Edge cases and malformed inputs', () => {
    it('Empty moveSan returns undefined', () => {
      const result = mockService.getPracticeTheme('BEST', 15, '');
      expect(result).toBeUndefined();
    });

    it('Invalid classification defaults to CENTER_CONTROL in middlegame', () => {
      const result = mockService.getPracticeTheme('INVALID_CLASSIFICATION', 15, 'Nf3');
      expect(result?.theme).toBe('CENTER_CONTROL');
    });

    it('Move number boundary: move 10 is opening, move 11 is middlegame', () => {
      const openingResult = mockService.getPracticeTheme('BEST', 10, 'e4');
      const middlegameResult = mockService.getPracticeTheme('BEST', 11, 'e4');
      expect(openingResult?.theme).toBe('CENTER_CONTROL');
      expect(middlegameResult?.theme).toBe('CENTER_CONTROL'); // Good move in middlegame
    });

    it('Move number boundary: move 30 is middlegame, move 31 is endgame', () => {
      const middlegameResult = mockService.getPracticeTheme('GOOD', 30, 'Nf3');
      const endgameResult = mockService.getPracticeTheme('GOOD', 31, 'Nf3');
      expect(middlegameResult?.theme).toBe('CENTER_CONTROL');
      expect(endgameResult?.theme).toBe('BACK_RANK');
    });

    it('Case sensitivity: classification is case-sensitive', () => {
      const result = mockService.getPracticeTheme('blunder', 15, 'Nf3');
      // Lowercase 'blunder' should not match 'BLUNDER'
      expect(result?.theme).toBe('CENTER_CONTROL');
    });
  });

  describe('SAN-based heuristic limitations', () => {
    it('Knight move does NOT prove fork exists (heuristic limitation)', () => {
      // A knight move like Nf3 is mapped to FORK based solely on piece type
      // This is a known heuristic limitation - the move itself doesn't prove a fork
      const result = mockService.getPracticeTheme('BEST', 15, 'Nf3');
      expect(result?.theme).toBe('FORK');
      // This test documents the current heuristic behavior
    });

    it('Bishop move does NOT prove pin exists (heuristic limitation)', () => {
      const result = mockService.getPracticeTheme('BEST', 15, 'Bc4');
      expect(result?.theme).toBe('PIN');
      // This test documents the current heuristic behavior
    });

    it('Rook capture does NOT prove open file exists (heuristic limitation)', () => {
      const result = mockService.getPracticeTheme('BEST', 16, 'Rxd5');
      expect(result?.theme).toBe('OPEN_FILE');
      // This test documents the current heuristic behavior - capture alone doesn't prove open file
    });

    it('Rook check on back rank does NOT prove back-rank mate (heuristic limitation)', () => {
      const result = mockService.getPracticeTheme('BEST', 25, 'Rd8+');
      expect(result?.theme).toBe('BACK_RANK');
      // This test documents the current heuristic behavior
    });
  });
});

describe('Coach Services: Service Interface Compliance', () => {
  it('MockCoachService implements ICoachService', () => {
    const service = new MockCoachService();
    expect(typeof service.analyzeMove).toBe('function');
    expect(typeof service.getHint).toBe('function');
    expect(typeof service.answerQuestion).toBe('function');
    expect(typeof service.generatePostGameAnalysis).toBe('function');
    expect(typeof service.getPresetPrompts).toBe('function');
    expect(typeof service.getPracticeTheme).toBe('function');
  });

  it('LLMCoachService implements ICoachService', () => {
    const service = new LLMCoachService();
    expect(typeof service.analyzeMove).toBe('function');
    expect(typeof service.getHint).toBe('function');
    expect(typeof service.answerQuestion).toBe('function');
    expect(typeof service.generatePostGameAnalysis).toBe('function');
    expect(typeof service.getPresetPrompts).toBe('function');
    expect(typeof service.getPracticeTheme).toBe('function');
  });
});