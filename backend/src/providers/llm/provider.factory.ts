import { ILLMProvider } from './llm.provider.js';
import { GroqProvider } from './groq.provider.js';
import { OpenRouterProvider } from './openrouter.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { MockLLMProvider } from './mock.provider.js';
import { env } from '../../config/env.js';

let cachedProvider: ILLMProvider | null = null;

export function createLLMProvider(): ILLMProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = env.LLM_PROVIDER;
  let provider: ILLMProvider;

  switch (providerType) {
    case 'groq': {
      if (!env.LLM_API_KEY) {
        console.warn('[LLMProviderFactory] LLM_PROVIDER=groq configured, but LLM_API_KEY is not set. Falling back to MockLLMProvider.');
        provider = new MockLLMProvider();
      } else {
        const model = env.LLM_MODEL || 'llama-3.3-70b-versatile';
        console.log(`[LLMProviderFactory] Initializing GroqProvider with model: ${model}`);
        provider = new GroqProvider(env.LLM_API_KEY, model);
      }
      break;
    }

    case 'openrouter': {
      if (!env.LLM_API_KEY) {
        console.warn('[LLMProviderFactory] LLM_PROVIDER=openrouter configured, but LLM_API_KEY is not set. Falling back to MockLLMProvider.');
        provider = new MockLLMProvider();
      } else {
        const model = env.LLM_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
        console.log(`[LLMProviderFactory] Initializing OpenRouterProvider with model: ${model}`);
        provider = new OpenRouterProvider(env.LLM_API_KEY, model);
      }
      break;
    }

    case 'ollama': {
      const model = env.LLM_MODEL || 'llama3.2';
      console.log(`[LLMProviderFactory] Initializing OllamaProvider at ${env.OLLAMA_BASE_URL} with model: ${model}`);
      provider = new OllamaProvider(env.OLLAMA_BASE_URL, model);
      break;
    }

    case 'mock':
    default: {
      console.log('[LLMProviderFactory] Initializing MockLLMProvider (offline / test mode)');
      provider = new MockLLMProvider();
      break;
    }
  }

  cachedProvider = provider;
  return provider;
}

// Function to reset provider (useful for testing different providers)
export function resetLLMProvider(): void {
  cachedProvider = null;
}
