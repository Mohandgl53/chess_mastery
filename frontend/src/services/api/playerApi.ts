import { apiClient } from './client';

export interface BackendPlayerProfile {
  id: string;
  userId: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
  tacticsSkill: number;
  calculationSkill: number;
  openingSkill: number;
  middlegameSkill: number;
  endgameSkill: number;
  positionalSkill: number;
  kingSafetySkill: number;
  pieceCoordinationSkill: number;
  pawnStructureSkill: number;
  timeManagementSkill: number;
  blunderPreventionSkill: number;
  overallTrainingScore: number;
  gamesAnalyzed: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
  lessonsCompleted: number;
  totalBlunders: number;
  totalMistakes: number;
  totalInaccuracies: number;
  lastAnalyzedAt: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  preferredStyle?: string | null;
  favoriteOpening?: string | null;
  favoriteOpeningBlack?: string | null;
  flair?: string | null;
  statusMessage?: string | null;
}

export interface BackendWeakness {
  id: string;
  playerId: string;
  category: string;
  theme: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  evidenceCount: number;
  occurrenceCount: number;
  status: 'ACTIVE' | 'IMPROVING' | 'RESOLVED';
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface BackendStrength {
  id: string;
  playerId: string;
  category: string;
  theme: string;
  title: string;
  description: string;
  confidence: number;
  evidenceCount: number;
  occurrenceCount: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface BackendSkillSnapshot {
  id: string;
  playerId: string;
  overall: number;
  tactics: number;
  calculation: number;
  opening: number;
  middlegame: number;
  endgame: number;
  positional: number;
  kingSafety: number;
  pieceCoordination: number;
  pawnStructure: number;
  timeManagement: number;
  blunderPrevention: number;
  gamesAnalyzed: number;
  createdAt: string;
}

export interface BackendRecommendation {
  id: string;
  playerId: string;
  type: string;
  category: string;
  theme: string;
  priority: number;
  title: string;
  reason: string;
  targetSkill: string;
  estimatedDifficulty: string;
  source: string;
  status: string;
  metadata?: {
    actionVerb?: string;
    weaknessId?: string;
    occurrenceCount?: number;
  };
}

export interface BackendLearningEvidence {
  id: string;
  playerId: string;
  gameId?: string;
  category: string;
  theme: string;
  evidenceType: 'POSITIVE' | 'NEGATIVE';
  severity: string;
  engineEvaluationDelta?: number;
  classification?: string;
  phase?: string;
  moveSan?: string;
  createdAt: string;
}

export interface PlayerProgressData {
  profile: BackendPlayerProfile;
  weaknesses: BackendWeakness[];
  strengths: BackendStrength[];
  recommendations: BackendRecommendation[];
  snapshots: BackendSkillSnapshot[];
  recentEvidence: BackendLearningEvidence[];
  totalGamesCount: number;
  isSufficientData: boolean;
}

export const playerApi = {
  async getProgress(): Promise<PlayerProgressData> {
    const res = await apiClient<{ success: boolean; data: PlayerProgressData }>('/player/progress');
    return res.data;
  },

  async getProfile(): Promise<BackendPlayerProfile> {
    const res = await apiClient<{ success: boolean; data: BackendPlayerProfile }>('/player/profile');
    return res.data;
  },

  async getWeaknesses(status?: string): Promise<BackendWeakness[]> {
    const query = status ? `?status=${status}` : '';
    const res = await apiClient<{ success: boolean; data: BackendWeakness[] }>(`/player/weaknesses${query}`);
    return res.data;
  },

  async getStrengths(): Promise<BackendStrength[]> {
    const res = await apiClient<{ success: boolean; data: BackendStrength[] }>('/player/strengths');
    return res.data;
  },

  async getRecommendations(): Promise<BackendRecommendation[]> {
    const res = await apiClient<{ success: boolean; data: BackendRecommendation[] }>('/player/recommendations');
    return res.data;
  },

  async completeRecommendation(id: string): Promise<BackendRecommendation> {
    const res = await apiClient<{ success: boolean; data: BackendRecommendation }>(
      `/player/recommendations/${id}/complete`,
      { method: 'POST' }
    );
    return res.data;
  },

  async processGame(gameId: string): Promise<{ processed: boolean; evidenceCreated: number; profile: any }> {
    const res = await apiClient<{ success: boolean; data: any }>(`/player/process-game/${gameId}`, {
      method: 'POST'
    });
    return res.data;
  },

  async recalculate(): Promise<any> {
    const res = await apiClient<{ success: boolean; data: any }>('/player/recalculate', {
      method: 'POST'
    });
    return res.data;
  },

  async updateProfile(payload: {
    displayName?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    country?: string | null;
    preferredStyle?: string | null;
    favoriteOpening?: string | null;
    favoriteOpeningBlack?: string | null;
    flair?: string | null;
    statusMessage?: string | null;
  }): Promise<{ profile: BackendPlayerProfile; user?: any }> {
    const res = await apiClient<{ success: boolean; data: { profile: BackendPlayerProfile; user?: any } }>(
      '/player/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }
    );
    return res.data;
  }
};
