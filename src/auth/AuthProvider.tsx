import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser, AuthProfile, AuthSession, LoginInput, RegisterInput } from '../types/auth';
import { authApi } from '../services/api/authApi';
import { MOCK_USER_PROFILE } from '../mock/mockUserMemory';

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Mock auth for VITE_DATA_MODE=mock
// Provides the existing mock user so components that read user data
// continue rendering. No backend calls, no redirects, no login required.
// ---------------------------------------------------------------------------

function buildMockProfile(): AuthProfile {
  return {
    id: 'mock-profile-id',
    userId: 'mock-user-id',
    rating: MOCK_USER_PROFILE.rating,
    gamesPlayed: MOCK_USER_PROFILE.winCount + MOCK_USER_PROFILE.lossCount + MOCK_USER_PROFILE.drawCount,
    gamesWon: MOCK_USER_PROFILE.winCount,
    gamesDrawn: MOCK_USER_PROFILE.drawCount,
    gamesLost: MOCK_USER_PROFILE.lossCount,
    currentStreak: MOCK_USER_PROFILE.streakDays,
    longestStreak: MOCK_USER_PROFILE.streakDays
  };
}

const MOCK_USER: AuthUser = {
  id: 'mock-user-id',
  email: 'mock@chesscoach.local',
  displayName: MOCK_USER_PROFILE.name
};

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(MOCK_USER);
  const [profile, setProfile] = useState<AuthProfile | null>(buildMockProfile());

  const login = useCallback(async (_input: LoginInput) => {
    // Mock login: reinitialize mock state
    setUser(MOCK_USER);
    setProfile(buildMockProfile());
  }, []);

  const register = useCallback(async (_input: RegisterInput) => {
    setUser(MOCK_USER);
    setProfile(buildMockProfile());
  }, []);

  const logout = useCallback(async () => {
    // In mock mode: clear then restore (mock data is always available)
    setUser(null);
    setProfile(null);
    // Reinitialize after brief delay to simulate logout/redirect
    setTimeout(() => {
      setUser(MOCK_USER);
      setProfile(buildMockProfile());
    }, 0);
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfile(buildMockProfile());
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    isLoading: false,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Real auth for VITE_DATA_MODE=api
// Uses httpOnly session cookie via authApi.
// ---------------------------------------------------------------------------

function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from server (GET /api/auth/me)
  useEffect(() => {
    let cancelled = false;

    authApi.me()
      .then((session) => {
        if (!cancelled) {
          if (session) {
            setUser(session.user);
            setProfile(session.profile);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Network error or backend unavailable — treat as unauthenticated
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authApi.login(input);
    applySession(session);
  }, [applySession]);

  const register = useCallback(async (input: RegisterInput) => {
    const { confirmPassword: _, ...apiInput } = input;
    const session = await authApi.register(apiInput);
    applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Always clear frontend state, even if server call failed
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const session = await authApi.me();
      if (session) {
        setUser(session.user);
        setProfile(session.profile);
      }
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// AuthProvider — selects implementation based on VITE_DATA_MODE
// ---------------------------------------------------------------------------

const dataMode = import.meta.env.VITE_DATA_MODE || 'api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (dataMode === 'mock') {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  return <ApiAuthProvider>{children}</ApiAuthProvider>;
}

// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
