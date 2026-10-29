-- Phase 5: RAG Knowledge Layer
-- Enable pgvector extension (already installed, ensure it is tracked)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- KnowledgeCategory enum
DO $$ BEGIN
  CREATE TYPE "KnowledgeCategory" AS ENUM (
    'OPENING',
    'MIDDLEGAME',
    'ENDGAME',
    'TACTICS',
    'STRATEGY',
    'PAWN_STRUCTURE',
    'PIECE_COORDINATION',
    'KING_SAFETY',
    'CALCULATION',
    'PSYCHOLOGY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- KnowledgeDifficulty enum
DO $$ BEGIN
  CREATE TYPE "KnowledgeDifficulty" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'MASTER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- KnowledgeChunk table
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "content"        TEXT NOT NULL,
  "contentHash"    TEXT NOT NULL,
  "category"       "KnowledgeCategory" NOT NULL,
  "difficulty"     "KnowledgeDifficulty" NOT NULL DEFAULT 'INTERMEDIATE',
  "tags"           TEXT[] NOT NULL DEFAULT '{}',
  "source"         TEXT,
  "openingEco"     TEXT,
  "embedding"      vector(1536),
  "embeddingModel" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeChunk_contentHash_key"
  ON "KnowledgeChunk"("contentHash");

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_category_idx"
  ON "KnowledgeChunk"("category");

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_difficulty_idx"
  ON "KnowledgeChunk"("difficulty");

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_openingEco_idx"
  ON "KnowledgeChunk"("openingEco");

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE "KnowledgeChunk"
  ADD COLUMN IF NOT EXISTS "fullTextVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("title", '') || ' ' || coalesce("content", '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_fulltext_gin_idx"
  ON "KnowledgeChunk" USING gin("fullTextVector");

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_title_trgm_idx"
  ON "KnowledgeChunk" USING gin("title" gin_trgm_ops);
