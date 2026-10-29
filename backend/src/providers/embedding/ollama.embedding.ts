/**
 * Phase 5: Ollama Embedding Provider
 *
 * Uses Ollama's local embedding API to generate real semantic embeddings.
 * Configured for native 768-dimensional models such as nomic-embed-text.
 *
 * IMPORTANT: The database vector column is vector(768).
 * If the Ollama model returns a different dimension, this provider
 * fails explicitly rather than silently padding or truncating.
 */

import { IEmbeddingProvider, EmbeddingResult, EMBEDDING_DIM } from './embedding.provider.js';

interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'OllamaEmbedding';
  readonly modelName: string;
  private readonly baseUrl: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.modelName = model;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.modelName, prompt: text }),
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama embedding API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error(
        `Ollama embedding API returned invalid payload for model "${this.modelName}"`
      );
    }

    if (data.embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Ollama model "${this.modelName}" returned dimension ${data.embedding.length}, expected ${EMBEDDING_DIM}. Native ${EMBEDDING_DIM}-dimensional model required.`
      );
    }

    return {
      embedding: data.embedding,
      model: this.modelName,
      dimension: EMBEDDING_DIM
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Ollama doesn't support batch embedding; call sequentially
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

