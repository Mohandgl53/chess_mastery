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
   * Logout. Server deletes session and clears the cookie.
   */
  async logout(): Promise<void> {
    await apiClient<void>('/auth/logout', { method: 'POST' });
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
