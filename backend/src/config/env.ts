import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // Phase 3B: Optional seed password for dev user (set to authenticate as dev-user-123 locally)
  DEV_SEED_PASSWORD: z.string().optional(),
  // Phase 4: LLM Coach Configuration (Free Provider Architecture)
  LLM_PROVIDER: z.enum(['groq', 'openrouter', 'ollama', 'mock']).default('mock'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  // Phase 5: RAG Embedding Configuration
  EMBEDDING_PROVIDER: z.enum(['ollama', 'mock']).default('mock'),
  EMBEDDING_MODEL: z.string().optional(),
  // Security Hardening: JWT & OAuth Configuration
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('chess_mastery_secure_jwt_secret_key_change_in_production_2026'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  GOOGLE_CLIENT_ID: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
