/**
 * Phase 7: Practice & Adaptive Training Repository
 *
 * Direct database access for PracticeSession, PracticeAttempt, ThemeMastery, and Puzzle.
 * Strict ownership and foreign-key integrity.
 */

import { prisma } from '../config/database.js';
import {
  PracticeSession,
  PracticeAttempt,
  ThemeMastery,
  Puzzle,
  PracticeSessionType,
  SessionStatus,
  AttemptResult
} from '@prisma/client';

export class PracticeRepository {
  /**
   * Find an active session for a player.
   */
  async getActiveSessionForPlayer(playerId: string): Promise<PracticeSession | null> {
    return prisma.practiceSession.findFirst({
      where: {
        playerId,
        status: 'ACTIVE'
      },
      include: {
        attempts: {
          orderBy: { attemptedAt: 'asc' }
        }
      }
    });
  }

  /**
   * Create a new practice session.
   */
  async createSession(data: {
    playerId: string;
    sessionType: PracticeSessionType;
    targetTheme: string;
    plannedItemCount: number;
    averageDifficulty: number;
  }): Promise<PracticeSession> {
    return prisma.practiceSession.create({
      data: {
        playerId: data.playerId,
        sessionType: data.sessionType,
        targetTheme: data.targetTheme,
        plannedItemCount: data.plannedItemCount,
        averageDifficulty: data.averageDifficulty,
        status: 'ACTIVE'
      },
      include: {
        attempts: true
      }
    });
  }

  /**
   * Retrieve session by ID with its attempts.
   */
  async getSessionById(sessionId: string): Promise<(PracticeSession & { attempts: PracticeAttempt[] }) | null> {
    return prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        attempts: {
          orderBy: { attemptedAt: 'asc' }
        }
      }
    });
  }

  /**
   * Update practice session counters and status.
   */
  async updateSession(
    sessionId: string,
    data: {
      completedItemCount?: number;
      correctCount?: number;
      incorrectCount?: number;
      averageDifficulty?: number;
      status?: SessionStatus;
      completedAt?: Date | null;
    }
  ): Promise<PracticeSession> {
    return prisma.practiceSession.update({
      where: { id: sessionId },
      data
    });
  }

  /**
   * Create a practice attempt record.
   */
  async createAttempt(data: {
    playerId: string;
    sessionId: string;
    puzzleId: string;
    theme: string;
    difficultyRating: number;
    result: AttemptResult;
    timeSpentMs: number;
    usedHint: boolean;
    hintCount: number;
    moveCount: number;
    attemptedMoveSan?: string;
  }): Promise<PracticeAttempt> {
    return prisma.practiceAttempt.create({
      data
    });
  }

  /**
   * Get recent attempts for a player on a specific theme or overall.
   */
  async getRecentAttempts(playerId: string, theme?: string, limit = 10): Promise<PracticeAttempt[]> {
    return prisma.practiceAttempt.findMany({
      where: {
        playerId,
        ...(theme ? { theme } : {})
      },
      orderBy: { attemptedAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get theme mastery record for a player.
   */
  async getThemeMastery(playerId: string, theme: string): Promise<ThemeMastery | null> {
    return prisma.themeMastery.findUnique({
      where: {
        playerId_theme: {
          playerId,
          theme
        }
      }
    });
  }

  /**
   * Get all theme mastery records for a player.
   */
  async getAllThemeMasteries(playerId: string): Promise<ThemeMastery[]> {
    return prisma.themeMastery.findMany({
      where: { playerId },
      orderBy: { masteryScore: 'asc' }
    });
  }

  /**
   * Upsert a player's theme mastery metrics.
   */
  async upsertThemeMastery(data: {
    playerId: string;
    theme: string;
    attemptCount: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
    masteryScore: number;
    recentAccuracy: number;
    streak: number;
    bestStreak: number;
    currentDifficulty: number;
    lastAttemptedAt: Date;
    lastCorrectAt?: Date;
    nextReviewAt?: Date;
  }): Promise<ThemeMastery> {
    return prisma.themeMastery.upsert({
      where: {
        playerId_theme: {
          playerId: data.playerId,
          theme: data.theme
        }
      },
      create: data,
      update: {
        attemptCount: data.attemptCount,
        correctCount: data.correctCount,
        incorrectCount: data.incorrectCount,
        accuracy: data.accuracy,
        masteryScore: data.masteryScore,
        recentAccuracy: data.recentAccuracy,
        streak: data.streak,
        bestStreak: data.bestStreak,
        currentDifficulty: data.currentDifficulty,
        lastAttemptedAt: data.lastAttemptedAt,
        ...(data.lastCorrectAt ? { lastCorrectAt: data.lastCorrectAt } : {}),
        ...(data.nextReviewAt ? { nextReviewAt: data.nextReviewAt } : {})
      }
    });
  }

  /**
   * Query active puzzles matching theme and rating range, excluding already attempted puzzle IDs.
   */
  async findCandidatePuzzles(params: {
    theme: string;
    minRating?: number;
    maxRating?: number;
    excludePuzzleIds?: string[];
  }): Promise<Puzzle[]> {
    const { theme, minRating = 0, maxRating = 3000, excludePuzzleIds = [] } = params;

    const baseWhere = {
      theme,
      isActive: true,
      rating: {
        gte: minRating,
        lte: maxRating
      },
      ...(excludePuzzleIds.length > 0 ? { id: { notIn: excludePuzzleIds } } : {})
    };

    let puzzles = await prisma.puzzle.findMany({
      where: baseWhere,
      orderBy: { rating: 'asc' }
    });

    // Fallback: If excluded list removed all candidates, relax exclusion
    if (puzzles.length === 0 && excludePuzzleIds.length > 0) {
      puzzles = await prisma.puzzle.findMany({
        where: {
          theme,
          isActive: true,
          rating: {
            gte: minRating,
            lte: maxRating
          }
        },
        orderBy: { rating: 'asc' }
      });
    }

    // Secondary fallback: Expand rating boundaries
    if (puzzles.length === 0) {
      puzzles = await prisma.puzzle.findMany({
        where: {
          theme,
          isActive: true
        },
        orderBy: { rating: 'asc' }
      });
    }

    return puzzles;
  }

  /**
   * Fetch single puzzle by ID.
   */
  async getPuzzleById(puzzleId: string): Promise<Puzzle | null> {
    return prisma.puzzle.findUnique({
      where: { id: puzzleId }
    });
  }
}

export const practiceRepository = new PracticeRepository();
