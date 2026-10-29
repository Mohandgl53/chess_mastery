import { PlayerProfile, Weakness, TrainingRecommendation } from '../types/user';
import { MOCK_USER_PROFILE } from '../mock/mockUserMemory';

export interface IUserService {
  getUserProfile(): Promise<PlayerProfile>;
  updateRating(delta: number): Promise<number>;
  getWeaknesses(): Promise<Weakness[]>;
  getRecommendations(): Promise<TrainingRecommendation[]>;
}

export class MockUserService implements IUserService {
  private profile: PlayerProfile = { ...MOCK_USER_PROFILE };

  async getUserProfile(): Promise<PlayerProfile> {
    return { ...this.profile };
  }

  async updateRating(delta: number): Promise<number> {
    this.profile.rating += delta;
    if (this.profile.rating > this.profile.peakRating) {
      this.profile.peakRating = this.profile.rating;
    }
    return this.profile.rating;
  }

  async getWeaknesses(): Promise<Weakness[]> {
    return [...this.profile.weaknesses];
  }

  async getRecommendations(): Promise<TrainingRecommendation[]> {
    return [...this.profile.recommendations];
  }
}

export const userService = new MockUserService();
