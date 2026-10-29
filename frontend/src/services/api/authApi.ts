import { apiClient, ApiError } from './client';
import type { AuthSession, LoginInput } from '../../types/auth';

interface RegisterApiInput {
  email: string;
  displayName: string;
  password: string;
}

/**
 * Auth API — all calls use credentials: 'include' (set globally in apiClient).
 * Never stores tokens in localStorage or sessionStorage.
 * The httpOnly cookie is managed entirely by the browser and server.
 */
export const authApi = {
  /**
   * Register a new account and receive a session (via httpOnly cookie set by server).
   */
  async register(input: RegisterApiInput): Promise<AuthSession> {
    return apiClient<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  /**
   * Login with email and password. Server sets httpOnly session cookie.
   */
  async login(input: LoginInput): Promise<AuthSession> {
    return apiClient<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  /**
   * Google OAuth 2.0 / OpenID Connect login with verified credential.
   */
  async googleLogin(credential: string): Promise<AuthSession> {
    return apiClient<AuthSession>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
  },

  /**
   * Request password reset link.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Submit password reset with token.
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  },

  /**
   * Verify email address using the token received in the verification email.
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  /**
   * Request a new verification email for an unverified account.
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  /**
   * Logout current session. Server deletes session and clears the cookie.
   */
  async logout(): Promise<void> {
    await apiClient<void>('/auth/logout', { method: 'POST' });
  },

  /**
   * Logout across all devices and invalidate all active sessions.
   */
  async logoutAll(): Promise<void> {
    await apiClient<void>('/auth/logout-all', { method: 'POST' });
  },

  /**
   * Get current authenticated user/profile using the session cookie.
   * Returns null if unauthenticated (401) or on network error.
   */
  async me(): Promise<AuthSession | null> {
    try {
      return await apiClient<AuthSession>('/auth/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      // Re-throw non-auth errors (network issues etc.)
      throw err;
    }
  }
};
