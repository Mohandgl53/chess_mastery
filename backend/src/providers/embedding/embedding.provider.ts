/**
 * Phase 5: RAG Embedding Provider Abstraction
 *
 * Defines the contract for generating vector embeddings from text.
 * All embedding dimensions must match the vector(768) schema column.
 *
 * SECURITY NOTE: Inputs are chess context strings from our own system —
 * never raw user query strings. Sanitize before passing to any external API.
 */

export const EMBEDDING_DIM = 768;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  /** Dimension of the returned vector — must equal EMBEDDING_DIM (768) */
  dimension: number;
}

export interface IEmbeddingProvider {
  readonly providerName: string;
  readonly modelName: string;

  /**
   * Generate an embedding vector for the given text.
   * @param text - The chess knowledge text to embed (max ~8192 tokens).
   * @returns A 768-dimensional embedding vector.
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in a single batch.
   * Implementations may call embed() sequentially or use a batch API.
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}
