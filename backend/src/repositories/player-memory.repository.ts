import { prisma } from '../config/database.js';
import {
  PlayerProfile,
  Weakness,
  Strength,
  SkillSnapshot,
  TrainingRecommendation,
  LearningEvidence,
  WeaknessStatus,
  RecommendationStatus,
  Prisma
} from '@prisma/client';

export interface FullPlayerMemoryData {
  profile: PlayerProfile;
  weaknesses: Weakness[];
  strengths: Strength[];
  recommendations: TrainingRecommendation[];
  snapshots: SkillSnapshot[];
  recentEvidence: LearningEvidence[];
}

export class PlayerMemoryRepository {
  /**
   * Get or create a player profile for a given user ID.
   */
  async getOrCreateProfile(userId: string): Promise<PlayerProfile> {
    const existing = await prisma.playerProfile.findUnique({
      where: { userId }
    });

    if (existing) {
      return existing;
    }

    return prisma.playerProfile.create({
      data: {
        userId,
        rating: 400,
        tacticsSkill: 50.0,
        calculationSkill: 50.0,
        openingSkill: 50.0,
        middlegameSkill: 50.0,
        endgameSkill: 50.0,
        positionalSkill: 50.0,
        kingSafetySkill: 50.0,
        pieceCoordinationSkill: 50.0,
        pawnStructureSkill: 50.0,
        timeManagementSkill: 50.0,
        blunderPreventionSkill: 50.0,
        overallTrainingScore: 50.0
      }
    });
  }

  /**
   * Get complete player memory view (profile, active weaknesses, strengths, recommendations, snapshots).
   */
  async getFullMemoryByUserId(userId: string): Promise<FullPlayerMemoryData | null> {
    const profile = await this.getOrCreateProfile(userId);

    const [weaknesses, strengths, recommendations, snapshots, recentEvidence] = await Promise.all([
      prisma.weakness.findMany({
        where: { playerId: profile.id, status: { in: ['ACTIVE', 'IMPROVING'] } },
        orderBy: [{ confidence: 'desc' }, { occurrenceCount: 'desc' }]
      }),
      prisma.strength.findMany({
        where: { playerId: profile.id },
        orderBy: [{ confidence: 'desc' }, { occurrenceCount: 'desc' }]
      }),
      prisma.trainingRecommendation.findMany({
        where: { playerId: profile.id, status: 'ACTIVE' },
        orderBy: { priority: 'desc' },
        take: 10
      }),
      prisma.skillSnapshot.findMany({
        where: { playerId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.learningEvidence.findMany({
        where: { playerId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    return {
      profile,
      weaknesses,
      strengths,
      recommendations,
      snapshots: snapshots.reverse(), // chronologically ordered for charting
      recentEvidence
    };
  }

  async getWeaknesses(playerId: string, status?: WeaknessStatus): Promise<Weakness[]> {
    return prisma.weakness.findMany({
      where: {
        playerId,
        ...(status ? { status } : {})
      },
      orderBy: [{ confidence: 'desc' }, { lastDetectedAt: 'desc' }]
    });
  }

  async getStrengths(playerId: string): Promise<Strength[]> {
    return prisma.strength.findMany({
      where: { playerId },
      orderBy: [{ confidence: 'desc' }, { occurrenceCount: 'desc' }]
    });
  }

  async getRecommendations(playerId: string, status?: RecommendationStatus): Promise<TrainingRecommendation[]> {
    return prisma.trainingRecommendation.findMany({
      where: {
        playerId,
        ...(status ? { status } : { status: 'ACTIVE' })
      },
      orderBy: { priority: 'desc' }
    });
  }

  async getSnapshots(playerId: string, limit = 20): Promise<SkillSnapshot[]> {
    const rows = await prisma.skillSnapshot.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return rows.reverse();
  }

  async getEvidence(playerId: string, limit = 50): Promise<LearningEvidence[]> {
    return prisma.learningEvidence.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async markRecommendationStatus(
    recommendationId: string,
    playerId: string,
    status: RecommendationStatus
  ): Promise<TrainingRecommendation | null> {
    const existing = await prisma.trainingRecommendation.findFirst({
      where: { id: recommendationId, playerId }
    });

    if (!existing) return null;

    return prisma.trainingRecommendation.update({
      where: { id: recommendationId },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {})
      }
    });
  }
}

export const playerMemoryRepository = new PlayerMemoryRepository();
