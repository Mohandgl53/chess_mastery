import { MoveClassification } from '../types/chess';

/**
 * Canonical evaluation units for the frontend/backend API boundary.
 *
 * `evalBefore`/`evalAfter`/`evalDelta` are all centipawns (100 cp = 1 pawn).
 * A positive `evalDelta` means the side that moved gave away advantage.
 */
export const EVAL_DELTA_THRESHOLDS_CP = {
  EXCELLENT: 30,
  GOOD: 80,
  INACCURACY: 180,
  MISTAKE: 320
} as const;

export function pawnsToCp(scorePawns: number): number {
  return Math.round(scorePawns * 100);
}

export function classifyEvalDeltaCp(evalDeltaCp: number): Exclude<MoveClassification, 'BEST' | 'BOOK' | 'MISSED_WIN'> {
  if (evalDeltaCp < EVAL_DELTA_THRESHOLDS_CP.EXCELLENT) return 'EXCELLENT';
  if (evalDeltaCp < EVAL_DELTA_THRESHOLDS_CP.GOOD) return 'GOOD';
  if (evalDeltaCp < EVAL_DELTA_THRESHOLDS_CP.INACCURACY) return 'INACCURACY';
  if (evalDeltaCp < EVAL_DELTA_THRESHOLDS_CP.MISTAKE) return 'MISTAKE';
  return 'BLUNDER';
}

export function formatEvalDeltaPawns(evalDeltaCp: number): string {
  return (evalDeltaCp / 100).toFixed(1);
}
