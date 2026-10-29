import { prisma } from '../config/database.js';
import {
  CurriculumModule,
  Lesson,
  LessonStep,
  UserLessonProgress
} from '@prisma/client';

export type LessonWithSteps = Lesson & {
  steps: LessonStep[];
};

export type ModuleWithLessonsAndSteps = CurriculumModule & {
  lessons: (Lesson & {
    steps: LessonStep[];
  })[];
};

export class CurriculumRepository {
  /**
   * Fetch all active curriculum modules with their nested lessons and steps.
   */
  async getAllActiveModules(): Promise<ModuleWithLessonsAndSteps[]> {
    return prisma.curriculumModule.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });
  }

  /**
   * Fetch a single lesson by ID with all its steps ordered.
   */
  async getLessonById(lessonId: string): Promise<LessonWithSteps | null> {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });
  }

  /**
   * Fetch all progress records for a user.
   */
  async getUserProgressList(userId: string): Promise<UserLessonProgress[]> {
    return prisma.userLessonProgress.findMany({
      where: { userId }
    });
  }

  /**
   * Fetch progress for a specific lesson and user.
   */
  async getUserLessonProgress(userId: string, lessonId: string): Promise<UserLessonProgress | null> {
    return prisma.userLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      }
    });
  }

  /**
   * Upsert step progress for a user and lesson.
  /**
   * Atomically upsert lesson progress, update player lessonsCompleted counter,
   * and log learning evidence within a single database transaction.
   */
  async recordStepProgressAtomic(params: {
    userId: string;
    lessonId: string;
    stepNumber: number;
    markCompleted: boolean;
    learningEvidence?: {
      category: 'TACTICS' | 'STRATEGY';
      theme: string;
      metadata: Record<string, any>;
    };
  }): Promise<{ progress: UserLessonProgress; isFirstCompletion: boolean }> {
    return prisma.$transaction(async (tx) => {
      // Acquire pessimistic row lock on the user record to guarantee serialized execution for concurrent requests
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${params.userId} FOR UPDATE`;

      const existing = await tx.userLessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId: params.userId,
            lessonId: params.lessonId
          }
        }
      });

      const isFirstCompletion = params.markCompleted && (!existing || !existing.completed);

      const progress = await tx.userLessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId: params.userId,
            lessonId: params.lessonId
          }
        },
        update: {
          currentStep: params.stepNumber,
          completed: params.markCompleted ? true : (existing ? existing.completed : false),
          completedAt: params.markCompleted ? (existing?.completedAt || new Date()) : (existing?.completedAt ?? null),
          lastInteractedAt: new Date()
        },
        create: {
          userId: params.userId,
          lessonId: params.lessonId,
          currentStep: params.stepNumber,
          completed: params.markCompleted,
          completedAt: params.markCompleted ? new Date() : null,
          lastInteractedAt: new Date()
        }
      });

      if (isFirstCompletion) {
        let profile = await tx.playerProfile.findUnique({
          where: { userId: params.userId }
        });

        if (!profile) {
          profile = await tx.playerProfile.create({
            data: {
              userId: params.userId,
              lessonsCompleted: 1
            }
          });
        } else {
          profile = await tx.playerProfile.update({
            where: { id: profile.id },
            data: {
              lessonsCompleted: { increment: 1 }
            }
          });
        }

        if (params.learningEvidence) {
          await tx.learningEvidence.create({
            data: {
              playerId: profile.id,
              category: params.learningEvidence.category,
              theme: params.learningEvidence.theme,
              evidenceType: 'POSITIVE',
              severity: 'LOW',
              phase: 'OPENING',
              metadata: params.learningEvidence.metadata
            }
          });
        }
      }

      return { progress, isFirstCompletion };
    });
  }

  /**
   * Upsert step progress for a user and lesson.
   * If markCompleted is true, also marks completed = true and records completedAt.
   */
  async upsertLessonProgress(
    userId: string,
    lessonId: string,
    stepNumber: number,
    markCompleted: boolean
  ): Promise<{ progress: UserLessonProgress; isFirstCompletion: boolean }> {
    return this.recordStepProgressAtomic({
      userId,
      lessonId,
      stepNumber,
      markCompleted
    });
  }

  /**
   * Atomically increment player profile lessonsCompleted counter.
   */
  async incrementPlayerLessonsCompleted(userId: string): Promise<void> {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId }
    });

    if (profile) {
      await prisma.playerProfile.update({
        where: { id: profile.id },
        data: {
          lessonsCompleted: { increment: 1 }
        }
      });
    }
  }

  /**
   * Reset lesson step progress to 1 for a user.
   */
  async resetLessonProgress(userId: string, lessonId: string): Promise<UserLessonProgress> {
    return prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        currentStep: 1,
        lastInteractedAt: new Date()
      },
      create: {
        userId,
        lessonId,
        currentStep: 1,
        completed: false,
        lastInteractedAt: new Date()
      }
    });
  }
}

export const curriculumRepository = new CurriculumRepository();
