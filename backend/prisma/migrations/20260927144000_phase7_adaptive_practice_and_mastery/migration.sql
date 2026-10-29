-- Phase 7 Migration: Adaptive Practice, Theme Mastery & Puzzle System

-- 1. Create Enums for Phase 7 Practice
DO $$ BEGIN
  CREATE TYPE "PracticeSessionType" AS ENUM ('ADAPTIVE', 'THEME_DRILL', 'WEAKNESS_REVIEW', 'DAILY_TRAINING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttemptResult" AS ENUM ('CORRECT', 'INCORRECT', 'ABANDONED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Extend LearningEvidence with practiceAttemptId
ALTER TABLE "LearningEvidence"
  ADD COLUMN IF NOT EXISTS "practiceAttemptId" TEXT;

-- 3. Create PracticeSession Table
CREATE TABLE IF NOT EXISTS "PracticeSession" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sessionType" "PracticeSessionType" NOT NULL DEFAULT 'ADAPTIVE',
  "targetTheme" TEXT NOT NULL,
  "plannedItemCount" INTEGER NOT NULL DEFAULT 5,
  "completedItemCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "averageDifficulty" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PracticeSession_playerId_status_idx" ON "PracticeSession"("playerId", "status");
CREATE INDEX IF NOT EXISTS "PracticeSession_playerId_startedAt_idx" ON "PracticeSession"("playerId", "startedAt");

-- 4. Create PracticeAttempt Table
CREATE TABLE IF NOT EXISTS "PracticeAttempt" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "puzzleId" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "difficultyRating" INTEGER NOT NULL DEFAULT 1000,
  "result" "AttemptResult" NOT NULL,
  "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
  "usedHint" BOOLEAN NOT NULL DEFAULT false,
  "hintCount" INTEGER NOT NULL DEFAULT 0,
  "moveCount" INTEGER NOT NULL DEFAULT 1,
  "attemptedMoveSan" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeAttempt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PracticeAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PracticeAttempt_playerId_theme_idx" ON "PracticeAttempt"("playerId", "theme");
CREATE INDEX IF NOT EXISTS "PracticeAttempt_sessionId_idx" ON "PracticeAttempt"("sessionId");
CREATE INDEX IF NOT EXISTS "PracticeAttempt_playerId_attemptedAt_idx" ON "PracticeAttempt"("playerId", "attemptedAt");

-- 5. Create ThemeMastery Table
CREATE TABLE IF NOT EXISTS "ThemeMastery" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  "recentAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "currentDifficulty" INTEGER NOT NULL DEFAULT 1000,
  "lastAttemptedAt" TIMESTAMP(3),
  "lastCorrectAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThemeMastery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ThemeMastery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeMastery_playerId_theme_key" ON "ThemeMastery"("playerId", "theme");
CREATE INDEX IF NOT EXISTS "ThemeMastery_playerId_nextReviewAt_idx" ON "ThemeMastery"("playerId", "nextReviewAt");

-- 6. Create Puzzle Table
CREATE TABLE IF NOT EXISTS "Puzzle" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 1000,
  "difficulty" TEXT NOT NULL DEFAULT 'Medium',
  "fen" TEXT NOT NULL,
  "playerColor" TEXT NOT NULL DEFAULT 'w',
  "solutionMoves" JSONB NOT NULL,
  "hints" JSONB NOT NULL,
  "tacticalExplanation" TEXT NOT NULL,
  "coachInsight" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Puzzle_theme_rating_idx" ON "Puzzle"("theme", "rating");
CREATE INDEX IF NOT EXISTS "Puzzle_theme_isActive_idx" ON "Puzzle"("theme", "isActive");
