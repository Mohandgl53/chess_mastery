/**
 * Phase 5: Embedding Provider Factory
 *
 * Selects the embedding provider based on EMBEDDING_PROVIDER env var.
 * Providers: mock (default, deterministic), ollama (local real embeddings).
 *
 * Singleton pattern — embedding provider is cached after first creation.
 */

import { IEmbeddingProvider } from './embedding.provider.js';
import { MockEmbeddingProvider } from './mock.embedding.js';
import { OllamaEmbeddingProvider } from './ollama.embedding.js';
import { env } from '../../config/env.js';

let cachedEmbeddingProvider: IEmbeddingProvider | null = null;

export function createEmbeddingProvider(): IEmbeddingProvider {
  if (cachedEmbeddingProvider) {
    return cachedEmbeddingProvider;
  }

  const providerType = env.EMBEDDING_PROVIDER;

  switch (providerType) {
    case 'ollama': {
      const model = env.EMBEDDING_MODEL || 'nomic-embed-text';
      console.log(
        `[EmbeddingProviderFactory] Initializing OllamaEmbeddingProvider at ${env.OLLAMA_BASE_URL} with model: ${model}`
      );
      cachedEmbeddingProvider = new OllamaEmbeddingProvider(env.OLLAMA_BASE_URL, model);
      return cachedEmbeddingProvider;
    }

    case 'mock':
    default: {
      console.log(
        '[EmbeddingProviderFactory] Initializing MockEmbeddingProvider (deterministic, test mode)'
      );
      cachedEmbeddingProvider = new MockEmbeddingProvider();
      return cachedEmbeddingProvider;
    }
  }
}

export function resetEmbeddingProvider(): void {
  cachedEmbeddingProvider = null;
}
