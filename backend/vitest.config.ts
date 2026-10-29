import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      EMBEDDING_PROVIDER: 'mock',
      LLM_PROVIDER: 'mock',
      NODE_ENV: 'test'
    }
  }
});
