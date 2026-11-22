import { describe, expect, it } from 'vitest';
import {
  EVAL_DELTA_THRESHOLDS_CP,
  classifyEvalDeltaCp,
  formatEvalDeltaPawns,
  pawnsToCp
} from './moveClassification';

describe('move classification unit consistency', () => {
  it('converts pawn scores to centipawns', () => {
    expect(pawnsToCp(1.25)).toBe(125);
    expect(pawnsToCp(-0.35)).toBe(-35);
  });

  it('classifies with one shared centipawn threshold table', () => {
    expect(classifyEvalDeltaCp(EVAL_DELTA_THRESHOLDS_CP.EXCELLENT - 1)).toBe('EXCELLENT');
    expect(classifyEvalDeltaCp(EVAL_DELTA_THRESHOLDS_CP.EXCELLENT)).toBe('GOOD');
    expect(classifyEvalDeltaCp(EVAL_DELTA_THRESHOLDS_CP.GOOD)).toBe('INACCURACY');
    expect(classifyEvalDeltaCp(EVAL_DELTA_THRESHOLDS_CP.INACCURACY)).toBe('MISTAKE');
    expect(classifyEvalDeltaCp(EVAL_DELTA_THRESHOLDS_CP.MISTAKE)).toBe('BLUNDER');
  });

  it('formats centipawn loss for display in pawns', () => {
    expect(formatEvalDeltaPawns(50)).toBe('0.5');
    expect(formatEvalDeltaPawns(400)).toBe('4.0');
  });
});
