import { Puzzle, PuzzleTheme } from '../types/puzzle';
import { MOCK_PUZZLES } from '../mock/mockPuzzles';
import { MASTERCLASS_PUZZLES } from '../mock/masterclassPuzzles';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  constructor() {
    // Combine masterclass puzzles and mock puzzles, deduping by id
    const map = new Map<string, Puzzle>();
    MASTERCLASS_PUZZLES.forEach(p => map.set(p.id, p));
    MOCK_PUZZLES.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    this.puzzles = Array.from(map.values());
  }

  async getPuzzles(): Promise<Puzzle[]> {
    return this.puzzles;
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
