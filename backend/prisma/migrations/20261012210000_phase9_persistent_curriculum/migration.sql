-- Phase 9 Migration: Persistent Curriculum & Adaptive Learning Loop Integration

-- 1. Create CurriculumModule Table
CREATE TABLE IF NOT EXISTS "CurriculumModule" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT NOT NULL,
  "iconName" TEXT NOT NULL DEFAULT 'BookOpen',
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CurriculumModule_pkey" PRIMARY KEY ("id")
);

-- 2. Create Lesson Table
CREATE TABLE IF NOT EXISTS "Lesson" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "categoryTitle" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL DEFAULT 'Beginner',
  "durationMinutes" INTEGER NOT NULL DEFAULT 10,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "themeTag" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Lesson_moduleId_orderIndex_idx" ON "Lesson"("moduleId", "orderIndex");
CREATE INDEX IF NOT EXISTS "Lesson_themeTag_idx" ON "Lesson"("themeTag");
CREATE INDEX IF NOT EXISTS "Lesson_isActive_idx" ON "Lesson"("isActive");

-- 3. Create LessonStep Table
CREATE TABLE IF NOT EXISTS "LessonStep" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "fen" TEXT NOT NULL,
  "turn" TEXT NOT NULL DEFAULT 'w',
  "expectedMoveSan" TEXT,
  "expectedMoveFrom" TEXT,
  "expectedMoveTo" TEXT,
  "options" JSONB,
  "coachTip" TEXT,
  "highlightSquares" JSONB,
  "arrowFromTo" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonStep_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LessonStep_lessonId_stepNumber_key" ON "LessonStep"("lessonId", "stepNumber");
CREATE INDEX IF NOT EXISTS "LessonStep_lessonId_idx" ON "LessonStep"("lessonId");

-- 4. Create UserLessonProgress Table
CREATE TABLE IF NOT EXISTS "UserLessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "lastInteractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "UserLessonProgress_userId_completed_idx" ON "UserLessonProgress"("userId", "completed");
CREATE INDEX IF NOT EXISTS "UserLessonProgress_lessonId_idx" ON "UserLessonProgress"("lessonId");
