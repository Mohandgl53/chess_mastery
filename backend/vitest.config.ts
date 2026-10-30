import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/chess_coach?schema=public',
      EMBEDDING_PROVIDER: 'mock',
      LLM_PROVIDER: 'mock',
      NODE_ENV: 'test'
    }
  }
});
