import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schemas.js';
import type { SafeAuthResponse, SafeUser, SafeProfile, AuthenticatedUser } from '../types/index.js';
import type { User, PlayerProfile } from '@prisma/client';

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash a raw session token with SHA-256.
 * The raw token is sent via cookie; only the hash is stored in PostgreSQL.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a cryptographically secure random session token (32 bytes = 64 hex chars).
 * This is the value placed in the httpOnly cookie.
 * It is NEVER stored in the database.
 */
function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function buildSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}

function buildSafeProfile(profile: PlayerProfile): SafeProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    rating: profile.rating,
    gamesPlayed: profile.gamesPlayed,
    gamesWon: profile.gamesWon,
    gamesDrawn: profile.gamesDrawn,
    gamesLost: profile.gamesLost,
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak
  };
}

/**
 * Internal result of register/login — separates the safe JSON response
 * from the raw session token that must only be placed in the httpOnly cookie.
 */
interface AuthResult {
  safeResponse: SafeAuthResponse;
  /** Raw token for the httpOnly cookie. Never log, return in JSON, or store in DB. */
  rawToken: string;
}

export class AuthService {
  /**
   * Register a new user.
   * Creates User + PlayerProfile in a single transaction.
   * Returns safe user data and a raw session token (for cookie only).
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check for duplicate email (already normalized by Zod schema)
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    // Hash password — never store plaintext
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    // Create User + PlayerProfile atomically
    const { profile, ...user } = await userRepository.createWithProfile(
      {
        email: input.email,
        passwordHash,
        displayName: input.displayName
      }
    );

    // Create session
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await sessionRepository.createSession(user.id, tokenHash, expiresAt);

    return {
      safeResponse: {
        user: buildSafeUser(user as User),
        profile: buildSafeProfile(profile)
      },
      rawToken
    };
  }

  /**
   * Login an existing user.
   * Uses generic error messaging to avoid revealing whether email exists.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const genericError = new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      // Perform a dummy comparison to prevent timing attacks
      await bcrypt.compare(input.password, '$2b$12$invalidhashfortimingprotection00000000000000000000000000');
      throw genericError;
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw genericError;
    }

    const profile = await userRepository.findProfileByUserId(user.id);

    // Create a new session on every login
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await sessionRepository.createSession(user.id, tokenHash, expiresAt);

    const safeProfile: SafeProfile = profile
      ? buildSafeProfile(profile)
      : {
          id: '',
          userId: user.id,
          rating: 800,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesDrawn: 0,
          gamesLost: 0,
          currentStreak: 0,
          longestStreak: 0
        };

    return {
      safeResponse: {
        user: buildSafeUser(user),
        profile: safeProfile
      },
      rawToken
    };
  }

  /**
   * Logout: delete the session identified by the raw cookie token.
   * Safe to call even if session is already missing.
   */
  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await sessionRepository.deleteByTokenHash(tokenHash);
  }

  /**
   * Verify a raw session token from the cookie.
   * Returns the authenticated user if valid, or null if expired/missing.
   * Deletes expired sessions on encounter.
   */
  async verifySession(rawToken: string): Promise<AuthenticatedUser | null> {
    const tokenHash = hashToken(rawToken);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    // Check expiry
    if (session.expiresAt <= new Date()) {
      // Delete expired session
      await sessionRepository.deleteByTokenHash(tokenHash);
      return null;
    }

    // Update lastSeenAt (fire-and-forget — don't block the request)
    sessionRepository.updateLastSeen(tokenHash).catch(() => {});

    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName
    };
  }
}

export const authService = new AuthService();
