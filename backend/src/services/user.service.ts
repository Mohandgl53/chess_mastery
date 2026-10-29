import { userRepository } from '../repositories/user.repository.js';
import { NotFoundError } from '../utils/errors.js';

export interface SafeUserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
}

export class UserService {
  async getUserProfile(userId: string): Promise<SafeUserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const profile = await userRepository.findProfileByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      rating: profile?.rating ?? 800,
      gamesPlayed: profile?.gamesPlayed ?? 0,
      gamesWon: profile?.gamesWon ?? 0,
      gamesDrawn: profile?.gamesDrawn ?? 0,
      gamesLost: profile?.gamesLost ?? 0,
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0
    };
  }
}

export const userService = new UserService();
