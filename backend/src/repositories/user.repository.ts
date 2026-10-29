import { prisma } from '../config/database.js';
import type { User, PlayerProfile } from '@prisma/client';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleId }
    });
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { googleId, emailVerified: true }
    });
  }

  async setEmailVerified(userId: string, emailVerified = true): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerified }
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  async findProfileByUserId(userId: string): Promise<PlayerProfile | null> {
    return prisma.playerProfile.findUnique({
      where: { userId }
    });
  }

  /**
   * Create a User and its PlayerProfile atomically in a single transaction.
   * If either creation fails, the entire operation is rolled back.
   */
  async createWithProfile(
    userData: {
      email: string;
      passwordHash?: string | null;
      displayName: string;
      googleId?: string | null;
      emailVerified?: boolean;
    },
    profileData?: {
      rating?: number;
      gamesPlayed?: number;
      gamesWon?: number;
      gamesDrawn?: number;
      gamesLost?: number;
    }
  ): Promise<User & { profile: PlayerProfile }> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash: userData.passwordHash ?? null,
          displayName: userData.displayName,
          googleId: userData.googleId ?? null,
          emailVerified: userData.emailVerified ?? (userData.googleId ? true : false)
        }
      });

      const profile = await tx.playerProfile.create({
        data: {
          userId: user.id,
          rating: profileData?.rating ?? 400,
          gamesPlayed: profileData?.gamesPlayed ?? 0,
          gamesWon: profileData?.gamesWon ?? 0,
          gamesDrawn: profileData?.gamesDrawn ?? 0,
          gamesLost: profileData?.gamesLost ?? 0,
          currentStreak: 0,
          longestStreak: 0
        }
      });

      return { ...user, profile };
    });
  }
}

export const userRepository = new UserRepository();
