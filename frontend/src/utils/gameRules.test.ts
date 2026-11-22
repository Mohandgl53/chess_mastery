import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { decrementClockSeconds, formatClockTime, isLegalPawnPromotion } from './gameRules';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PROMOTION_FEN = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';
const BLOCKED_PROMOTION_FEN = '4k3/3PP3/8/8/8/8/8/4K3 w - - 0 1';

describe('clock helpers', () => {
  it('formats seconds as mm:ss with zero padding', () => {
    expect(formatClockTime(9 * 60 + 27)).toBe('9:27');
    expect(formatClockTime(65)).toBe('1:05');
    expect(formatClockTime(0)).toBe('0:00');
  });

  it('returns null when no clock is configured', () => {
    expect(formatClockTime(undefined)).toBeNull();
  });

  it('clamps negative or fractional values safely', () => {
    expect(formatClockTime(-5)).toBe('0:00');
    expect(formatClockTime(59.9)).toBe('0:59');
  });

  it('decrements by exactly one second and never below zero', () => {
    expect(decrementClockSeconds(567)).toBe(566);
    expect(decrementClockSeconds(1)).toBe(0);
    expect(decrementClockSeconds(0)).toBe(0);
  });
});

describe('promotion legality', () => {
  it('detects a legal pawn promotion from the seventh rank', () => {
    const chess = new Chess(PROMOTION_FEN);
    expect(isLegalPawnPromotion(chess, 'e7', 'e8')).toBe(true);
  });

  it('does not trigger for ordinary pawn moves', () => {
    const chess = new Chess(START_FEN);
    expect(isLegalPawnPromotion(chess, 'e2', 'e4')).toBe(false);
  });

  it('does not trigger for non-pawn pieces', () => {
    const chess = new Chess(START_FEN);
    expect(isLegalPawnPromotion(chess, 'g1', 'f3')).toBe(false);
  });

  it('does not trigger when the promotion square is occupied by own piece', () => {
    const chess = new Chess(BLOCKED_PROMOTION_FEN);
    expect(isLegalPawnPromotion(chess, 'e7', 'e8')).toBe(false);
  });
});
