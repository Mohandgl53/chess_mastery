export interface Weakness {
  id: string;
  type: string;
  title: string;
  description: string;
  occurrences: number;
  lastDetected: string;
  severity: 'low' | 'medium' | 'high';
  recommendedTrainingId: string;
  recommendedTrainingTitle: string;
}

export interface Strength {
  id: string;
  title: string;
  description: string;
  ratingImpact: number;
}

export interface SkillProfile {
  openings: number; // 0-100
  tactics: number;
  middlegame: number;
  endgame: number;
  calculation: number;
  timeManagement: number;
}

export interface TrainingRecommendation {
  id: string;
  title: string;
  category: 'opening' | 'tactics' | 'middlegame' | 'endgame' | 'practice';
  reason: string;
  targetWeakness: string;
  durationMinutes: number;
  route: string;
}

export interface CoachMemory {
  totalGamesAnalyzed: number;
  primaryWeakness: string;
  primaryStrength: string;
  recentObservations: string[];
  lastCoachingTip: string;
}

export interface RatingHistoryEntry {
  date: string;
  rating: number;
  delta: number;
  opponent: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
}

export interface PlayerProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  preferredStyle?: 'Tactical' | 'Positional' | 'Universal';
  favoriteOpening?: string;
  rating: number;
  peakRating: number;
  winCount: number;
  lossCount: number;
  drawCount: number;
  streakDays: number;
  ratingHistory?: RatingHistoryEntry[];
  skills: SkillProfile;
  weaknesses: Weakness[];
  strengths: Strength[];
  recommendations: TrainingRecommendation[];
  coachMemory: CoachMemory;
}
