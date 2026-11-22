import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { assertProductionEnvConfig } from './env.validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from backend/.env relative to this file, then fallback to cwd .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // Public HTTPS URL for outgoing email action links (avoids localhost in emails)
  PUBLIC_CLIENT_URL: z.string().optional(),
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
  // No committed fallback. Production requires an operator-provided secret;
  // dev/tests get a local-only value below.
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Email Service Configuration (Modular: smtp | resend | mock)
  EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'mock']).default('smtp'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform((val) => val.trim().toLowerCase() === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('Zugora'),
  // Legacy Resend configuration for easy rollback
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('Zugora <onboarding@resend.dev>'),
  REQUIRE_EMAIL_VERIFICATION: z
    .string()
    .optional()
    .transform((val) => {
      // In production, email verification is strictly mandatory and can never be disabled
      if (process.env.NODE_ENV === 'production') {
        return true;
      }
      if (val !== undefined && val !== '') {
        return val.trim().toLowerCase() === 'true';
      }
      return true;
    })
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

// Production hard-fail: unique strong JWT secret and real HTTPS client URLs
// for both CORS and outgoing email action links.
try {
  assertProductionEnvConfig({
    NODE_ENV: parsed.data.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    CLIENT_URL: process.env.CLIENT_URL ?? parsed.data.CLIENT_URL,
    PUBLIC_CLIENT_URL: process.env.PUBLIC_CLIENT_URL
  });
} catch (err) {
  console.error('Invalid production environment configuration:', (err as Error).message);
  process.exit(1);
}

// Local development/test fallback only. Never used when NODE_ENV=production
// because the check above requires an explicit operator-provided secret.
const LOCAL_DEV_JWT_SECRET = 'local_development_only_secret_do_not_use_in_production_1234';
const resolvedJwtSecret = parsed.data.JWT_SECRET?.trim() || LOCAL_DEV_JWT_SECRET;

export const env = { ...parsed.data, JWT_SECRET: resolvedJwtSecret };
