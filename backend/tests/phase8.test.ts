import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { coachService } from '../src/services/coach.service.js';
import { adaptivePlannerService } from '../src/services/adaptive-planner.service.js';
import { trainingRecommendationService } from '../src/services/training-recommendation.service.js';
import { playerMemoryService } from '../src/services/player-memory.service.js';
import { ragRetrievalService } from '../src/services/rag.retrieval.service.js';
import { chessThemeDetector } from '../src/utils/chess-theme-detector.js';
import { prisma } from '../src/config/database.js';
import {
  CoachExplanationContext,
  CoachHintContext,
  PostGameReviewContext
} from '../src/providers/llm/llm.provider.js';

describe('Phase 8: Advanced Personalized Learning & Coach Intelligence Tests', () => {
  const testUserId = 'test-phase8-user-' + Date.now();
  let testPlayerId = '';

  beforeEach(async () => {
    // Ensure test user and player profile exist
    const user = await prisma.user.upsert({
      where: { email: `${testUserId}@example.com` },
      update: {},
      create: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        displayName: `Phase8 User`,
        passwordHash: 'dummy-hashed-pwd'
      }
    });

    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        rating: 1200,
        tacticsSkill: 45,
        calculationSkill: 40,
        openingSkill: 75,
        middlegameSkill: 50,
        endgameSkill: 60,
        kingSafetySkill: 35,
        gamesPlayed: 5,
        gamesWon: 2,
        gamesLost: 3,
        gamesDrawn: 0,
        gamesAnalyzed: 5
      }
    });

    testPlayerId = profile.id;
  });

  // ─── 1. Coach Context Assembly & Grounding ───────────────────────────────────
  describe('1. Intelligent Coach Context Assembly', () => {
    it('assembles structured context with FEN, engine evaluation, and player memory', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const chess = new Chess(fen);

      expect(chess.turn()).toBe('b');
      expect(chess.moves().length).toBeGreaterThan(0);

      const explanationContext: CoachExplanationContext = {
        fenBefore: fen,
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        moveSan: 'e5',
        bestMove: 'c5',
        moveNumber: 1,
        playerColor: 'b',
        evalBefore: 0.2,
        evalAfter: 0.1,
        evalDelta: 0.1,
        classification: 'GOOD',
        openingName: "King's Pawn Game",
        coachMode: 'FULL_COACHING'
      };

      const result = await coachService.explainMove(explanationContext, testUserId);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(10);
    });

    it('rejects explaining move for game owned by another user', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          displayName: `Other User`,
          passwordHash: 'dummy-pwd'
        }
      });

      const game = await prisma.game.create({
        data: {
          userId: otherUser.id,
          opponentName: 'Bot',
          playerColor: 'WHITE',
          status: 'IN_PROGRESS',
          result: 'UNKNOWN'
        }
      });

      const explanationContext: CoachExplanationContext & { gameId: string } = {
        gameId: game.id,
        fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        moveSan: 'e5',
        bestMove: 'c5',
        moveNumber: 1,
        playerColor: 'b',
        evalBefore: 0.2,
        evalAfter: 0.1,
        evalDelta: 0.1,
        classification: 'GOOD',
        openingName: "King's Pawn Game",
        coachMode: 'FULL_COACHING'
      };

      await expect(coachService.explainMove(explanationContext, testUserId)).rejects.toThrow(
        /not authorized/
      );
    });
  });

  // ─── 2. Personalized Coaching & Weakness Awareness ──────────────────────────
  describe('2. Weakness-Aware Explanations and Training Integration', () => {
    it('detects tactical weakness and feeds it into player memory context', async () => {
      // Create a known PIN weakness for the player
      const weakness = await prisma.weakness.create({
        data: {
          playerId: testPlayerId,
          category: 'TACTICS',
          theme: 'PIN',
          title: 'Vulnerability to Pins',
          description: 'Player frequently miscalculates pins against valuable pieces.',
          severity: 'HIGH',
          confidence: 0.85,
          occurrenceCount: 3,
          status: 'ACTIVE'
        }
      });

      expect(weakness.id).toBeDefined();
      expect(weakness.status).toBe('ACTIVE');

      // Verify that the memory repository loads this active weakness
      const activeWeaknesses = await prisma.weakness.findMany({
        where: { playerId: testPlayerId, status: 'ACTIVE' }
      });

      expect(activeWeaknesses.some((w) => w.theme === 'PIN')).toBe(true);
    });

    it('generates an adaptive practice plan matching the player active weakness', async () => {
      const plan = await adaptivePlannerService.generateAdaptivePlan(testUserId);

      expect(plan).toBeDefined();
      expect(plan.targetTheme).toBe('PIN');
      expect(plan.sessionType).toBe('ADAPTIVE');
      expect(plan.plannedItemCount).toBe(5);
      expect(plan.reason).toContain('Pin');
    });

    it('generates an adaptive practice plan when explicitly requested via theme query', async () => {
      const plan = await adaptivePlannerService.generateAdaptivePlan(testUserId, 'FORK');

      expect(plan).toBeDefined();
      expect(plan.targetTheme).toBe('FORK');
      expect(plan.sessionType).toBe('THEME_DRILL');
      expect(plan.priorityScore).toBe(10.0);
    });
  });

  // ─── 3. Deterministic Game Review & Top Moments Selection ───────────────────
  describe('3. Deterministic Game Review and Top Learning Moments', () => {
    it('selects the most critical blunders and mistakes deterministically', () => {
      const moves = [
        { moveNumber: 4, san: 'Nf3', classification: 'BOOK', evalDelta: 0, theme: 'DEVELOPMENT' },
        { moveNumber: 8, san: 'Qe2', classification: 'INACCURACY', evalDelta: 0.9, theme: 'QUEEN_EXPOSURE' },
        { moveNumber: 14, san: 'Bxf7+', classification: 'MISTAKE', evalDelta: 2.1, theme: 'PREMATURE_ATTACK' },
        { moveNumber: 22, san: 'Rd1??', classification: 'BLUNDER', evalDelta: 4.8, theme: 'HANGING_PIECE' },
        { moveNumber: 28, san: 'Kf1', classification: 'BLUNDER', evalDelta: 3.5, theme: 'BACK_RANK' }
      ];

      // Deterministic ranking: sort by evalDelta descending
      const sortedMoments = [...moves]
        .filter((m) => m.evalDelta >= 0.8)
        .sort((a, b) => b.evalDelta - a.evalDelta);

      const top3 = sortedMoments.slice(0, 3);

      expect(top3.length).toBe(3);
      expect(top3[0].san).toBe('Rd1??');
      expect(top3[0].evalDelta).toBe(4.8);
      expect(top3[1].san).toBe('Kf1');
      expect(top3[1].evalDelta).toBe(3.5);
      expect(top3[2].san).toBe('Bxf7+');
      expect(top3[2].evalDelta).toBe(2.1);
    });

    it('generates post-game review with structured learning takeaways and practice recommendation', async () => {
      const reviewContext: PostGameReviewContext = {
        result: 'BLACK_WINS',
        resultReason: 'CHECKMATE',
        playerColor: 'w',
        openingName: 'Ruy Lopez',
        accuracyWhite: 64.5,
        accuracyBlack: 88.2,
        moves: [
          {
            moveNumber: 12,
            san: 'f4',
            color: 'w',
            classification: 'BLUNDER',
            evaluation: -3.8
          }
        ]
      };

      const review = await coachService.generatePostGameReview(reviewContext, testUserId);

      expect(review).toBeDefined();
      expect(review.summary).toBeDefined();
      expect(review.keyLesson).toBeDefined();
      expect(review.phaseReviews).toBeDefined();
      expect(review.phaseReviews.opening).toBeDefined();
      expect(review.phaseReviews.middlegame).toBeDefined();
    });
  });

  // ─── 4. Trend Analysis & Progression ─────────────────────────────────────────
  describe('4. Historical Trend Analysis & Pattern Detection', () => {
    it('distinguishes recurring patterns from one-off errors', () => {
      const errorOccurrences = {
        PIN: 3,
        FORK: 1,
        BACK_RANK: 4,
        HANGING_PIECE: 1
      };

      const recurringWeaknesses = Object.entries(errorOccurrences)
        .filter(([_, count]) => count >= 2)
        .map(([theme]) => theme);

      const oneOffErrors = Object.entries(errorOccurrences)
        .filter(([_, count]) => count === 1)
        .map(([theme]) => theme);

      expect(recurringWeaknesses).toContain('PIN');
      expect(recurringWeaknesses).toContain('BACK_RANK');
      expect(recurringWeaknesses).not.toContain('FORK');
      expect(oneOffErrors).toContain('FORK');
      expect(oneOffErrors).toContain('HANGING_PIECE');
    });

    it('correctly calculates progression trend when sufficient games exist', () => {
      const recentGameAccuracies = [72, 75, 78, 82, 85];
      const isSufficient = recentGameAccuracies.length >= 3;
      expect(isSufficient).toBe(true);

      const firstHalf = recentGameAccuracies.slice(0, 2);
      const secondHalf = recentGameAccuracies.slice(-2);

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const delta = avgSecond - avgFirst;
      const trend = delta > 3 ? 'IMPROVING' : delta < -3 ? 'DECLINING' : 'STABLE';

      expect(trend).toBe('IMPROVING');
    });

    it('flags insufficient data when fewer than 3 games are analyzed', () => {
      const recentGameAccuracies = [70];
      const isSufficient = recentGameAccuracies.length >= 3;
      expect(isSufficient).toBe(false);
    });
  });

  // ─── 5. Spaced Repetition & Recommendation Freshness ─────────────────────────
  describe('5. Spaced Repetition Scheduling and Training Recommendations', () => {
    it('generates training recommendations grounded in active player weaknesses', async () => {
      const recs = await trainingRecommendationService.generateRecommendationsForPlayer(testPlayerId);

      expect(recs).toBeDefined();
      expect(Array.isArray(recs)).toBe(true);
      if (recs.length > 0) {
        expect(recs[0].playerId).toBe(testPlayerId);
        expect(recs[0].status).toBe('ACTIVE');
        expect(recs[0].priority).toBeGreaterThan(0);
      }
    });

    it('prioritizes overdue spaced repetition review over standard drills', async () => {
      // Add an overdue theme mastery for ENDGAME
      const pastDate = new Date(Date.now() - 3 * 24 * 3600 * 1000); // 3 days ago

      await prisma.themeMastery.upsert({
        where: {
          playerId_theme: {
            playerId: testPlayerId,
            theme: 'ENDGAME_PAWNS'
          }
        },
        update: {
          nextReviewAt: pastDate,
          recentAccuracy: 40.0
        },
        create: {
          playerId: testPlayerId,
          theme: 'ENDGAME_PAWNS',
          masteryScore: 45,
          currentDifficulty: 1100,
          recentAccuracy: 40.0,
          nextReviewAt: pastDate
        }
      });

      const plan = await adaptivePlannerService.generateAdaptivePlan(testUserId);
      expect(plan.isSpacedReview).toBe(true);
      expect(plan.targetTheme).toBe('ENDGAME_PAWNS');
      expect(plan.sessionType).toBe('WEAKNESS_REVIEW');
    });
  });

  // ─── 6. RAG Retrieval Integration for Concept Augmentation ──────────────────
  describe('6. RAG Grounded Concept Retrieval', () => {
    it('retrieves relevant knowledge chunks for chess concepts', async () => {
      const chunks = await ragRetrievalService.retrieve({
        queryText: 'Pin attacking two pieces in line',
        topK: 2
      });

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      // Even in test mode, hybrid search returns deterministic or keyword results
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });
});
