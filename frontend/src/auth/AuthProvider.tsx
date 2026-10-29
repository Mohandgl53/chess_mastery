import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser, AuthProfile, AuthSession, LoginInput, RegisterInput } from '../types/auth';
import { authApi } from '../services/api/authApi';

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
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Local guest auth fallback
// ---------------------------------------------------------------------------

function buildDefaultProfile(): AuthProfile {
  return {
    id: 'local-profile-id',
    userId: 'local-user-id',
    rating: 400,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesDrawn: 0,
    gamesLost: 0,
    currentStreak: 0,
    longestStreak: 0
  };
}

const LOCAL_USER: AuthUser = {
  id: 'local-user-id',
  email: 'player@chessmastery.local',
  displayName: 'Player'
};

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(LOCAL_USER);
  const [profile, setProfile] = useState<AuthProfile | null>(buildDefaultProfile());

  const login = useCallback(async (_input: LoginInput) => {
    setUser(LOCAL_USER);
    setProfile(buildDefaultProfile());
  }, []);

  const register = useCallback(async (_input: RegisterInput) => {
    setUser(LOCAL_USER);
    setProfile(buildDefaultProfile());
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setTimeout(() => {
      setUser(LOCAL_USER);
      setProfile(buildDefaultProfile());
    }, 0);
  }, []);

  const googleLogin = useCallback(async (_cred: string) => {
    setUser(LOCAL_USER);
    setProfile(buildDefaultProfile());
  }, []);

  const logoutAll = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setTimeout(() => {
      setUser(LOCAL_USER);
      setProfile(buildDefaultProfile());
    }, 0);
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfile(buildDefaultProfile());
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    isLoading: false,
    isAuthenticated: user !== null,
    login,
    register,
    googleLogin,
    logout,
    logoutAll,
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

  const googleLogin = useCallback(async (credential: string) => {
    const session = await authApi.googleLogin(credential);
    applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
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
    googleLogin,
    logout,
    logoutAll,
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
