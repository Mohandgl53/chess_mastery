/**
 * Phase 7: Deterministic Adaptive Training Planner
 *
 * Responsibilities:
 * 1. Spaced Repetition Scheduling
 * 2. Theme Priority Calculation (Weaknesses, Strengths, Recommendations, Review deadlines)
 * 3. Difficulty Adaptation (Performance-based progression/regression)
 * 4. Puzzle Selection (Deterministic, legality-checked, duplicate-suppressed)
 */

import { Chess } from 'chess.js';
import { prisma } from '../config/database.js';
import { practiceRepository } from '../repositories/practice.repository.js';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { Puzzle, PracticeSession, ThemeMastery } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { PRACTICE_THEMES, PracticeTheme, normalizePracticeTheme } from '../constants/practice-themes.js';

export interface AdaptivePlan {
  targetTheme: string;
  themeTitle: string;
  reason: string;
  sessionType: 'ADAPTIVE' | 'THEME_DRILL' | 'WEAKNESS_REVIEW' | 'DAILY_TRAINING';
  plannedItemCount: number;
  initialDifficulty: number;
  isSpacedReview: boolean;
  priorityScore: number;
}

export class AdaptivePlannerService {
  /**
   * Determine the most relevant training plan for a player.
   * Consumes verified weaknesses, theme masteries, spaced repetition deadlines,
   * active recommendations, and recent session history.
   */
  async generateAdaptivePlan(userId: string, requestedTheme?: string): Promise<AdaptivePlan> {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);
    const playerId = profile.id;

    // If a specific theme was explicitly requested by user (e.g. from recommendation click or URL)
    if (requestedTheme) {
      const cleanTheme = this.validateTheme(requestedTheme);
      const mastery = await practiceRepository.getThemeMastery(playerId, cleanTheme);
      const initialDifficulty = mastery?.currentDifficulty ?? profile.rating ?? 1000;

      return {
        targetTheme: cleanTheme,
        themeTitle: this.formatThemeTitle(cleanTheme),
        reason: `Targeted practice for ${this.formatThemeTitle(cleanTheme)} based on your personal training focus.`,
        sessionType: 'THEME_DRILL',
        plannedItemCount: 5,
        initialDifficulty,
        isSpacedReview: false,
        priorityScore: 10.0
      };
    }

    // 1. Check for Themes Due for Spaced Repetition Review
    const masteries = await practiceRepository.getAllThemeMasteries(playerId);
    const now = new Date();
    const dueReviews = masteries.filter((m) => m.nextReviewAt && m.nextReviewAt <= now);

    if (dueReviews.length > 0) {
      // Pick the review theme with lowest accuracy or longest overdue
      const topDue = dueReviews.sort((a, b) => (a.recentAccuracy - b.recentAccuracy))[0];
      return {
        targetTheme: topDue.theme,
        themeTitle: this.formatThemeTitle(topDue.theme),
        reason: `Scheduled Spaced Repetition Review: Strengthen retention for ${this.formatThemeTitle(topDue.theme)}.`,
        sessionType: 'WEAKNESS_REVIEW',
        plannedItemCount: 5,
        initialDifficulty: topDue.currentDifficulty,
        isSpacedReview: true,
        priorityScore: 9.5
      };
    }

    // 2. Evaluate Active Weaknesses from Player Memory
    const weaknesses = await prisma.weakness.findMany({
      where: { playerId, status: 'ACTIVE' },
      orderBy: { confidence: 'desc' }
    });

    // 3. Evaluate Recent Completed Sessions (to avoid tunnel-vision drilling same theme repeatedly)
    const recentCompletedSessions = await prisma.practiceSession.findMany({
      where: { playerId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 2
    });
    const lastCompletedTheme = recentCompletedSessions[0]?.targetTheme;

    // Calculate Need Scores for Active Weaknesses
    const scoredThemes: Array<{ theme: string; score: number; reason: string }> = [];

    for (const w of weaknesses) {
      const mastery = masteries.find((m) => m.theme === w.theme);
      const masteryVal = mastery?.masteryScore ?? 50.0;
      const recentAcc = mastery?.recentAccuracy ?? 0.5;

      // Base formula:
      // need = 0.40 * confidence + 0.35 * (1 - mastery/100) + 0.15 * occurrenceWeight + 0.10 * (1 - recentAcc)
      const confScore = w.confidence;
      const masteryScore = (100 - masteryVal) / 100;
      const occScore = Math.min(w.occurrenceCount / 5, 1.0);
      const failureBonus = 1.0 - recentAcc;

      let totalNeed = (confScore * 0.4) + (masteryScore * 0.35) + (occScore * 0.15) + (failureBonus * 0.1);

      // Variety Guard: slight discount if practiced in immediate previous session and alternative exists
      if (lastCompletedTheme === w.theme && weaknesses.length > 1) {
        totalNeed *= 0.65;
      }

      scoredThemes.push({
        theme: w.theme,
        score: totalNeed,
        reason: `Addressing verified ${this.formatThemeTitle(w.theme)} weakness (${(w.confidence * 100).toFixed(0)}% confidence across ${w.occurrenceCount} games).`
      });
    }

    // If active weaknesses exist, select highest scored
    if (scoredThemes.length > 0) {
      scoredThemes.sort((a, b) => b.score - a.score);
      const chosen = scoredThemes[0];
      const mastery = masteries.find((m) => m.theme === chosen.theme);
      const initialDifficulty = mastery?.currentDifficulty ?? profile.rating ?? 1000;

      return {
        targetTheme: chosen.theme,
        themeTitle: this.formatThemeTitle(chosen.theme),
        reason: chosen.reason,
        sessionType: 'ADAPTIVE',
        plannedItemCount: 5,
        initialDifficulty,
        isSpacedReview: false,
        priorityScore: chosen.score
      };
    }

    // 4. Fallback when player has no active weaknesses: Foundational Tactics / Strength Retention
    const fallbackThemes = ['FORK', 'PIN', 'SKEWER', 'BACK_RANK', 'CENTER_CONTROL'];
    const chosenFallback = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
    const fallbackMastery = masteries.find((m) => m.theme === chosenFallback);

    return {
      targetTheme: chosenFallback,
      themeTitle: this.formatThemeTitle(chosenFallback),
      reason: `Foundational Tactical Maintenance: Practicing core pattern recognition in ${this.formatThemeTitle(chosenFallback)}.`,
      sessionType: 'DAILY_TRAINING',
      plannedItemCount: 5,
      initialDifficulty: fallbackMastery?.currentDifficulty ?? profile.rating ?? 1000,
      isSpacedReview: false,
      priorityScore: 5.0
    };
  }

  /**
   * Select the next puzzle in a session adaptively based on the session's performance so far.
   */
  async selectNextPuzzle(session: PracticeSession): Promise<Puzzle> {
    const attempts = await prisma.practiceAttempt.findMany({
      where: { sessionId: session.id },
      orderBy: { attemptedAt: 'asc' }
    });

    const attemptedPuzzleIds = attempts.map((a) => a.puzzleId);

    // Dynamic difficulty calculation based on recent attempts in this session
    let targetDifficulty = session.averageDifficulty;

    if (attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt.result === 'CORRECT') {
        // Clean solve without hints -> increase challenge
        if (!lastAttempt.usedHint) {
          targetDifficulty = Math.min(2200, targetDifficulty + 50);
        } else {
          targetDifficulty = Math.min(2200, targetDifficulty + 15);
        }
      } else if (lastAttempt.result === 'INCORRECT') {
        // Struggled -> reduce difficulty for reinforcement
        targetDifficulty = Math.max(700, targetDifficulty - 50);
      }
    }

    // Search for candidates matching theme and rating range +/- 150
    const candidates = await practiceRepository.findCandidatePuzzles({
      theme: session.targetTheme,
      minRating: targetDifficulty - 150,
      maxRating: targetDifficulty + 150,
      excludePuzzleIds: attemptedPuzzleIds
    });

    if (candidates.length === 0) {
      throw new NotFoundError(`No available puzzles found for theme ${session.targetTheme}`);
    }

    // Pick candidate closest to target difficulty
    candidates.sort((a, b) => Math.abs(a.rating - targetDifficulty) - Math.abs(b.rating - targetDifficulty));
    const selected = candidates[0];

    // Authoritative check with chess.js before dispatch
    const chess = new Chess(selected.fen);
    if (!chess.isGameOver() && chess.turn() !== selected.playerColor) {
      throw new BadRequestError(`Invalid puzzle state for ${selected.id}: turn mismatch`);
    }

    return selected;
  }

  /**
   * Calculate next spaced repetition review date based on accuracy and streak.
   * Deterministic Leitner interval schedule.
   */
  calculateNextReviewDate(accuracy: number, streak: number): Date {
    const now = new Date();

    if (accuracy >= 0.8) {
      // Mastered session: increase interval exponentially by streak
      let days = 1;
      if (streak === 1) days = 1;
      else if (streak === 2) days = 3;
      else if (streak === 3) days = 7;
      else if (streak === 4) days = 14;
      else days = 30;

      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (accuracy >= 0.6) {
      // Moderate session: review tomorrow
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    } else {
      // Struggled session: review within 4 hours
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }
  }

  /**
   * Human-readable title for a chess theme.
   */
  formatThemeTitle(theme: string): string {
    const map: Record<string, string> = {
      // Tactical Combinations
      FORK: 'Knight & Pawn Forks',
      PIN: 'Pins & Paralyzed Pieces',
      SKEWER: 'Linear Skewers',
      HANGING_PIECE: 'Hanging & Undefended Pieces',
      BACK_RANK: 'Back-Rank Defense & Mate',
      LATE_CASTLING: 'King Safety & Proactive Castling',
      CENTER_CONTROL: 'Center Occupation & Space',
      OPEN_FILE: 'Rook Infiltration on Open Files',
      // Openings
      SICILIAN_DEFENSE: 'Sicilian Defense (Open & Closed)',
      FRENCH_DEFENSE: 'French Defense & Pawn Chains',
      ITALIAN_GAME: 'Italian Game & Giuoco Piano',
      RUY_LOPEZ: 'Ruy Lopez (Spanish Opening)',
      QUEENS_GAMBIT: "Queen's Gambit (Declined & Accepted)",
      CARO_KANN: 'Caro-Kann Defense',
      KINGS_INDIAN: "King's Indian Defense",
      ENGLISH_OPENING: 'English Opening (1. c4)',
      // Middlegames
      KNIGHT_OUTPOST: 'Knight Outpost & Hole Exploitation',
      GREEK_GIFT: 'The Greek Gift Sacrifice (Bxh7+)',
      PAWN_STRUCTURE: "Pawn Structure & Isolated Queen's Pawn",
      PROPHYLAXIS: 'Prophylaxis & Opponent Threat Prevention',
      PIECE_COORDINATION: 'Minor Piece Coordination',
      KING_HUNT: 'King Hunt & Mating Net Execution',
      // Endgames
      KING_AND_PAWN: 'King & Pawn: The Opposition',
      LUCENA_POSITION: 'Lucena Position: Building the Bridge',
      PHILIDOR_DEFENSE: 'Philidor Defense: 3rd Rank Barrier',
      OPPOSITE_BISHOPS: 'Opposite-Colored Bishop Endgames',
      QUEEN_VS_PAWN: 'Queen vs 7th Rank Pawn',
      ROOK_ACTIVITY: 'Rook Activity & 7th Rank Infiltration'
    };
    return map[theme] || `${theme.replace(/_/g, ' ')} Practice`;
  }

  /**
   * Validates and normalizes a theme string.
   * Returns the normalized theme or throws BadRequestError if invalid.
   */
  validateTheme(theme: unknown): PracticeTheme {
    const normalized = normalizePracticeTheme(theme);
    if (!normalized) {
      throw new BadRequestError(
        `Invalid theme: '${String(theme)}'. Supported themes: ${PRACTICE_THEMES.join(', ')}`
      );
    }
    return normalized;
  }
}

export const adaptivePlannerService = new AdaptivePlannerService();
