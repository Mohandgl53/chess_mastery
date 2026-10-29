/**
 * Phase 6: Training Recommendation Service
 *
 * Deterministically generates prioritized, personalized training recommendations
 * grounded in real player memory, weaknesses, and skill profiles.
 *
 * ARCHITECTURAL RULE:
 * - Recommendations must originate from actual stored evidence, not LLM hallucinations.
 * - Reasons are transparent, verifiable facts (e.g. "Missed 3 tactical fork opportunities in recent games").
 */

import { prisma } from '../config/database.js';
import {
  KnowledgeCategory,
  KnowledgeDifficulty,
  RecommendationType,
  RecommendationStatus,
  Weakness,
  TrainingRecommendation
} from '@prisma/client';

export class TrainingRecommendationService {
  /**
   * Deterministically generate and refresh recommendations for a player.
   */
  async generateRecommendationsForPlayer(playerId: string): Promise<TrainingRecommendation[]> {
    const [profile, activeWeaknesses, existingActive] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { id: playerId } }),
      prisma.weakness.findMany({
        where: { playerId, status: { in: ['ACTIVE', 'IMPROVING'] } },
        orderBy: [{ confidence: 'desc' }, { occurrenceCount: 'desc' }],
        take: 8
      }),
      prisma.trainingRecommendation.findMany({
        where: { playerId, status: 'ACTIVE' }
      })
    ]);

    if (!profile) return [];

    const existingThemeMap = new Map<string, TrainingRecommendation>();
    for (const rec of existingActive) {
      existingThemeMap.set(`${rec.category}_${rec.theme}`, rec);
    }

    const newRecommendations: Array<{
      playerId: string;
      type: RecommendationType;
      category: KnowledgeCategory;
      theme: string;
      priority: number;
      title: string;
      reason: string;
      targetSkill: string;
      estimatedDifficulty: KnowledgeDifficulty;
      source: string;
      status: RecommendationStatus;
      metadata: Record<string, any>;
    }> = [];

    for (const weakness of activeWeaknesses) {
      const key = `${weakness.category}_${weakness.theme}`;
      if (existingThemeMap.has(key)) {
        // Already recommended, update priority if needed
        const existing = existingThemeMap.get(key)!;
        const newPriority = this.calculatePriority(weakness);
        if (Math.abs(existing.priority - newPriority) > 0.5) {
          await prisma.trainingRecommendation.update({
            where: { id: existing.id },
            data: { priority: newPriority }
          });
        }
        continue;
      }

      // Map weakness to recommendation
      const rec = this.createRecommendationFromWeakness(weakness, profile.rating);
      newRecommendations.push(rec);
    }

    // Insert new recommendations
    if (newRecommendations.length > 0) {
      await prisma.trainingRecommendation.createMany({
        data: newRecommendations as any
      });
    }

    // Return current active recommendations ordered by priority
    return prisma.trainingRecommendation.findMany({
      where: { playerId, status: 'ACTIVE' },
      orderBy: { priority: 'desc' },
      take: 10
    });
  }

  /**
   * Complete an active recommendation.
   */
  async completeRecommendation(recommendationId: string, playerId: string): Promise<TrainingRecommendation> {
    const rec = await prisma.trainingRecommendation.findFirst({
      where: { id: recommendationId, playerId }
    });

    if (!rec) {
      throw new Error('Recommendation not found or not owned by player');
    }

    return prisma.trainingRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
  }

  /**
   * Deterministic priority calculation formula:
   * Priority = (severityWeight * 2.5) + (confidence * 3.5) + min(occurrenceCount * 0.5, 3.0)
   * Result is on a 0 - 10 scale.
   */
  calculatePriority(weakness: Weakness): number {
    let severityWeight = 1.0;
    if (weakness.severity === 'HIGH' || weakness.severity === 'CRITICAL') severityWeight = 2.0;
    else if (weakness.severity === 'MEDIUM') severityWeight = 1.4;

    const confScore = weakness.confidence; // 0.0 to 1.0
    const occurrenceBoost = Math.min(weakness.occurrenceCount * 0.5, 3.0);

    const raw = (severityWeight * 2.5) + (confScore * 3.5) + occurrenceBoost;
    return Math.min(10.0, Math.round(raw * 10) / 10);
  }

  private createRecommendationFromWeakness(
    weakness: Weakness,
    playerRating: number
  ): {
    playerId: string;
    type: RecommendationType;
    category: KnowledgeCategory;
    theme: string;
    priority: number;
    title: string;
    reason: string;
    targetSkill: string;
    estimatedDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER';
    source: string;
    status: RecommendationStatus;
    metadata: Record<string, any>;
  } {
    const priority = this.calculatePriority(weakness);

    let estimatedDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER' = 'INTERMEDIATE';
    if (playerRating < 1000) estimatedDifficulty = 'BEGINNER';
    else if (playerRating >= 1600 && playerRating < 2000) estimatedDifficulty = 'ADVANCED';
    else if (playerRating >= 2000) estimatedDifficulty = 'MASTER';

    let type: RecommendationType = 'PUZZLE';
    let targetSkill = 'tacticsSkill';
    let actionVerb = 'Solve 10 targeted puzzles';

    switch (weakness.category) {
      case 'TACTICS':
        type = 'PUZZLE';
        targetSkill = 'tacticsSkill';
        actionVerb = `Solve 10 ${weakness.theme.toLowerCase()} tactic puzzles`;
        break;
      case 'CALCULATION':
        type = 'PRACTICE';
        targetSkill = 'calculationSkill';
        actionVerb = 'Practice deep calculation without rushing';
        break;
      case 'OPENING':
        type = 'OPENING_REVIEW';
        targetSkill = 'openingSkill';
        actionVerb = 'Review opening development principles';
        break;
      case 'MIDDLEGAME':
        type = 'LESSON';
        targetSkill = 'middlegameSkill';
        actionVerb = 'Study positional middlegame strategy';
        break;
      case 'ENDGAME':
        type = 'ENDGAME_REVIEW';
        targetSkill = 'endgameSkill';
        actionVerb = 'Practice fundamental endgame conversions';
        break;
      case 'KING_SAFETY':
        type = 'LESSON';
        targetSkill = 'kingSafetySkill';
        actionVerb = 'Review castling timing and king protection';
        break;
      case 'BLUNDER_PREVENTION':
        type = 'PRACTICE';
        targetSkill = 'blunderPreventionSkill';
        actionVerb = 'Perform blunder-check before committing moves';
        break;
      default:
        type = 'PUZZLE';
        targetSkill = 'tacticsSkill';
        break;
    }

    const title = `${actionVerb}`;
    const reason = `Detected ${weakness.occurrenceCount} instance${
      weakness.occurrenceCount > 1 ? 's' : ''
    } of ${weakness.theme.toLowerCase().replace(/_/g, ' ')} issues across recent games (Confidence: ${Math.round(
      weakness.confidence * 100
    )}%).`;

    return {
      playerId: weakness.playerId,
      type,
      category: weakness.category,
      theme: weakness.theme,
      priority,
      title,
      reason,
      targetSkill,
      estimatedDifficulty,
      source: 'AUTOMATIC_WEAKNESS_DETECTION',
      status: 'ACTIVE',
      metadata: {
        actionVerb,
        weaknessId: weakness.id,
        firstDetectedAt: weakness.firstDetectedAt,
        occurrenceCount: weakness.occurrenceCount
      }
    };
  }
}

export const trainingRecommendationService = new TrainingRecommendationService();
