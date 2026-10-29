-- Phase 5 Migration: Change vector dimension from 1536 to native 768 for nomic-embed-text
-- 1. Drop existing HNSW index
DROP INDEX IF EXISTS "KnowledgeChunk_embedding_hnsw_idx";

-- 2. Clear incompatible 1536-dimensional mock vectors before changing column type
UPDATE "KnowledgeChunk" SET "embedding" = NULL, "embeddingModel" = NULL;

-- 3. Alter column type to vector(768)
ALTER TABLE "KnowledgeChunk" ALTER COLUMN "embedding" TYPE vector(768);

-- 4. Recreate HNSW index for vector(768) with cosine distance
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx"
ON "KnowledgeChunk"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
