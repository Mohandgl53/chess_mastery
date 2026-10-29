import { CurriculumModule, Lesson } from '../types/learning';
import {
  curriculumApi,
  CurriculumStats,
  RecommendedLessonInfo,
  StepValidationResult,
  ValidateStepInput
} from './api/curriculumApi';

export interface ILearningService {
  getCurriculum(): Promise<CurriculumModule[]>;
  getLessonById(lessonId: string): Promise<Lesson | undefined>;
  getDashboardData?(): Promise<{
    modules: CurriculumModule[];
    stats: CurriculumStats;
    recommendedLesson?: RecommendedLessonInfo | null;
  }>;
  validateStep(lessonId: string, input: ValidateStepInput): Promise<StepValidationResult>;
  resetLesson(lessonId: string): Promise<void>;
  markStepComplete(lessonId: string, stepId: string): Promise<void>;
  markLessonComplete(lessonId: string): Promise<void>;
}

export class ApiLearningService implements ILearningService {
  async getDashboardData() {
    return curriculumApi.getCatalog();
  }

  async getCurriculum(): Promise<CurriculumModule[]> {
    const res = await curriculumApi.getCatalog();
    return res.modules;
  }

  async getLessonById(lessonId: string): Promise<Lesson | undefined> {
    try {
      const res = await curriculumApi.getLesson(lessonId);
      const lesson = res.lesson;
      lesson.currentStep = res.currentStep;
      lesson.completed = res.completed;
      return lesson;
    } catch (err) {
      console.error('[ApiLearningService] Failed to load lesson:', err);
      return undefined;
    }
  }

  async validateStep(lessonId: string, input: ValidateStepInput): Promise<StepValidationResult> {
    return curriculumApi.validateStep(lessonId, input);
  }

  async resetLesson(lessonId: string): Promise<void> {
    await curriculumApi.resetLesson(lessonId);
  }

  async markStepComplete(_lessonId: string, _stepId: string): Promise<void> {
    // In API mode, step progression is validated and recorded through validateStep
  }

  async markLessonComplete(_lessonId: string): Promise<void> {
    // In API mode, lesson completion is atomically recorded on final step validation
  }
}

export const learningService: ILearningService = new ApiLearningService();
