-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Global 🌐';
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "preferredStyle" TEXT DEFAULT 'Tactical';
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "favoriteOpening" TEXT DEFAULT 'Italian Game';
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "favoriteOpeningBlack" TEXT DEFAULT 'Sicilian Defense';
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "flair" TEXT DEFAULT '♟️';
ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "statusMessage" TEXT DEFAULT 'Ready to play & learn chess';
