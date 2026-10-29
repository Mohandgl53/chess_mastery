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
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters')
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase())
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Password must be at most 128 characters'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters')
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase())
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
