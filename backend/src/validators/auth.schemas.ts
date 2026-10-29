import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
