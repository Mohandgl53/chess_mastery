/**
 * Phase 7: Practice & Adaptive Training Service
 *
 * Connects the interactive practice interface to Player Memory, ThemeMastery,
 * and Training Recommendations.
 *
 * ARCHITECTURAL RULE:
 * - chess.js validates move legality and puzzle correctness.
 * - Stockfish objective evaluations remain authoritative.
 * - Practice attempts directly feed LearningEvidence into Player Memory.
 * - LLM is strictly used for coaching explanations and hints.
 */

import { Chess, Square } from 'chess.js';
import { prisma } from '../config/database.js';
import { practiceRepository } from '../repositories/practice.repository.js';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { adaptivePlannerService } from './adaptive-planner.service.js';
import { trainingRecommendationService } from './training-recommendation.service.js';
import {
  PracticeSession,
  PracticeAttempt,
  ThemeMastery,
  Puzzle,
  AttemptResult,
  KnowledgeCategory
} from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';

export interface PracticeAttemptResult {
  result: AttemptResult;
  isCorrect: boolean;
  isSessionComplete: boolean;
  completedItemCount: number;
  plannedItemCount: number;
  correctCount: number;
  incorrectCount: number;
  feedback: string;
  solutionSan: string;
  tacticalExplanation: string;
  nextPuzzle: Puzzle | null;
  masteryUpdate?: {
    theme: string;
    masteryScore: number;
    accuracy: number;
    streak: number;
  };
}

export class PracticeService {
  /**
   * Get practice dashboard data for the authenticated player.
   */
  async getDashboard(userId: string) {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);
    const plan = await adaptivePlannerService.generateAdaptivePlan(userId);
    const activeSession = await practiceRepository.getActiveSessionForPlayer(profile.id);
    const masteries = await practiceRepository.getAllThemeMasteries(profile.id);
    const recommendations = await prisma.trainingRecommendation.findMany({
      where: { playerId: profile.id, status: 'ACTIVE' },
      orderBy: { priority: 'desc' },
      take: 3
    });

    let currentPuzzle: Puzzle | null = null;
    if (activeSession) {
      currentPuzzle = await adaptivePlannerService.selectNextPuzzle(activeSession).catch(() => null);
    }

    return {
      plan,
      activeSession,
      currentPuzzle,
      masteries,
      recommendations,
      stats: {
        puzzlesSolved: profile.puzzlesSolved,
        puzzlesAttempted: profile.puzzlesAttempted,
        tacticsSkill: profile.tacticsSkill,
        overallTrainingScore: profile.overallTrainingScore
      }
    };
  }

  /**
   * Start a new adaptive training session.
   */
  async startSession(userId: string, requestedTheme?: string) {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);

    // Cancel or complete any abandoned active session older than 2 hours,
    // or abandon existing session if player explicitly requested a different theme drill
    const existingActive = await practiceRepository.getActiveSessionForPlayer(profile.id);
    if (existingActive) {
      const hoursOld = (Date.now() - existingActive.startedAt.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 2 || (requestedTheme && existingActive.targetTheme !== requestedTheme)) {
        await practiceRepository.updateSession(existingActive.id, { status: 'ABANDONED' });
      } else {
        // Return existing active session with next puzzle
        const puzzle = await adaptivePlannerService.selectNextPuzzle(existingActive);
        return {
          session: existingActive,
          puzzle,
          isNew: false
        };
      }
    }

    // Generate deterministic adaptive plan
    const plan = await adaptivePlannerService.generateAdaptivePlan(userId, requestedTheme);

    // Create session in database
    const session = await practiceRepository.createSession({
      playerId: profile.id,
      sessionType: plan.sessionType,
      targetTheme: plan.targetTheme,
      plannedItemCount: plan.plannedItemCount,
      averageDifficulty: plan.initialDifficulty
    });

    // Select initial puzzle
    const puzzle = await adaptivePlannerService.selectNextPuzzle(session);

    return {
      session,
      puzzle,
      isNew: true
    };
  }

  /**
   * Submit an attempt for a puzzle in an active session.
   * Objective chess verification is handled by chess.js.
   */
  async recordAttempt(
    userId: string,
    sessionId: string,
    payload: {
      puzzleId: string;
      moveSan: string;
      from?: string;
      to?: string;
      timeSpentMs?: number;
      usedHint?: boolean;
      hintCount?: number;
    }
  ): Promise<PracticeAttemptResult> {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);
    const session = await practiceRepository.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundError(`Practice session ${sessionId} not found`);
    }

    if (session.playerId !== profile.id) {
      throw new ForbiddenError('You do not have access to this practice session');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestError('This practice session has already been completed or closed');
    }

    const puzzle = await practiceRepository.getPuzzleById(payload.puzzleId);
    if (!puzzle) {
      throw new NotFoundError(`Puzzle ${payload.puzzleId} not found`);
    }

    // 1. Authoritative Move Legality and Correctness with chess.js
    const chess = new Chess(puzzle.fen);
    let legalMove;

    try {
      if (payload.from && payload.to) {
        legalMove = chess.move({
          from: payload.from as Square,
          to: payload.to as Square
        });
      } else {
        legalMove = chess.move(payload.moveSan);
      }
    } catch {
      throw new BadRequestError(`Illegal chess move: ${payload.moveSan}`);
    }

    if (!legalMove) {
      throw new BadRequestError(`Illegal chess move: ${payload.moveSan}`);
    }

    // Compare with puzzle solution
    const solutionMoves = puzzle.solutionMoves as Array<{ from: string; to: string; san: string }>;
    const expectedMove = solutionMoves[0];

    const isCorrect =
      (expectedMove.san === legalMove.san) ||
      (expectedMove.from === legalMove.from && expectedMove.to === legalMove.to);

    const result: AttemptResult = isCorrect ? 'CORRECT' : 'INCORRECT';

    // 2. Persist PracticeAttempt
    const attempt = await practiceRepository.createAttempt({
      playerId: profile.id,
      sessionId: session.id,
      puzzleId: puzzle.id,
      theme: puzzle.theme,
      difficultyRating: puzzle.rating,
      result,
      timeSpentMs: payload.timeSpentMs ?? 0,
      usedHint: payload.usedHint ?? false,
      hintCount: payload.hintCount ?? 0,
      moveCount: 1,
      attemptedMoveSan: legalMove.san
    });

    // 3. Feed Evidence into Player Memory (LearningEvidence)
    let category: KnowledgeCategory = 'TACTICS';
    if (puzzle.theme === 'CENTER_CONTROL') category = 'OPENING';
    else if (puzzle.theme === 'LATE_CASTLING') category = 'KING_SAFETY';
    else if (puzzle.theme === 'OPEN_FILE') category = 'MIDDLEGAME';
    else if (puzzle.theme === 'HANGING_PIECE') category = 'BLUNDER_PREVENTION';

    await prisma.learningEvidence.create({
      data: {
        playerId: profile.id,
        practiceAttemptId: attempt.id,
        category,
        theme: puzzle.theme,
        evidenceType: isCorrect ? 'POSITIVE' : 'NEGATIVE',
        severity: 'LOW', // Practice evidence has modest severity to avoid extreme swings
        moveSan: legalMove.san,
        metadata: {
          source: 'PRACTICE_ATTEMPT',
          sessionId: session.id,
          puzzleId: puzzle.id,
          difficulty: puzzle.rating,
          usedHint: payload.usedHint ?? false,
          timeSpentMs: payload.timeSpentMs ?? 0
        }
      }
    });

    // 4. Update ThemeMastery metrics
    const currentMastery = await practiceRepository.getThemeMastery(profile.id, puzzle.theme);
    const newAttemptCount = (currentMastery?.attemptCount ?? 0) + 1;
    const newCorrectCount = (currentMastery?.correctCount ?? 0) + (isCorrect ? 1 : 0);
    const newIncorrectCount = (currentMastery?.incorrectCount ?? 0) + (isCorrect ? 0 : 1);
    const newAccuracy = newCorrectCount / newAttemptCount;

    // Streak handling
    const newStreak = isCorrect ? (currentMastery?.streak ?? 0) + 1 : 0;
    const bestStreak = Math.max(newStreak, currentMastery?.bestStreak ?? 0);

    // Recent accuracy weighting
    const recentAttempts = await practiceRepository.getRecentAttempts(profile.id, puzzle.theme, 10);
    const recentCorrect = recentAttempts.filter((a) => a.result === 'CORRECT').length;
    const recentAccuracy = recentAttempts.length > 0 ? recentCorrect / recentAttempts.length : newAccuracy;

    // Mastery Score Formula: 60% historical accuracy + 30% recent accuracy + 10% streak bonus
    const streakBonus = Math.min(newStreak * 2, 10);
    const masteryScore = Math.min(100, Math.max(0, (newAccuracy * 60) + (recentAccuracy * 30) + streakBonus));

    // Dynamic difficulty adjustment for theme
    let newDifficulty = currentMastery?.currentDifficulty ?? puzzle.rating;
    if (isCorrect) {
      newDifficulty = Math.min(2200, newDifficulty + (payload.usedHint ? 10 : 25));
    } else {
      newDifficulty = Math.max(700, newDifficulty - 25);
    }

    const nextReviewAt = adaptivePlannerService.calculateNextReviewDate(recentAccuracy, newStreak);

    const updatedMastery = await practiceRepository.upsertThemeMastery({
      playerId: profile.id,
      theme: puzzle.theme,
      attemptCount: newAttemptCount,
      correctCount: newCorrectCount,
      incorrectCount: newIncorrectCount,
      accuracy: Math.round(newAccuracy * 100) / 100,
      masteryScore: Math.round(masteryScore * 10) / 10,
      recentAccuracy: Math.round(recentAccuracy * 100) / 100,
      streak: newStreak,
      bestStreak,
      currentDifficulty: newDifficulty,
      lastAttemptedAt: new Date(),
      ...(isCorrect ? { lastCorrectAt: new Date() } : {}),
      nextReviewAt
    });

    // 5. Update Profile Stats
    await prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        puzzlesAttempted: { increment: 1 },
        ...(isCorrect ? { puzzlesSolved: { increment: 1 } } : {})
      }
    });

    // 6. Update Session Stats
    const newCompletedItems = session.completedItemCount + 1;
    const newSessionCorrect = session.correctCount + (isCorrect ? 1 : 0);
    const newSessionIncorrect = session.incorrectCount + (isCorrect ? 0 : 1);
    const isSessionComplete = newCompletedItems >= session.plannedItemCount;

    await practiceRepository.updateSession(session.id, {
      completedItemCount: newCompletedItems,
      correctCount: newSessionCorrect,
      incorrectCount: newSessionIncorrect,
      ...(isSessionComplete ? { status: 'COMPLETED', completedAt: new Date() } : {})
    });

    // 7. Check if Weakness is now Resolved or Improving
    const weakness = await prisma.weakness.findUnique({
      where: {
        playerId_theme: {
          playerId: profile.id,
          theme: puzzle.theme
        }
      }
    });

    if (weakness && isCorrect) {
      if (updatedMastery.masteryScore >= 75 && updatedMastery.recentAccuracy >= 0.8) {
        await prisma.weakness.update({
          where: { id: weakness.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            confidence: Math.max(0.1, weakness.confidence - 0.2)
          }
        });
      } else if (weakness.status === 'ACTIVE' && updatedMastery.masteryScore >= 60) {
        await prisma.weakness.update({
          where: { id: weakness.id },
          data: {
            status: 'IMPROVING',
            confidence: Math.max(0.2, weakness.confidence - 0.1)
          }
        });
      }
    }

    // If session completed, re-evaluate recommendations
    if (isSessionComplete) {
      await trainingRecommendationService.generateRecommendationsForPlayer(profile.id);
    }

    // 8. Select next puzzle if session remains active
    let nextPuzzle: Puzzle | null = null;
    if (!isSessionComplete) {
      const refreshedSession = await practiceRepository.getSessionById(session.id);
      if (refreshedSession) {
        nextPuzzle = await adaptivePlannerService.selectNextPuzzle(refreshedSession).catch(() => null);
      }
    }

    const feedback = isCorrect
      ? `Brilliant! ${legalMove.san} is the winning tactical move.`
      : `Not quite. ${legalMove.san} is playable, but misses the key tactical motif.`;

    return {
      result,
      isCorrect,
      isSessionComplete,
      completedItemCount: newCompletedItems,
      plannedItemCount: session.plannedItemCount,
      correctCount: newSessionCorrect,
      incorrectCount: newSessionIncorrect,
      feedback,
      solutionSan: expectedMove.san,
      tacticalExplanation: puzzle.tacticalExplanation,
      nextPuzzle,
      masteryUpdate: {
        theme: puzzle.theme,
        masteryScore: updatedMastery.masteryScore,
        accuracy: updatedMastery.accuracy,
        streak: updatedMastery.streak
      }
    };
  }

  /**
   * Explicitly finish an active session early.
   */
  async completeSession(userId: string, sessionId: string) {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);
    const session = await practiceRepository.getSessionById(sessionId);

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    if (session.playerId !== profile.id) {
      throw new ForbiddenError('You do not own this session');
    }

    const updated = await practiceRepository.updateSession(session.id, {
      status: 'COMPLETED',
      completedAt: new Date()
    });

    await trainingRecommendationService.generateRecommendationsForPlayer(profile.id);

    return {
      session: updated,
      accuracy: session.completedItemCount > 0 ? (session.correctCount / session.completedItemCount) : 0
    };
  }
}

export const practiceService = new PracticeService();
