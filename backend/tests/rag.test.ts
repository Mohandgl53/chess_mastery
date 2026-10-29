import { describe, it, expect } from 'vitest';
import { MockEmbeddingProvider } from '../src/providers/embedding/mock.embedding.js';
import { OllamaEmbeddingProvider } from '../src/providers/embedding/ollama.embedding.js';
import { EMBEDDING_DIM } from '../src/providers/embedding/embedding.provider.js';
import { ragRetrievalService } from '../src/services/rag.retrieval.service.js';
import { knowledgeIngestionService } from '../src/services/knowledge.ingestion.service.js';
import { prisma } from '../src/config/database.js';

describe('Phase 5: RAG & Embedding Architecture Tests', () => {
  describe('1. Embedding Providers & Dimensions', () => {
    it('MockEmbeddingProvider produces exactly 768 dimensions', async () => {
      const provider = new MockEmbeddingProvider();
      expect(EMBEDDING_DIM).toBe(768);

      const result = await provider.embed('The Sicilian Defense provides counterplay.');
      expect(result.dimension).toBe(768);
      expect(result.embedding.length).toBe(768);
      expect(result.model).toBe('mock-deterministic-768');

      // Verify unit vector normalization (L2 norm ≈ 1)
      const norm = Math.sqrt(result.embedding.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 4);
    });

    it('MockEmbeddingProvider is deterministic for identical input', async () => {
      const provider = new MockEmbeddingProvider();
      const text = 'Castling improves king safety.';
      const res1 = await provider.embed(text);
      const res2 = await provider.embed(text);
      expect(res1.embedding).toEqual(res2.embedding);
    });

    it('OllamaEmbeddingProvider throws explicit error on dimension mismatch', async () => {
      const provider = new OllamaEmbeddingProvider('http://localhost:11434', 'test-model');

      // Mock global fetch to return a 1536d vector (mismatch against 768)
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(
          JSON.stringify({ embedding: new Array(1536).fill(0.01) }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        await expect(provider.embed('Test chess query')).rejects.toThrow(
          /returned dimension 1536, expected 768/
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('OllamaEmbeddingProvider succeeds when native dimension is exactly 768', async () => {
      const provider = new OllamaEmbeddingProvider('http://localhost:11434', 'nomic-embed-text');

      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(
          JSON.stringify({ embedding: new Array(768).fill(0.01) }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        const res = await provider.embed('Sicilian Najdorf');
        expect(res.dimension).toBe(768);
        expect(res.embedding.length).toBe(768);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('2. Ingestion & Re-embedding', () => {
    it('reembedAll executes without error and updates embeddingModel', async () => {
      const result = await knowledgeIngestionService.reembedAll();
      expect(result.failed).toBe(0);
      expect(result.created).toBeGreaterThanOrEqual(0);

      // Verify rows in DB have active provider model
      const chunks = await prisma.knowledgeChunk.findMany({
        select: { id: true, embeddingModel: true },
        take: 5
      });
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(['nomic-embed-text', 'mock-deterministic-768']).toContain(chunk.embeddingModel);
      }
    });

    it('ingestBatch skips duplicate content hashes', async () => {
      // Ingesting identical title + content should be skipped
      const sample = {
        title: 'The Fork: Attacking Two Pieces Simultaneously',
        content: 'A fork is a tactical move where one piece attacks two or more opponent pieces at the same time, forcing the opponent to sacrifice one. Knights are the best forking pieces because they move in an L-shape that can attack non-adjacent squares. To spot a fork: look for positions where your knight, pawn, or queen can reach a square that attacks two valuable enemy pieces. Common fork patterns: Knight on c7 attacking rook on a8 and queen on e8; Pawn fork on d5 attacking bishop on c6 and knight on e6. After a fork, the opponent must move one attacked piece, allowing you to capture the other.',
        category: 'TACTICS' as const
      };

      const result = await knowledgeIngestionService.ingestBatch([sample]);
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });
  });

  describe('3. RAG Retrieval & Hybrid RRF', () => {
    it('retrieves results using hybrid search', async () => {
      const results = await ragRetrievalService.retrieve({
        queryText: 'isolated pawn endgame weakness',
        topK: 3
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      for (const r of results) {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('title');
        expect(r).toHaveProperty('category');
        expect(r).toHaveProperty('score');
        expect(typeof r.score).toBe('number');
        expect(['vector', 'keyword', 'hybrid']).toContain(r.retrievalMethod);
      }
    });

    it('filters retrieval by category correctly', async () => {
      const results = await ragRetrievalService.retrieve({
        queryText: 'pawn structure weaknesses',
        category: 'PAWN_STRUCTURE',
        topK: 3
      });

      for (const r of results) {
        expect(r.category).toBe('PAWN_STRUCTURE');
      }
    });

    it('handles queries with no keyword match safely', async () => {
      const results = await ragRetrievalService.retrieve({
        queryText: 'nonexistenttermxyz123 chess idea',
        topK: 2
      });

      // Should still return results from vector fallback or empty safely
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
