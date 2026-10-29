import { apiClient } from './client';
import { CurriculumModule, Lesson, LessonStep } from '../../types/learning';

export interface CurriculumStats {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
}

export interface RecommendedLessonInfo {
  id: string;
  title: string;
  categoryTitle: string;
  difficulty: string;
  reason: string;
  themeTag?: string | null;
}

export interface CurriculumCatalogResponse {
  modules: CurriculumModule[];
  stats: CurriculumStats;
  recommendedLesson?: RecommendedLessonInfo | null;
}

export interface LessonDetailsResponse {
  lesson: Lesson;
  currentStep: number;
  completed: boolean;
}

export interface StepValidationResult {
  success: boolean;
  correct: boolean;
  nextStepNumber: number | null;
  isLessonCompleted: boolean;
  feedback: string;
}

export interface ValidateStepInput {
  stepNumber: number;
  moveSan?: string;
  moveFrom?: string;
  moveTo?: string;
  selectedOptionId?: string;
}

export const curriculumApi = {
  /**
   * Fetch complete curriculum catalog with persisted user progress.
   */
  async getCatalog(): Promise<CurriculumCatalogResponse> {
    return apiClient<CurriculumCatalogResponse>('/curriculum/catalog');
  },

  /**
   * Fetch single lesson with full steps and resumption status.
   */
  async getLesson(lessonId: string): Promise<LessonDetailsResponse> {
    return apiClient<LessonDetailsResponse>(`/curriculum/lessons/${encodeURIComponent(lessonId)}`);
  },

  /**
   * Authoritatively validate a step move or answer with chess.js backend rules.
   */
  async validateStep(lessonId: string, input: ValidateStepInput): Promise<StepValidationResult> {
    return apiClient<StepValidationResult>(`/curriculum/lessons/${encodeURIComponent(lessonId)}/validate-step`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  /**
   * Reset lesson back to step 1.
   */
  async resetLesson(lessonId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/curriculum/lessons/${encodeURIComponent(lessonId)}/reset`, {
      method: 'POST'
    });
  }
};
