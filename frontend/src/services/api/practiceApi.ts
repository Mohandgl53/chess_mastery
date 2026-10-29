import { apiClient } from './client';

export interface PracticePuzzleData {
  id: string;
  title: string;
  theme: string;
  rating: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  fen: string;
  playerColor: 'w' | 'b';
  hints: Array<{ level: number; title: string; description: string; highlightSquares?: string[] }>;
  tacticalExplanation?: string;
  coachInsight?: string;
}

export interface PracticeSessionData {
  id: string;
  playerId: string;
  sessionType: 'ADAPTIVE' | 'THEME_DRILL' | 'WEAKNESS_REVIEW' | 'DAILY_TRAINING';
  targetTheme: string;
  plannedItemCount: number;
  completedItemCount: number;
  correctCount: number;
  incorrectCount: number;
  averageDifficulty: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string | null;
  attempts?: Array<{
    id: string;
    puzzleId: string;
    result: 'CORRECT' | 'INCORRECT' | 'ABANDONED';
    timeSpentMs: number;
    usedHint: boolean;
  }>;
}

export interface PracticeDashboardData {
  todayPlan: {
    targetTheme: string;
    themeTitle: string;
    reason: string;
    sessionType: 'ADAPTIVE' | 'THEME_DRILL' | 'WEAKNESS_REVIEW' | 'DAILY_TRAINING';
    plannedItemCount: number;
    initialDifficulty: number;
    isSpacedReview: boolean;
    priorityScore: number;
  };
  activeSession: PracticeSessionData | null;
  recentSessions: PracticeSessionData[];
  themeMasteries: ThemeMasteryData[];
  topRecommendations: Array<{
    id: string;
    category: string;
    theme?: string | null;
    title: string;
    description: string;
    priority: number;
    status: string;
  }>;
}

export interface ThemeMasteryData {
  id: string;
  playerId: string;
  theme: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  masteryScore: number;
  recentAccuracy: number;
  currentDifficulty: number;
  currentStreak: number;
  bestStreak: number;
  lastAttemptedAt: string | null;
  lastCorrectAt: string | null;
  nextReviewAt: string | null;
  isDueForReview?: boolean;
}

export interface StartSessionResponse {
  session: PracticeSessionData;
  puzzle: PracticePuzzleData | null;
}

export interface RecordAttemptResponse {
  attemptId: string;
  result: 'CORRECT' | 'INCORRECT';
  isCorrect: boolean;
  completedItemCount: number;
  correctCount: number;
  incorrectCount: number;
  sessionStatus: 'IN_PROGRESS' | 'COMPLETED';
  masteryUpdate: {
    theme: string;
    masteryScore: number;
    accuracy: number;
    streak: number;
    currentDifficulty: number;
    nextReviewAt: string;
  };
  feedback: {
    title: string;
    message: string;
    objectiveCorrectMove: string;
    tacticalExplanation?: string;
    coachInsight?: string;
  };
  nextPuzzle: PracticePuzzleData | null;
}

export interface CompleteSessionResponse {
  message: string;
  session: PracticeSessionData;
  summary: {
    theme: string;
    completedItems: number;
    accuracy: number;
    masteryScore: number;
  };
}

export const practiceApi = {
  /**
   * Get practice dashboard overview, today's adaptive plan, active session, and masteries
   */
  async getDashboard(): Promise<PracticeDashboardData> {
    return apiClient<PracticeDashboardData>('/practice/dashboard');
  },

  /**
   * Start a new practice session (or resume active if one already exists)
   */
  async startSession(theme?: string, count: number = 5): Promise<StartSessionResponse> {
    return apiClient<StartSessionResponse>('/practice/sessions', {
      method: 'POST',
      body: JSON.stringify({
        theme: theme || undefined,
        itemCount: count
      })
    });
  },

  /**
   * Get an existing session by ID
   */
  async getSession(sessionId: string): Promise<PracticeSessionData> {
    return apiClient<PracticeSessionData>(`/practice/sessions/${sessionId}`);
  },

  /**
   * Record a puzzle attempt
   */
  async recordAttempt(
    sessionId: string,
    data: {
      puzzleId: string;
      moveSan: string;
      from?: string;
      to?: string;
      promotion?: string;
      timeSpentMs?: number;
      usedHint?: boolean;
      hintCount?: number;
    }
  ): Promise<RecordAttemptResponse> {
    return apiClient<RecordAttemptResponse>(`/practice/sessions/${sessionId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Complete the session
   */
  async completeSession(sessionId: string): Promise<CompleteSessionResponse> {
    return apiClient<CompleteSessionResponse>(`/practice/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  /**
   * Get theme mastery records for the player
   */
  async getMastery(): Promise<ThemeMasteryData[]> {
    const res = await apiClient<{ masteries?: ThemeMasteryData[] } | ThemeMasteryData[]>('/practice/mastery');
    if (Array.isArray(res)) return res;
    return res?.masteries || [];
  }
};
