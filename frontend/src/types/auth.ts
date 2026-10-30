/**
 * Phase 3B & Security Hardened Auth types.
 * These represent only safe, non-sensitive identity information.
 * Never include passwordHash, session tokens, or tokenHash.
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role?: 'USER' | 'ADMIN';
}

export interface AuthProfile {
  id: string;
  userId: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  preferredStyle?: string | null;
  favoriteOpening?: string | null;
  favoriteOpeningBlack?: string | null;
  flair?: string | null;
  statusMessage?: string | null;
  // Additional fields from SafeUserProfile
  createdAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  profile: AuthProfile;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}
