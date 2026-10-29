/**
 * Phase 5: Mock Embedding Provider
 *
 * Generates deterministic, dimension-correct embeddings using a
 * hash-based approach. Used in test mode and when no real embedding
 * provider is configured.
 *
 * DETERMINISM GUARANTEE: Same input text always produces the same vector.
 * This enables repeatable test assertions for RAG retrieval.
 *
 * NOTE: Mock embeddings are NOT semantically meaningful.
 * Similarity search with mock embeddings degrades to near-random retrieval.
 * For production semantic search, configure Ollama or an API provider.
 */

import { createHash } from 'crypto';
import { IEmbeddingProvider, EmbeddingResult, EMBEDDING_DIM } from './embedding.provider.js';

export class MockEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'MockEmbedding';
  readonly modelName = 'mock-deterministic-768';

  async embed(text: string): Promise<EmbeddingResult> {
    const embedding = this.generateDeterministicEmbedding(text);
    return {
      embedding,
      model: this.modelName,
      dimension: EMBEDDING_DIM
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  /**
   * Generates a deterministic unit-normalized vector from text.
   * Uses SHA-256 hash bytes, tiled to fill 768 dimensions, then L2-normalized.
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const hash = createHash('sha256').update(text, 'utf8').digest();
    const vec = new Array<number>(EMBEDDING_DIM);

    // Tile hash bytes across dimensions with positional variation
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      const byteVal = hash[i % hash.length];
      // Add positional variation to avoid periodic artifacts
      const posVariation = Math.sin(i * 0.1) * 0.5;
      vec[i] = (byteVal / 128.0 - 1.0) + posVariation;
    }

    // L2 normalize so cosine similarity is well-defined
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        vec[i] = vec[i] / norm;
      }
    }

    return vec;
  }
}
