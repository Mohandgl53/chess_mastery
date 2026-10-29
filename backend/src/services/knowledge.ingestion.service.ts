/**
 * Phase 5: Knowledge Ingestion Service
 *
 * Handles adding new KnowledgeChunks to the RAG knowledge base.
 * - Generates embeddings via the configured IEmbeddingProvider
 * - Deduplicates via SHA-256 content hash
 * - Supports batch ingestion for seed data
 *
 * SECURITY: This service is only callable from admin/internal routes
 * or the seed script. Never expose raw ingestion to unauthenticated users.
 */

import { createHash } from 'crypto';
import { prisma } from '../config/database.js';
import { createEmbeddingProvider } from '../providers/embedding/embedding.factory.js';

export interface KnowledgeChunkInput {
  title: string;
  content: string;
  category:
    | 'OPENING'
    | 'MIDDLEGAME'
    | 'ENDGAME'
    | 'TACTICS'
    | 'STRATEGY'
    | 'PAWN_STRUCTURE'
    | 'PIECE_COORDINATION'
    | 'KING_SAFETY'
    | 'CALCULATION'
    | 'PSYCHOLOGY';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER';
  tags?: string[];
  source?: string;
  openingEco?: string;
}

export interface IngestionResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export class KnowledgeIngestionService {
  /**
   * Ingest a batch of knowledge chunks.
   * Chunks with duplicate content (same hash) are skipped.
   * Embedding is generated for each unique chunk.
   */
  async ingestBatch(chunks: KnowledgeChunkInput[]): Promise<IngestionResult> {
    const result: IngestionResult = { created: 0, skipped: 0, failed: 0, errors: [] };
    const provider = createEmbeddingProvider();

    for (const chunk of chunks) {
      try {
        const contentHash = this.hashContent(chunk.title, chunk.content);

        // Check for duplicate
        const existing = await prisma.knowledgeChunk.findUnique({
          where: { contentHash },
          select: { id: true }
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Generate embedding
        const { embedding, model } = await provider.embed(
          `${chunk.title}\n\n${chunk.content}`
        );
        const vectorStr = `[${embedding.join(',')}]`;

        // Insert with embedding via raw SQL (Prisma doesn't support vector type natively)
        await prisma.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk"
            ("id", "title", "content", "contentHash", "category", "difficulty", "tags",
             "source", "openingEco", "embedding", "embeddingModel", "createdAt", "updatedAt")
           VALUES
            (gen_random_uuid()::text, $1, $2, $3, $4::"KnowledgeCategory",
             $5::"KnowledgeDifficulty", $6::text[], $7, $8, $9::vector(768), $10,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          chunk.title,
          chunk.content,
          contentHash,
          chunk.category,
          chunk.difficulty ?? 'INTERMEDIATE',
          `{${(chunk.tags ?? []).join(',')}}`,
          chunk.source ?? null,
          chunk.openingEco ?? null,
          vectorStr,
          model
        );

        result.created++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `Failed to ingest "${chunk.title}": ${err instanceof Error ? err.message : String(err)}`
        );
        console.error('[KnowledgeIngestionService] Ingestion error:', err);
      }
    }

    return result;
  }

  /**
   * Ingest a single chunk. Returns the created chunk ID or null if skipped.
   */
  async ingestOne(chunk: KnowledgeChunkInput): Promise<{ id: string | null; skipped: boolean }> {
    const result = await this.ingestBatch([chunk]);
    if (result.skipped > 0) return { id: null, skipped: true };
    if (result.failed > 0) throw new Error(result.errors[0]);
    // Retrieve the newly created chunk's ID
    const contentHash = this.hashContent(chunk.title, chunk.content);
    const created = await prisma.knowledgeChunk.findUnique({
      where: { contentHash },
      select: { id: true }
    });
    return { id: created?.id ?? null, skipped: false };
  }

  /**
   * Re-embed all chunks that have no embedding or were embedded with a different model.
   * Used when switching embedding providers.
   */
  async reembedAll(modelFilter?: string): Promise<IngestionResult> {
    const result: IngestionResult = { created: 0, skipped: 0, failed: 0, errors: [] };
    const provider = createEmbeddingProvider();

    const chunks = await prisma.knowledgeChunk.findMany({
      where: modelFilter ? { embeddingModel: { not: modelFilter } } : undefined,
      select: { id: true, title: true, content: true }
    });

    for (const chunk of chunks) {
      try {
        const { embedding, model } = await provider.embed(`${chunk.title}\n\n${chunk.content}`);
        const vectorStr = `[${embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "KnowledgeChunk" SET "embedding" = $1::vector(768), "embeddingModel" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $3`,
          vectorStr,
          model,
          chunk.id
        );
        result.created++;
      } catch (err) {
        result.failed++;
        result.errors.push(`Re-embed failed for ${chunk.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return result;
  }

  private hashContent(title: string, content: string): string {
    return createHash('sha256').update(`${title}\n${content}`, 'utf8').digest('hex');
  }
}

export const knowledgeIngestionService = new KnowledgeIngestionService();
