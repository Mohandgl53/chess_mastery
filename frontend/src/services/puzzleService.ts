import { Puzzle, PuzzleHint, PuzzleMove, PuzzleTheme } from '../types/puzzle';
import { MASTERCLASS_PUZZLES } from '../data/masterclassPuzzles';

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

/** A row from the backend's authoritative Puzzle table (`GET /api/puzzles/library`). */
interface LibraryPuzzleRow {
  id: string;
  title: string;
  theme: string;
  rating: number;
  difficulty: string;
  fen: string;
  playerColor: string;
  solutionMoves: unknown;
  hints: unknown;
  tacticalExplanation: string;
  coachInsight?: string | null;
}

const LIBRARY_THEME_MAP: Record<string, PuzzleTheme> = {
  FORK: 'Fork',
  PIN: 'Pin',
  SKEWER: 'Skewer',
  DISCOVERED_ATTACK: 'Discovered Attack',
  BACK_RANK: 'Back-Rank Mate',
  BACK_RANK_MATE: 'Back-Rank Mate',
  HANGING_PIECE: 'Hanging Piece',
  LATE_CASTLING: 'Late Castling',
  CENTER_CONTROL: 'Center Control',
  OPEN_FILE: 'Open File',
  DEFLECTION: 'Deflection',
  REMOVING_DEFENDER: 'Removing Defender',
  SMOTHERED_MATE: 'Smothered Mate',
  PAWN_ENDGAME: 'Pawn Endgame',
  GREEK_GIFT: 'Greek Gift',
  QUEEN_SACRIFICE: 'Queen Sacrifice'
};

function normalizeMoves(value: unknown): PuzzleMove[] {
  if (!Array.isArray(value)) return [];
  return value.filter((move): move is PuzzleMove => {
    if (!move || typeof move !== 'object') return false;
    const m = move as Partial<PuzzleMove>;
    return typeof m.from === 'string' && typeof m.to === 'string' && typeof m.san === 'string';
  }).map((m) => {
    const response = m.response;
    const validResponse = response &&
      typeof response.from === 'string' &&
      typeof response.to === 'string' &&
      typeof response.san === 'string'
      ? response
      : undefined;
    return { from: m.from, to: m.to, san: m.san, ...(validResponse ? { response: validResponse } : {}) };
  });
}

function normalizeHints(value: unknown, themeText: string): PuzzleHint[] {
  if (!Array.isArray(value)) return [];
  const hints = value.filter((hint): hint is PuzzleHint => {
    if (!hint || typeof hint !== 'object') return false;
    const h = hint as Partial<PuzzleHint>;
    return typeof h.title === 'string' && typeof h.description === 'string' &&
      [1, 2, 3].includes(Number(h.level));
  }).map((h) => ({
    level: Number(h.level) as 1 | 2 | 3,
    title: h.title,
    description: h.description,
    ...(Array.isArray(h.highlightSquares) ? { highlightSquares: h.highlightSquares } : {})
  }));
  if (hints.length > 0) return hints;
  return [
    { level: 1, title: 'Look at the position', description: `Identify the ${themeText.toLowerCase()} idea.` },
    { level: 2, title: 'Find the forcing move', description: 'Look for checks, captures and threats.' },
    { level: 3, title: 'Calculate the line', description: 'Verify each reply before committing.' }
  ];
}

function fromLibraryRow(row: LibraryPuzzleRow): Puzzle | null {
  if (!row || typeof row.id !== 'string' || typeof row.fen !== 'string' || !row.fen) return null;
  const solutionMoves = normalizeMoves(row.solutionMoves);
  if (solutionMoves.length === 0) return null;

  const theme = LIBRARY_THEME_MAP[row.theme] ?? 'Tactics';
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(row.difficulty)
    ? row.difficulty as Puzzle['difficulty']
    : 'Medium';

  return {
    // Namespaced to avoid collisions with the bundled masterclass catalog, whose
    // overlapping IDs sometimes contain different solutions.
    id: `lib-${row.id}`,
    title: row.title,
    rating: Number.isFinite(row.rating) ? row.rating : 1000,
    theme,
    themeDescription: `${theme} tactical pattern from the verified mastery library`,
    difficulty,
    fen: row.fen,
    playerColor: row.playerColor === 'b' ? 'b' : 'w',
    solutionMoves,
    hints: normalizeHints(row.hints, theme),
    tacticalExplanation: row.tacticalExplanation || 'A forcing tactic from the verified puzzle library.',
    coachInsight: row.coachInsight || row.tacticalExplanation || '',
    source: 'Mastery Library'
  };
}

export interface IPuzzleService {
  getPuzzles(): Promise<Puzzle[]>;
  getPuzzleById(id: string): Promise<Puzzle | undefined>;
  getPuzzlesByTheme(theme: PuzzleTheme | 'All'): Promise<Puzzle[]>;
  getPuzzlesForWeakness(weaknessTheme: string, playerRating?: number): Promise<Puzzle[]>;
  getNextPuzzle(currentId?: string): Promise<Puzzle>;
  fetchChessComDaily(): Promise<Puzzle | null>;
  fetchChessComRandom(): Promise<Puzzle | null>;
  fetchLichessDaily(): Promise<Puzzle | null>;
  getPuzzleRushQueue(count?: number): Promise<Puzzle[]>;
  getTacticalRating(): number;
  saveTacticalRating(rating: number): void;
  getPuzzleRushHighScore(): number;
  savePuzzleRushHighScore(score: number): void;
}

const TACTICAL_RATING_KEY = 'chess_mastery_tactical_rating';
const RUSH_HIGH_SCORE_KEY = 'chess_mastery_rush_high_score';

export class EnhancedPuzzleService implements IPuzzleService {
  private puzzles: Puzzle[];
  private libraryLoaded = false;
  private libraryPromise: Promise<void> | null = null;

  constructor() {
    this.puzzles = [...MASTERCLASS_PUZZLES];
  }

  async getPuzzles(): Promise<Puzzle[]> {
    if (this.libraryLoaded) return this.puzzles;

    // StrictMode mounts effects twice; share one in-flight request across callers.
    if (!this.libraryPromise) {
      this.libraryPromise = this.loadLibrary()
        .catch(() => {
          // Network/timeout/parse failures keep the bundled offline catalog usable.
        })
        .finally(() => {
          this.libraryPromise = null;
        });
    }
    await this.libraryPromise;

    return this.puzzles;
  }

  private async loadLibrary(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/puzzles/library`, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return;

    const payload = await response.json() as { success?: boolean; puzzles?: LibraryPuzzleRow[] };
    const rows = Array.isArray(payload.puzzles) ? payload.puzzles : [];
    const library = rows.map(fromLibraryRow).filter((p): p is Puzzle => p !== null);
    if (library.length === 0) return;

    const knownIds = new Set(this.puzzles.map((p) => p.id));
    this.puzzles = [
      ...MASTERCLASS_PUZZLES,
      ...library.filter((p) => !knownIds.has(p.id))
    ].sort((a, b) => a.rating - b.rating);
    this.libraryLoaded = true;
  }

  async getPuzzleById(id: string): Promise<Puzzle | undefined> {
    return this.puzzles.find(p => p.id === id);
  }

  async getPuzzlesByTheme(theme: PuzzleTheme | 'All'): Promise<Puzzle[]> {
    if (theme === 'All') return this.puzzles;
    return this.puzzles.filter(p => p.theme === theme);
  }

  async getPuzzlesForWeakness(weaknessTheme: string, playerRating = 1200): Promise<Puzzle[]> {
    const themeUpper = weaknessTheme.toUpperCase();
    const themeMap: Record<string, PuzzleTheme> = {
      FORK: 'Fork',
      PIN: 'Pin',
      SKEWER: 'Skewer',
      BACK_RANK: 'Back-Rank Mate',
      DISCOVERED_ATTACK: 'Discovered Attack',
      DOUBLE_ATTACK: 'Double Attack',
      DEFLECTION: 'Deflection',
      REMOVING_DEFENDER: 'Removing Defender',
      SMOTHERED_MATE: 'Smothered Mate',
      ENDGAME_TECHNIQUE: 'Pawn Endgame',
      HANGING_PIECE: 'Hanging Piece',
      LATE_CASTLING: 'Late Castling',
      CENTER_CONTROL: 'Center Control',
      OPEN_FILE: 'Open File',
      GREEK_GIFT: 'Greek Gift'
    };

    const targetTheme = themeMap[themeUpper];
    let candidates = targetTheme
      ? this.puzzles.filter(p => p.theme === targetTheme)
      : this.puzzles;

    if (candidates.length === 0) {
      candidates = this.puzzles;
    }

    return [...candidates].sort((a, b) => {
      const diffA = Math.abs(a.rating - playerRating);
      const diffB = Math.abs(b.rating - playerRating);
      return diffA - diffB;
    });
  }

  async getNextPuzzle(currentId?: string): Promise<Puzzle> {
    if (!currentId) return this.puzzles[0];
    const currentIndex = this.puzzles.findIndex(p => p.id === currentId);
    const nextIndex = (currentIndex + 1) % this.puzzles.length;
    return this.puzzles[nextIndex];
  }

  /**
   * Fetch today's official Daily Puzzle from Chess.com
   */
  async fetchChessComDaily(): Promise<Puzzle | null> {
    try {
      // First try backend proxy (which handles Chess.com User-Agent requirement)
      const res = await fetch(`${API_BASE}/puzzles/chesscom-daily`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.puzzle) {
          this.cacheOnlinePuzzle(json.puzzle);
          return json.puzzle as Puzzle;
        }
      }
    } catch {
      // Backend unavailable or network error
    }
    return null;
  }

  /**
   * Fetch a random tactical puzzle from Chess.com archive
   */
  async fetchChessComRandom(): Promise<Puzzle | null> {
    try {
      const res = await fetch(`${API_BASE}/puzzles/chesscom-random`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.puzzle) {
          this.cacheOnlinePuzzle(json.puzzle);
          return json.puzzle as Puzzle;
        }
      }
    } catch {
      // Backend unavailable
    }
    return null;
  }

  /**
   * Fetch a live daily puzzle from Lichess Open Database
   */
  async fetchLichessDaily(): Promise<Puzzle | null> {
    try {
      // First try backend proxy
      const res = await fetch(`${API_BASE}/puzzles/lichess-daily`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.puzzle) {
          this.cacheOnlinePuzzle(json.puzzle);
          return json.puzzle as Puzzle;
        }
      }
    } catch {
      // Direct CORS fallback to Lichess API
      try {
        const directRes = await fetch('https://lichess.org/api/puzzle/daily');
        if (directRes.ok) {
          const data = await directRes.json();
          // Minimal fallback parser if direct
          const p = data.puzzle;
          if (p && p.fen) {
            const fallback: Puzzle = {
              id: `lichess-${p.id}`,
              title: `Lichess Daily Tactic #${p.id}`,
              theme: 'Tactics',
              themeDescription: 'From Lichess open database of 4M+ games.',
              difficulty: p.rating < 1200 ? 'Easy' : p.rating < 1800 ? 'Medium' : 'Hard',
              rating: p.rating || 1500,
              fen: p.fen,
              playerColor: p.fen.split(' ')[1] === 'w' ? 'w' : 'b',
              solutionMoves: [],
              hints: [
                { level: 1, title: 'Notice alignments', description: 'Look for forcing checks and captures.' }
              ],
              tacticalExplanation: 'Direct tactical calculation.',
              coachInsight: 'Real game tactics require finding the critical forcing move.',
              source: 'Lichess'
            };
            this.cacheOnlinePuzzle(fallback);
            return fallback;
          }
        }
      } catch {
        // Fallback failed
      }
    }
    return null;
  }

  private cacheOnlinePuzzle(puzzle: Puzzle) {
    if (!this.puzzles.some(p => p.id === puzzle.id)) {
      this.puzzles.unshift(puzzle);
    }
  }

  /**
   * Generate an ascending queue of puzzles for Puzzle Rush
   */
  async getPuzzleRushQueue(count = 25): Promise<Puzzle[]> {
    // Sort puzzles by rating ascending (easy to hard)
    const sorted = [...this.puzzles].sort((a, b) => a.rating - b.rating);
    return sorted.slice(0, count);
  }

  getTacticalRating(): number {
    try {
      const stored = localStorage.getItem(TACTICAL_RATING_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {
      // ignore
    }
    return 1200;
  }

  saveTacticalRating(rating: number): void {
    try {
      localStorage.setItem(TACTICAL_RATING_KEY, rating.toString());
    } catch {
      // ignore
    }
  }

  getPuzzleRushHighScore(): number {
    try {
      const stored = localStorage.getItem(RUSH_HIGH_SCORE_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  savePuzzleRushHighScore(score: number): void {
    try {
      const current = this.getPuzzleRushHighScore();
      if (score > current) {
        localStorage.setItem(RUSH_HIGH_SCORE_KEY, score.toString());
      }
    } catch {
      // ignore
    }
  }
}

export const puzzleService = new EnhancedPuzzleService();
