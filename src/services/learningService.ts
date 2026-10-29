import { CurriculumModule, Lesson } from '../types/learning';
import { MOCK_CURRICULUM } from '../mock/mockLessons';
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

  async markStepComplete(lessonId: string, stepId: string): Promise<void> {
    // In API mode, step progression is validated and recorded through validateStep
  }

  async markLessonComplete(lessonId: string): Promise<void> {
    // In API mode, lesson completion is atomically recorded on final step validation
  }
}

export class MockLearningService implements ILearningService {
  private curriculum: CurriculumModule[] = JSON.parse(JSON.stringify(MOCK_CURRICULUM));

  async getCurriculum(): Promise<CurriculumModule[]> {
    return this.curriculum;
  }

  async getLessonById(lessonId: string): Promise<Lesson | undefined> {
    for (const mod of this.curriculum) {
      const lesson = mod.lessons.find((l) => l.id === lessonId);
      if (lesson) return lesson;
    }
    return undefined;
  }

  async validateStep(lessonId: string, input: ValidateStepInput): Promise<StepValidationResult> {
    const lesson = await this.getLessonById(lessonId);
    if (!lesson) {
      return {
        success: false,
        correct: false,
        nextStepNumber: null,
        isLessonCompleted: false,
        feedback: 'Lesson not found'
      };
    }

    const step = lesson.steps.find((s) => s.stepNumber === input.stepNumber);
    if (!step) {
      return {
        success: false,
        correct: false,
        nextStepNumber: null,
        isLessonCompleted: false,
        feedback: 'Step not found'
      };
    }

    const isLast = input.stepNumber >= lesson.totalSteps;
    const nextStep = isLast ? null : input.stepNumber + 1;

    if (isLast) {
      lesson.completed = true;
      lesson.progressPercent = 100;
    } else {
      lesson.progressPercent = Math.round((input.stepNumber / lesson.totalSteps) * 100);
    }

    return {
      success: true,
      correct: true,
      nextStepNumber: nextStep,
      isLessonCompleted: isLast,
      feedback: step.explanation
    };
  }

  async resetLesson(lessonId: string): Promise<void> {
    const lesson = await this.getLessonById(lessonId);
    if (lesson) {
      lesson.progressPercent = 0;
      lesson.currentStep = 1;
    }
  }

  async markStepComplete(lessonId: string, stepId: string): Promise<void> {
    const lesson = await this.getLessonById(lessonId);
    if (lesson) {
      const stepIndex = lesson.steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        const progress = Math.round(((stepIndex + 1) / lesson.totalSteps) * 100);
        lesson.progressPercent = Math.max(lesson.progressPercent || 0, progress);
        if (progress >= 100) {
          lesson.completed = true;
        }
      }
    }
  }

  async markLessonComplete(lessonId: string): Promise<void> {
    const lesson = await this.getLessonById(lessonId);
    if (lesson) {
      lesson.completed = true;
      lesson.progressPercent = 100;
    }
  }
}

// Select learning service based on VITE_DATA_MODE:
// - 'api': ApiLearningService connects to backend PostgreSQL curriculum
// - 'mock': MockLearningService runs in-memory
const isApiMode = import.meta.env.VITE_DATA_MODE === 'api';

export const learningService: ILearningService = isApiMode
  ? new ApiLearningService()
  : new MockLearningService();
