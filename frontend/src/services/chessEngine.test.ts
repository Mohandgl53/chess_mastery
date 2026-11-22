import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./StockfishEngineService', () => ({
  StockfishEngineService: class {
    async waitForReady() {
      throw new Error('Stockfish disabled in unit tests');
    }
  }
}));

import { MockChessEngine } from './chessEngine';

const FEN_WHITE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_BLACK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';

describe('MockChessEngine.classifyMove — centipawn evalDelta', () => {
  let engine: MockChessEngine;

  beforeEach(() => {
    engine = new MockChessEngine();
    vi.spyOn(engine, 'getCandidateMoves').mockResolvedValue([
      { san: 'e4', from: 'e2', to: 'e4', score: 1, explanation: 'best' }
    ]);
  });

  it('keeps evalBefore/evalAfter/evalDelta in the same centipawn unit', async () => {
    vi.spyOn(engine, 'evaluatePosition')
      .mockResolvedValueOnce({ score: 1, isMate: false, label: 'Better' })
      .mockResolvedValueOnce({ score: 0.5, isMate: false, label: 'Slightly Better' });

    const result = await engine.classifyMove(FEN_WHITE, FEN_WHITE, 'Nf3');

    expect(result.evalBefore).toBe(100);
    expect(result.evalAfter).toBe(50);
    expect(result.evalDelta).toBe(50);
    expect(result.classification).toBe('GOOD');
    expect(result.bestMove).toBe('e4');
  });

  it('normalizes the moving side for Black', async () => {
    vi.spyOn(engine, 'evaluatePosition')
      .mockResolvedValueOnce({ score: 1, isMate: false, label: 'Better' })
      .mockResolvedValueOnce({ score: 2, isMate: false, label: 'Better' });

    const result = await engine.classifyMove(FEN_BLACK, FEN_BLACK, 'a6');

    expect(result.evalDelta).toBe(100);
    expect(result.classification).toBe('INACCURACY');
  });

  it('uses shared centipawn thresholds for blunders', async () => {
    vi.spyOn(engine, 'evaluatePosition')
      .mockResolvedValueOnce({ score: 1, isMate: false, label: 'Better' })
      .mockResolvedValueOnce({ score: -3, isMate: false, label: 'Losing' });

    const result = await engine.classifyMove(FEN_WHITE, FEN_WHITE, 'Nf3');

    expect(result.evalDelta).toBe(400);
    expect(result.classification).toBe('BLUNDER');
  });
});
