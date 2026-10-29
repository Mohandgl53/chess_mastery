-- CreateEnum
CREATE TYPE "OpponentType" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "PlayerColor" AS ENUM ('WHITE', 'BLACK');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'RESIGNED', 'DRAW');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MoveClassification" AS ENUM ('BEST', 'EXCELLENT', 'GOOD', 'BOOK', 'INACCURACY', 'MISTAKE', 'BLUNDER', 'MISSED_WIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 800,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesDrawn" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "opponentType" "OpponentType" NOT NULL DEFAULT 'AI',
    "playerColor" "PlayerColor" NOT NULL DEFAULT 'WHITE',
    "result" "GameResult" NOT NULL DEFAULT 'UNKNOWN',
    "status" "GameStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "openingName" TEXT,
    "openingEco" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "finalFen" TEXT,
    "pgn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMove" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "san" TEXT NOT NULL,
    "uci" TEXT,
    "fen" TEXT NOT NULL,
    "evaluation" DOUBLE PRECISION,
    "isMate" BOOLEAN NOT NULL DEFAULT false,
    "mateIn" INTEGER,
    "classification" "MoveClassification",
    "explanation" TEXT,
    "timeSpentSeconds" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalysis" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "engineName" TEXT NOT NULL DEFAULT 'Stockfish',
    "engineVersion" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracyWhite" DOUBLE PRECISION,
    "accuracyBlack" DOUBLE PRECISION,
    "summary" TEXT,
    "details" JSONB,
    "analysisVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "Game_userId_createdAt_idx" ON "Game"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameMove_gameId_ply_idx" ON "GameMove"("gameId", "ply");

-- CreateIndex
CREATE UNIQUE INDEX "GameAnalysis_gameId_key" ON "GameAnalysis"("gameId");

-- CreateIndex
CREATE INDEX "GameAnalysis_gameId_idx" ON "GameAnalysis"("gameId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMove" ADD CONSTRAINT "GameMove_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
