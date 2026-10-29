-- Phase 6 Migration: Player Memory, Skill Profiling & Adaptive Learning

-- 1. Create Phase 6 Enums
CREATE TYPE "EvidenceType" AS ENUM ('POSITIVE', 'NEGATIVE');
CREATE TYPE "EvidenceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "WeaknessStatus" AS ENUM ('ACTIVE', 'IMPROVING', 'RESOLVED');
CREATE TYPE "RecommendationType" AS ENUM ('LESSON', 'PUZZLE', 'PRACTICE', 'OPENING_REVIEW', 'ENDGAME_REVIEW', 'GAME_ANALYSIS', 'CONCEPT_REVIEW');
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- 2. Extend PlayerProfile with Skill Dimensions and Learning Metrics
ALTER TABLE "PlayerProfile"
  ADD COLUMN "tacticsSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "calculationSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "openingSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "middlegameSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "endgameSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "positionalSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "kingSafetySkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "pieceCoordinationSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "pawnStructureSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "timeManagementSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "blunderPreventionSkill" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "overallTrainingScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  ADD COLUMN "gamesAnalyzed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "puzzlesSolved" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "puzzlesAttempted" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalBlunders" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalMistakes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalInaccuracies" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAnalyzedAt" TIMESTAMP(3);

-- 3. Add Idempotency Processing Marker to Game
ALTER TABLE "Game"
  ADD COLUMN "learningProcessedAt" TIMESTAMP(3);

-- 4. Create LearningEvidence Table
CREATE TABLE "LearningEvidence" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "gameId" TEXT,
  "gameMoveId" TEXT,
  "category" "KnowledgeCategory" NOT NULL,
  "theme" TEXT NOT NULL,
  "evidenceType" "EvidenceType" NOT NULL,
  "severity" "EvidenceSeverity" NOT NULL DEFAULT 'MEDIUM',
  "engineEvaluationDelta" DOUBLE PRECISION,
  "classification" "MoveClassification",
  "phase" TEXT,
  "opening" TEXT,
  "moveSan" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LearningEvidence_pkey" PRIMARY KEY ("id")
);

-- 5. Create Weakness Table
CREATE TABLE "Weakness" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "category" "KnowledgeCategory" NOT NULL,
  "theme" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "EvidenceSeverity" NOT NULL DEFAULT 'MEDIUM',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "evidenceCount" INTEGER NOT NULL DEFAULT 1,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "status" "WeaknessStatus" NOT NULL DEFAULT 'ACTIVE',
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,

  CONSTRAINT "Weakness_pkey" PRIMARY KEY ("id")
);

-- 6. Create Strength Table
CREATE TABLE "Strength" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "category" "KnowledgeCategory" NOT NULL,
  "theme" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "evidenceCount" INTEGER NOT NULL DEFAULT 1,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "Strength_pkey" PRIMARY KEY ("id")
);

-- 7. Create SkillSnapshot Table
CREATE TABLE "SkillSnapshot" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "overall" DOUBLE PRECISION NOT NULL,
  "tactics" DOUBLE PRECISION NOT NULL,
  "calculation" DOUBLE PRECISION NOT NULL,
  "opening" DOUBLE PRECISION NOT NULL,
  "middlegame" DOUBLE PRECISION NOT NULL,
  "endgame" DOUBLE PRECISION NOT NULL,
  "positional" DOUBLE PRECISION NOT NULL,
  "kingSafety" DOUBLE PRECISION NOT NULL,
  "pieceCoordination" DOUBLE PRECISION NOT NULL,
  "pawnStructure" DOUBLE PRECISION NOT NULL,
  "timeManagement" DOUBLE PRECISION NOT NULL,
  "blunderPrevention" DOUBLE PRECISION NOT NULL,
  "gamesAnalyzed" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SkillSnapshot_pkey" PRIMARY KEY ("id")
);

-- 8. Create TrainingRecommendation Table
CREATE TABLE "TrainingRecommendation" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "type" "RecommendationType" NOT NULL DEFAULT 'PUZZLE',
  "category" "KnowledgeCategory" NOT NULL,
  "theme" TEXT NOT NULL,
  "priority" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "targetSkill" TEXT NOT NULL,
  "estimatedDifficulty" "KnowledgeDifficulty" NOT NULL DEFAULT 'INTERMEDIATE',
  "source" TEXT,
  "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "TrainingRecommendation_pkey" PRIMARY KEY ("id")
);

-- 9. Create Indexes and Constraints
CREATE INDEX "LearningEvidence_playerId_category_idx" ON "LearningEvidence"("playerId", "category");
CREATE INDEX "LearningEvidence_playerId_theme_idx" ON "LearningEvidence"("playerId", "theme");
CREATE INDEX "LearningEvidence_playerId_createdAt_idx" ON "LearningEvidence"("playerId", "createdAt");
CREATE INDEX "LearningEvidence_gameId_idx" ON "LearningEvidence"("gameId");

CREATE UNIQUE INDEX "Weakness_playerId_theme_key" ON "Weakness"("playerId", "theme");
CREATE INDEX "Weakness_playerId_status_idx" ON "Weakness"("playerId", "status");
CREATE INDEX "Weakness_playerId_category_idx" ON "Weakness"("playerId", "category");

CREATE UNIQUE INDEX "Strength_playerId_theme_key" ON "Strength"("playerId", "theme");
CREATE INDEX "Strength_playerId_category_idx" ON "Strength"("playerId", "category");

CREATE INDEX "SkillSnapshot_playerId_createdAt_idx" ON "SkillSnapshot"("playerId", "createdAt");

CREATE INDEX "TrainingRecommendation_playerId_status_priority_idx" ON "TrainingRecommendation"("playerId", "status", "priority");
CREATE INDEX "TrainingRecommendation_playerId_theme_idx" ON "TrainingRecommendation"("playerId", "theme");

-- 10. Foreign Keys
ALTER TABLE "LearningEvidence" ADD CONSTRAINT "LearningEvidence_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningEvidence" ADD CONSTRAINT "LearningEvidence_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Weakness" ADD CONSTRAINT "Weakness_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Strength" ADD CONSTRAINT "Strength_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkillSnapshot" ADD CONSTRAINT "SkillSnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingRecommendation" ADD CONSTRAINT "TrainingRecommendation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
