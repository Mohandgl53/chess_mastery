/**
 * Supported Chess Practice Themes
 *
 * These themes correspond to the seeded puzzle database and the backend's
 * chess-theme-detector authoritative detection. Keep in sync with:
 * - prisma/seed-puzzles.ts PUZZLES array themes
 * - src/utils/chess-theme-detector.ts detected themes
 * - src/services/adaptive-planner.service.ts formatThemeTitle map
 */

export const PRACTICE_THEMES = [
  // Tactical Combinations
  'FORK',
  'PIN',
  'SKEWER',
  'HANGING_PIECE',
  'BACK_RANK',
  'LATE_CASTLING',
  'CENTER_CONTROL',
  'OPEN_FILE',
  // Opening Systems & Repertoire
  'SICILIAN_DEFENSE',
  'FRENCH_DEFENSE',
  'ITALIAN_GAME',
  'RUY_LOPEZ',
  'QUEENS_GAMBIT',
  'CARO_KANN',
  'KINGS_INDIAN',
  'ENGLISH_OPENING',
  // Middlegame Strategy
  'KNIGHT_OUTPOST',
  'GREEK_GIFT',
  'PAWN_STRUCTURE',
  'PROPHYLAXIS',
  'PIECE_COORDINATION',
  'KING_HUNT',
  // Endgame Technique
  'KING_AND_PAWN',
  'LUCENA_POSITION',
  'PHILIDOR_DEFENSE',
  'OPPOSITE_BISHOPS',
  'QUEEN_VS_PAWN',
  'ROOK_ACTIVITY'
] as const;

export type PracticeTheme = (typeof PRACTICE_THEMES)[number];

export const PRACTICE_THEME_SET = new Set(PRACTICE_THEMES);

export function isValidPracticeTheme(value: unknown): value is PracticeTheme {
  return typeof value === 'string' && PRACTICE_THEME_SET.has(value as PracticeTheme);
}

export function normalizePracticeTheme(value: unknown): PracticeTheme | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toUpperCase().trim();
  return isValidPracticeTheme(normalized) ? normalized : undefined;
}