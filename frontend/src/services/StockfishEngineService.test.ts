import { describe, expect, it } from 'vitest';
import {
  buildExplanation,
  normalizeFenKey,
  parseBestMove,
  parseInfo,
  scoreToLabel,
  uciToMove
} from './StockfishEngineService';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PROMOTION_FEN = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';

describe('Stockfish UCI protocol parsing', () => {
  describe('parseBestMove', () => {
    it('extracts a normal best move', () => {
      expect(parseBestMove('bestmove e2e4')).toBe('e2e4');
    });

    it('preserves the promotion suffix', () => {
      expect(parseBestMove('bestmove e7e8q')).toBe('e7e8q');
    });

    it('ignores "none" and non-bestmove lines', () => {
      expect(parseBestMove('bestmove (none)')).toBeNull();
      expect(parseBestMove('info depth 12 score cp 35')).toBeNull();
      expect(parseBestMove('info string bestmove e2e4')).toBeNull();
    });
  });

  describe('parseInfo', () => {
    it('parses depth, multipv, cp score and the principal variation', () => {
      const info = parseInfo('info depth 12 multipv 1 score cp 35 pv e2e4 e7e5 g1f3');
      expect(info).not.toBeNull();
      expect(info).toMatchObject({
        depth: 12,
        multiPV: 1,
        score: 0.35,
        isMate: false,
        pv: ['e2e4', 'e7e5', 'g1f3']
      });
      expect(info?.mateIn).toBeUndefined();
    });

    it('converts mate scores into a labelled mate distance', () => {
      expect(parseInfo('info depth 8 score mate 3 pv h1h8')).toMatchObject({
        score: 100,
        isMate: true,
        mateIn: 3
      });
      expect(parseInfo('info depth 8 score mate -2 pv e2e4')).toMatchObject({
        score: -100,
        isMate: true,
        mateIn: -2
      });
    });

    it('uses defaults for missing fields and rejects unrelated lines', () => {
      expect(parseInfo('info depth 5 score cp -120')).toMatchObject({
        depth: 5,
        multiPV: 1,
        score: -1.2,
        pv: []
      });
      expect(parseInfo('bestmove e2e4')).toBeNull();
      expect(parseInfo('info depth without score')).toBeNull();
    });
  });

  describe('uciToMove', () => {
    it('maps legal UCI moves to SAN using chess.js', () => {
      expect(uciToMove('e2e4', START_FEN)).toMatchObject({ san: 'e4', from: 'e2', to: 'e4' });
      expect(uciToMove('g1f3', START_FEN)).toMatchObject({ san: 'Nf3', from: 'g1', to: 'f3' });
    });

    it('maps promotion moves and keeps the promotion piece', () => {
      expect(uciToMove('e7e8q', PROMOTION_FEN)).toMatchObject({
        san: 'e8=Q+',
        from: 'e7',
        to: 'e8',
        promotion: 'q'
      });
    });

    it('rejects illegal or malformed moves', () => {
      expect(uciToMove('e2e5', START_FEN)).toBeNull();
      expect(uciToMove('nonsense', START_FEN)).toBeNull();
    });
  });

  describe('explanations and labels', () => {
    it('describes centre moves and promotions', () => {
      expect(buildExplanation('e2e4', START_FEN)).toContain('central square e4');
      expect(buildExplanation('e7e8q', PROMOTION_FEN)).toContain('Promotes to Q');
    });

    it('maps centipawn scores to evaluation labels', () => {
      expect(scoreToLabel(3.5)).toBe('Winning');
      expect(scoreToLabel(-3.5)).toBe('Losing');
      expect(scoreToLabel(0)).toBe('Equal');
    });
  });

  it('normalizes FEN cache keys by ignoring move counters', () => {
    const a = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const b = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 42 87';
    expect(normalizeFenKey(a)).toBe(normalizeFenKey(b));
    expect(normalizeFenKey(a)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  });
});
