import { Request, Response, NextFunction } from 'express';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { playerMemoryService } from '../services/player-memory.service.js';
import { trainingRecommendationService } from '../services/training-recommendation.service.js';
import { prisma } from '../config/database.js';
import { WeaknessStatus } from '@prisma/client';

export class PlayerController {
  async getProfile(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      Next(err);
    }
  }

  async getSkills(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const snapshots = await playerMemoryRepository.getSnapshots(profile.id, 20);

      res.json({
        success: true,
        data: {
          current: {
            tacticsSkill: profile.tacticsSkill,
            calculationSkill: profile.calculationSkill,
            openingSkill: profile.openingSkill,
            middlegameSkill: profile.middlegameSkill,
            endgameSkill: profile.endgameSkill,
            positionalSkill: profile.positionalSkill,
            kingSafetySkill: profile.kingSafetySkill,
            pieceCoordinationSkill: profile.pieceCoordinationSkill,
            pawnStructureSkill: profile.pawnStructureSkill,
            timeManagementSkill: profile.timeManagementSkill,
            blunderPreventionSkill: profile.blunderPreventionSkill,
            overallTrainingScore: profile.overallTrainingScore,
            gamesAnalyzed: profile.gamesAnalyzed,
            lastAnalyzedAt: profile.lastAnalyzedAt
          },
          snapshots
        }
      });
    } catch (err) {
      Next(err);
    }
  }

  async getWeaknesses(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const status = req.query.status as WeaknessStatus | undefined;
      const weaknesses = await playerMemoryRepository.getWeaknesses(profile.id, status);

      res.json({ success: true, data: weaknesses });
    } catch (err) {
      Next(err);
    }
  }

  async getStrengths(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const strengths = await playerMemoryRepository.getStrengths(profile.id);

      res.json({ success: true, data: strengths });
    } catch (err) {
      Next(err);
    }
  }

  async getRecommendations(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const recommendations = await playerMemoryRepository.getRecommendations(profile.id);

      res.json({ success: true, data: recommendations });
    } catch (err) {
      Next(err);
    }
  }

  async completeRecommendation(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const id = req.params.id as string;

      const completed = await trainingRecommendationService.completeRecommendation(id, profile.id);
      res.json({ success: true, data: completed });
    } catch (err) {
      Next(err);
    }
  }

  async getEvidence(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

      const evidence = await prisma.learningEvidence.findMany({
        where: { playerId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      res.json({ success: true, data: evidence });
    } catch (err) {
      Next(err);
    }
  }

  async getProgress(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const memory = await playerMemoryRepository.getFullMemoryByUserId(userId);

      // Check total user games
      const totalGamesCount = await prisma.game.count({ where: { userId } });

      res.json({
        success: true,
        data: {
          ...memory,
          totalGamesCount,
          isSufficientData: (memory?.profile.gamesAnalyzed ?? 0) >= 1
        }
      });
    } catch (err) {
      Next(err);
    }
  }

  async processGame(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const gameId = req.params.gameId as string;

      const result = await playerMemoryService.processCompletedGame(userId, gameId);
      res.json({ success: true, data: result });
    } catch (err) {
      Next(err);
    }
  }

  async recalculate(req: Request, res: Response, Next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const profile = await playerMemoryRepository.getOrCreateProfile(userId);

      // Re-run recommendations
      const recs = await trainingRecommendationService.generateRecommendationsForPlayer(profile.id);
      res.json({ success: true, data: { profile, recommendations: recs } });
    } catch (err) {
      Next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const {
        displayName,
        avatarUrl,
        bio,
        country,
        preferredStyle,
        favoriteOpening,
        favoriteOpeningBlack,
        flair,
        statusMessage
      } = req.body;

      // 1. Update user displayName if supplied
      let updatedUser = null;
      if (displayName && typeof displayName === 'string' && displayName.trim().length > 0) {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { displayName: displayName.trim() },
          select: { id: true, email: true, displayName: true, role: true, emailVerified: true, createdAt: true }
        });
      }

      // 2. Build profile update payload
      const updateData: Record<string, any> = {};
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (bio !== undefined) updateData.bio = bio;
      if (country !== undefined) updateData.country = country;
      if (preferredStyle !== undefined) updateData.preferredStyle = preferredStyle;
      if (favoriteOpening !== undefined) updateData.favoriteOpening = favoriteOpening;
      if (favoriteOpeningBlack !== undefined) updateData.favoriteOpeningBlack = favoriteOpeningBlack;
      if (flair !== undefined) updateData.flair = flair;
      if (statusMessage !== undefined) updateData.statusMessage = statusMessage;

      // Ensure profile exists
      await playerMemoryRepository.getOrCreateProfile(userId);

      const updatedProfile = await prisma.playerProfile.update({
        where: { userId },
        data: updateData
      });

      res.status(200).json({
        success: true,
        data: {
          profile: updatedProfile,
          user: updatedUser
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const playerController = new PlayerController();
