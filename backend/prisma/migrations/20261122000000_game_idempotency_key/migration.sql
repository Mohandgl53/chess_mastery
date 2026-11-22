-- Add a per-user idempotency key so retried client saves cannot create duplicate games.
ALTER TABLE "Game" ADD COLUMN "idempotencyKey" TEXT;

-- NULL keys are allowed (PostgreSQL treats NULLs as distinct in unique indexes),
-- which keeps legacy rows and server-side game creation working.
CREATE UNIQUE INDEX "Game_userId_idempotencyKey_key" ON "Game"("userId", "idempotencyKey");
