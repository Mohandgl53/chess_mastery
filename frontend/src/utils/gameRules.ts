import type { Chess, Square } from 'chess.js';

/**
 * Format a chess clock as mm:ss. Returns null when the clock is not in use
 * (e.g. casual/unlimited time control).
 */
export function formatClockTime(seconds?: number): string | null {
  if (seconds === undefined) return null;
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Subtract one tick from a clock, clamped at zero. */
export function decrementClockSeconds(seconds: number): number {
  return Math.max(0, seconds - 1);
}

/**
 * True only when `from` → `to` is a legal pawn move that actually requires a
 * promotion choice. Used to avoid showing the promotion modal for ordinary
 * moves or illegal destinations.
 */
export function isLegalPawnPromotion(chess: Chess, from: Square, to: Square): boolean {
  const piece = chess.get(from);
  if (piece?.type !== 'p') return false;
  return chess.moves({ square: from, verbose: true }).some(
    (move) => move.to === to && move.promotion !== undefined
  );
}
