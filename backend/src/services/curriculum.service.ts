import { Chess } from 'chess.js';
import {
  curriculumRepository,
  LessonWithSteps
} from '../repositories/curriculum.repository.js';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { ValidateStepInput } from '../validators/curriculum.schemas.js';

export interface FormattedLessonStep {
  id: string;
  stepNumber: number;
  type: string;
  title: string;
  instruction: string;
  explanation: string;
  fen: string;
  turn: string;
  expectedMove?: {
    from: string;
    to: string;
    san: string;
  };
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  coachTip?: string;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
}

export interface FormattedLesson {
  id: string;
  title: string;
  category: string;
  categoryTitle: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  totalSteps: number;
  completed: boolean;
  progressPercent: number;
  currentStep: number;
  themeTag?: string | null;
  steps?: FormattedLessonStep[];
}

export interface FormattedModule {
  id: string;
  title: string;
  subtitle?: string | null;
  description: string;
  iconName: string;
  orderIndex: number;
  lessons: FormattedLesson[];
}

export interface CurriculumDashboardResponse {
  modules: FormattedModule[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
  };
  recommendedLesson?: {
    id: string;
    title: string;
    categoryTitle: string;
    difficulty: string;
    reason: string;
    themeTag?: string | null;
  } | null;
}

export class CurriculumService {
  /**
   * Get complete curriculum catalog annotated with user progress and personalized recommendation.
   */
  async getCatalog(userId: string): Promise<CurriculumDashboardResponse> {
    const modules = await curriculumRepository.getAllActiveModules();
    const progressList = await curriculumRepository.getUserProgressList(userId);
    const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));

    let totalLessons = 0;
    let completedLessons = 0;
    let inProgressLessons = 0;

    const formattedModules: FormattedModule[] = modules.map((mod) => {
      const lessons: FormattedLesson[] = mod.lessons.map((lesson) => {
        totalLessons++;
        const userProg = progressMap.get(lesson.id);
        const totalSteps = lesson.steps.length;
        const completed = userProg?.completed ?? false;
        const currentStep = userProg?.currentStep ?? 1;

        if (completed) {
          completedLessons++;
        } else if (userProg && userProg.currentStep > 1) {
          inProgressLessons++;
        }

        let progressPercent = 0;
        if (completed) {
          progressPercent = 100;
        } else if (totalSteps > 0 && userProg) {
          progressPercent = Math.min(99, Math.round(((currentStep - 1) / totalSteps) * 100));
        }

        return {
          id: lesson.id,
          title: lesson.title,
          category: lesson.category,
          categoryTitle: lesson.categoryTitle,
          description: lesson.description,
          difficulty: lesson.difficulty,
          durationMinutes: lesson.durationMinutes,
          totalSteps,
          completed,
          progressPercent,
          currentStep,
          themeTag: lesson.themeTag
        };
      });

      return {
        id: mod.id,
        title: mod.title,
        subtitle: mod.subtitle,
        description: mod.description,
        iconName: mod.iconName,
        orderIndex: mod.orderIndex,
        lessons
      };
    });

    // Determine targeted recommendation based on player memory weaknesses
    let recommendedLesson: CurriculumDashboardResponse['recommendedLesson'] = null;
    try {
      const profile = await prisma.playerProfile.findUnique({
        where: { userId },
        include: {
          weaknesses: {
            where: { status: 'ACTIVE' },
            orderBy: [{ confidence: 'desc' }, { occurrenceCount: 'desc' }]
          }
        }
      });

      if (profile && profile.weaknesses.length > 0) {
        const topWeakness = profile.weaknesses[0];
        // Find an uncompleted lesson matching this weakness theme
        const flatLessons = formattedModules.flatMap((m) => m.lessons);
        const matchingLesson = flatLessons.find(
          (l) => !l.completed && l.themeTag && l.themeTag.toLowerCase().includes(topWeakness.theme.toLowerCase())
        ) || flatLessons.find(
          (l) => !l.completed && (
            (topWeakness.theme.toLowerCase().includes('pin') && l.id.includes('pin')) ||
            (topWeakness.theme.toLowerCase().includes('fork') && l.id.includes('fork')) ||
            (topWeakness.theme.toLowerCase().includes('center') && l.id.includes('center')) ||
            (topWeakness.theme.toLowerCase().includes('king') && l.id.includes('king'))
          )
        );

        if (matchingLesson) {
          recommendedLesson = {
            id: matchingLesson.id,
            title: matchingLesson.title,
            categoryTitle: matchingLesson.categoryTitle,
            difficulty: matchingLesson.difficulty,
            themeTag: matchingLesson.themeTag,
            reason: `Targeted practice for your identified weakness: ${topWeakness.theme.replace(/_/g, ' ')}`
          };
        }
      }

      // If no weakness-matched lesson found, recommend first uncompleted lesson
      if (!recommendedLesson) {
        const firstUncompleted = formattedModules
          .flatMap((m) => m.lessons)
          .find((l) => !l.completed);

        if (firstUncompleted) {
          recommendedLesson = {
            id: firstUncompleted.id,
            title: firstUncompleted.title,
            categoryTitle: firstUncompleted.categoryTitle,
            difficulty: firstUncompleted.difficulty,
            themeTag: firstUncompleted.themeTag,
            reason: 'Recommended next step in your curriculum'
          };
        }
      }
    } catch (err) {
      console.warn('[CurriculumService] Failed to calculate recommendation:', err);
    }

    return {
      modules: formattedModules,
      stats: {
        totalLessons,
        completedLessons,
        inProgressLessons
      },
      recommendedLesson
    };
  }

  /**
   * Get single lesson with full ordered steps and current user progress.
   */
  async getLessonDetails(userId: string, lessonId: string): Promise<{
    lesson: FormattedLesson;
    currentStep: number;
    completed: boolean;
  }> {
    const rawLesson = await curriculumRepository.getLessonById(lessonId);
    if (!rawLesson) {
      throw new NotFoundError(`Lesson not found: ${lessonId}`);
    }

    const userProg = await curriculumRepository.getUserLessonProgress(userId, lessonId);
    const totalSteps = rawLesson.steps.length;
    const completed = userProg?.completed ?? false;
    const currentStep = userProg ? Math.min(userProg.currentStep, totalSteps) : 1;

    let progressPercent = 0;
    if (completed) {
      progressPercent = 100;
    } else if (totalSteps > 0 && userProg) {
      progressPercent = Math.min(99, Math.round(((currentStep - 1) / totalSteps) * 100));
    }

    const formattedSteps: FormattedLessonStep[] = rawLesson.steps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      type: s.type,
      title: s.title,
      instruction: s.instruction,
      explanation: s.explanation,
      fen: s.fen,
      turn: s.turn,
      expectedMove: s.expectedMoveSan
        ? {
            san: s.expectedMoveSan,
            from: s.expectedMoveFrom || '',
            to: s.expectedMoveTo || ''
          }
        : undefined,
      options: s.options ? (s.options as any) : undefined,
      coachTip: s.coachTip || undefined,
      highlightSquares: s.highlightSquares ? (s.highlightSquares as any) : undefined,
      arrowFromTo: s.arrowFromTo ? (s.arrowFromTo as any) : undefined
    }));

    return {
      lesson: {
        id: rawLesson.id,
        title: rawLesson.title,
        category: rawLesson.category,
        categoryTitle: rawLesson.categoryTitle,
        description: rawLesson.description,
        difficulty: rawLesson.difficulty,
        durationMinutes: rawLesson.durationMinutes,
        totalSteps,
        completed,
        progressPercent,
        currentStep,
        themeTag: rawLesson.themeTag,
        steps: formattedSteps
      },
      currentStep,
      completed
    };
  }

  /**
   * Authoritatively validate a submitted step move or answer using chess.js.
   */
  async validateStep(
    userId: string,
    lessonId: string,
    input: ValidateStepInput
  ): Promise<{
    success: boolean;
    correct: boolean;
    nextStepNumber: number | null;
    isLessonCompleted: boolean;
    feedback: string;
  }> {
    const rawLesson = await curriculumRepository.getLessonById(lessonId);
    if (!rawLesson) {
      throw new NotFoundError(`Lesson not found: ${lessonId}`);
    }

    const step = rawLesson.steps.find((s) => s.stepNumber === input.stepNumber);
    if (!step) {
      throw new NotFoundError(`Step ${input.stepNumber} not found in lesson ${lessonId}`);
    }

    const totalSteps = rawLesson.steps.length;
    let isCorrect = false;
    let feedback = '';

    if (step.type === 'interactive_move') {
      if (!input.moveSan && (!input.moveFrom || !input.moveTo)) {
        throw new BadRequestError('Move SAN or from/to squares are required for interactive move steps');
      }

      // Authoritative chess.js legality check
      let chess: Chess;
      try {
        chess = new Chess(step.fen);
      } catch {
        throw new BadRequestError(`Invalid FEN in lesson step: ${step.fen}`);
      }

      let moveAttempt = null;
      try {
        if (input.moveSan) {
          moveAttempt = chess.move(input.moveSan);
        }
      } catch {
        // Fall back to from/to
      }

      if (!moveAttempt && input.moveFrom && input.moveTo) {
        try {
          moveAttempt = chess.move({
            from: input.moveFrom,
            to: input.moveTo,
            promotion: 'q'
          });
        } catch {
          // Illegal move
        }
      }

      if (!moveAttempt) {
        return {
          success: true,
          correct: false,
          nextStepNumber: null,
          isLessonCompleted: false,
          feedback: 'That move is not legal according to authoritative chess rules. Try again!'
        };
      }

      // Check against expected move
      const matchesSan = step.expectedMoveSan && moveAttempt.san.toLowerCase() === step.expectedMoveSan.toLowerCase();
      const matchesSquares =
        step.expectedMoveFrom &&
        step.expectedMoveTo &&
        moveAttempt.from.toLowerCase() === step.expectedMoveFrom.toLowerCase() &&
        moveAttempt.to.toLowerCase() === step.expectedMoveTo.toLowerCase();

      if (matchesSan || matchesSquares) {
        isCorrect = true;
        feedback = step.explanation;
      } else {
        isCorrect = false;
        feedback = `You played ${moveAttempt.san}. That move is legal, but not the objective of this lesson. ${step.coachTip || 'Look for the primary theme!'}`;
      }
    } else if (step.type === 'question') {
      if (!input.selectedOptionId) {
        throw new BadRequestError('selectedOptionId is required for question steps');
      }

      const options = (step.options as any[]) || [];
      const chosen = options.find((o) => o.id === input.selectedOptionId);

      if (!chosen) {
        throw new BadRequestError(`Invalid option ID: ${input.selectedOptionId}`);
      }

      if (chosen.isCorrect) {
        isCorrect = true;
        feedback = chosen.feedback || step.explanation;
      } else {
        isCorrect = false;
        feedback = chosen.feedback || 'Incorrect option. Try again!';
      }
    } else {
      // Concept or theory step
      isCorrect = true;
      feedback = step.explanation;
    }

    if (!isCorrect) {
      return {
        success: true,
        correct: false,
        nextStepNumber: null,
        isLessonCompleted: false,
        feedback
      };
    }

    // Move is correct: advance progress
    const isLessonCompleted = input.stepNumber >= totalSteps;
    const nextStepNumber = isLessonCompleted ? null : input.stepNumber + 1;
    const stepToPersist = nextStepNumber || input.stepNumber;

    const learningEvidenceData = rawLesson.themeTag
      ? {
          category: (rawLesson.category.toUpperCase() === 'TACTICS' ? 'TACTICS' : 'STRATEGY') as 'TACTICS' | 'STRATEGY',
          theme: rawLesson.themeTag,
          metadata: {
            lessonId: rawLesson.id,
            lessonTitle: rawLesson.title,
            completedAt: new Date().toISOString()
          }
        }
      : undefined;

    await curriculumRepository.recordStepProgressAtomic({
      userId,
      lessonId,
      stepNumber: stepToPersist,
      markCompleted: isLessonCompleted,
      learningEvidence: learningEvidenceData
    });

    return {
      success: true,
      correct: true,
      nextStepNumber,
      isLessonCompleted,
      feedback
    };
  }

  /**
   * Reset lesson back to step 1 for review.
   */
  async resetLesson(userId: string, lessonId: string) {
    const rawLesson = await curriculumRepository.getLessonById(lessonId);
    if (!rawLesson) {
      throw new NotFoundError(`Lesson not found: ${lessonId}`);
    }

    return curriculumRepository.resetLessonProgress(userId, lessonId);
  }
}

export const curriculumService = new CurriculumService();
