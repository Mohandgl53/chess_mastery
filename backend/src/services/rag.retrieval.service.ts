/**
 * Phase 5: RAG Knowledge Retrieval Service
 *
 * Implements hybrid search over KnowledgeChunk:
 *   1. Vector similarity (pgvector cosine distance) — semantic relevance
 *   2. Full-text search (PostgreSQL tsvector / tsquery) — keyword precision
 *   3. Metadata filters — category, difficulty, openingEco
 *
 * Results are ranked by a weighted RRF (Reciprocal Rank Fusion) score that
 * combines vector rank and keyword rank. This provides robust retrieval
 * even when embeddings are mock/non-semantic.
 *
 * SECURITY:
 * - Query text is parameterised via $1, $2 etc — no SQL injection possible.
 * - Retrieved chunk content is treated as DATA only — never as instructions.
 * - All inputs are our own chess context strings, not raw user messages.
 */

import { prisma } from '../config/database.js';
import { createEmbeddingProvider } from '../providers/embedding/embedding.factory.js';
import { EMBEDDING_DIM } from '../providers/embedding/embedding.provider.js';

export interface KnowledgeRetrievalQuery {
  /** The natural-language query to search against (chess context, not raw user input) */
  queryText: string;
  /** Optional metadata filters */
  category?: string;
  difficulty?: string;
  openingEco?: string;
  /** Maximum number of chunks to return (default: 5) */
  topK?: number;
  /** Weight for vector score vs keyword score (0=keyword only, 1=vector only, default: 0.6) */
  vectorWeight?: number;
}

export interface RetrievedChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  tags: string[];
  source: string | null;
  openingEco: string | null;
  /** Combined retrieval score (higher = more relevant) */
  score: number;
  /** How this chunk was retrieved: 'vector', 'keyword', or 'hybrid' */
  retrievalMethod: 'vector' | 'keyword' | 'hybrid';
}

export class RAGRetrievalService {
  /**
   * Retrieve the most relevant knowledge chunks for a given query.
   * Uses hybrid search: vector similarity + full-text keyword search.
   */
  async retrieve(query: KnowledgeRetrievalQuery): Promise<RetrievedChunk[]> {
    const topK = query.topK ?? 5;
    const vectorWeight = query.vectorWeight ?? 0.6;
    const keywordWeight = 1 - vectorWeight;

    // Count available chunks with embeddings
    const totalChunks = await prisma.knowledgeChunk.count();
    if (totalChunks === 0) {
      return [];
    }

    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, topK * 3),
      this.keywordSearch(query, topK * 3)
    ]);

    // Reciprocal Rank Fusion
    const chunkScores = new Map<
      string,
      { chunk: RetrievedChunk; vectorRank: number; keywordRank: number }
    >();

    const RRF_K = 60;
    vectorResults.forEach((chunk, idx) => {
      chunkScores.set(chunk.id, {
        chunk,
        vectorRank: idx + 1,
        keywordRank: Infinity
      });
    });

    keywordResults.forEach((chunk, idx) => {
      const existing = chunkScores.get(chunk.id);
      if (existing) {
        existing.keywordRank = idx + 1;
      } else {
        chunkScores.set(chunk.id, {
          chunk: { ...chunk, retrievalMethod: 'keyword' },
          vectorRank: Infinity,
          keywordRank: idx + 1
        });
      }
    });

    // Compute final RRF scores
    const ranked = Array.from(chunkScores.values())
      .map(({ chunk, vectorRank, keywordRank }) => {
        const vectorScore = vectorRank === Infinity ? 0 : vectorWeight / (RRF_K + vectorRank);
        const keywordScore =
          keywordRank === Infinity ? 0 : keywordWeight / (RRF_K + keywordRank);
        const finalScore = vectorScore + keywordScore;

        let method: 'vector' | 'keyword' | 'hybrid' = chunk.retrievalMethod;
        if (vectorRank !== Infinity && keywordRank !== Infinity) {
          method = 'hybrid';
        }

        return { ...chunk, score: finalScore, retrievalMethod: method };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked;
  }

  /**
   * Vector similarity search using pgvector cosine distance.
   * Falls back to returning top chunks by ID if no embedding is available.
   */
  private async vectorSearch(
    query: KnowledgeRetrievalQuery,
    limit: number
  ): Promise<RetrievedChunk[]> {
    try {
      const provider = createEmbeddingProvider();
      const { embedding } = await provider.embed(query.queryText);
      const vectorStr = `[${embedding.join(',')}]`;

      // Build WHERE clause
      const conditions: string[] = ['"embedding" IS NOT NULL'];
      const params: unknown[] = [vectorStr, limit];
      let paramIdx = 3;

      if (query.category) {
        conditions.push(`"category" = $${paramIdx}::"KnowledgeCategory"`);
        params.push(query.category);
        paramIdx++;
      }
      if (query.difficulty) {
        conditions.push(`"difficulty" = $${paramIdx}::"KnowledgeDifficulty"`);
        params.push(query.difficulty);
        paramIdx++;
      }
      if (query.openingEco) {
        conditions.push(`"openingEco" = $${paramIdx}`);
        params.push(query.openingEco);
        paramIdx++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT
          "id", "title", "content", "category", "difficulty",
          "tags", "source", "openingEco",
          1 - ("embedding" <=> $1::vector(${EMBEDDING_DIM})) AS score
        FROM "KnowledgeChunk"
        ${whereClause}
        ORDER BY "embedding" <=> $1::vector(${EMBEDDING_DIM})
        LIMIT $2
      `;

      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          title: string;
          content: string;
          category: string;
          difficulty: string;
          tags: string[];
          source: string | null;
          openingEco: string | null;
          score: number;
        }>
      >(sql, ...params);

      return rows.map((r) => ({
        ...r,
        score: Number(r.score),
        retrievalMethod: 'vector' as const
      }));
    } catch (err) {
      console.warn('[RAGRetrievalService] Vector search failed, using keyword only:', err);
      return [];
    }
  }

  /**
   * Full-text keyword search using PostgreSQL tsvector.
   * Converts query to tsquery using plainto_tsquery for safety.
   */
  private async keywordSearch(
    query: KnowledgeRetrievalQuery,
    limit: number
  ): Promise<RetrievedChunk[]> {
    try {
      const conditions: string[] = ['"fullTextVector" @@ plainto_tsquery(\'english\', $1)'];
      const params: unknown[] = [query.queryText, limit];
      let paramIdx = 3;

      if (query.category) {
        conditions.push(`"category" = $${paramIdx}::"KnowledgeCategory"`);
        params.push(query.category);
        paramIdx++;
      }
      if (query.difficulty) {
        conditions.push(`"difficulty" = $${paramIdx}::"KnowledgeDifficulty"`);
        params.push(query.difficulty);
        paramIdx++;
      }
      if (query.openingEco) {
        conditions.push(`"openingEco" = $${paramIdx}`);
        params.push(query.openingEco);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT
          "id", "title", "content", "category", "difficulty",
          "tags", "source", "openingEco",
          ts_rank("fullTextVector", plainto_tsquery('english', $1)) AS score
        FROM "KnowledgeChunk"
        ${whereClause}
        ORDER BY score DESC
        LIMIT $2
      `;

      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          title: string;
          content: string;
          category: string;
          difficulty: string;
          tags: string[];
          source: string | null;
          openingEco: string | null;
          score: number;
        }>
      >(sql, ...params);

      return rows.map((r) => ({
        ...r,
        score: Number(r.score),
        retrievalMethod: 'keyword' as const
      }));
    } catch (err) {
      console.warn('[RAGRetrievalService] Keyword search failed:', err);
      return [];
    }
  }
}

export const ragRetrievalService = new RAGRetrievalService();
