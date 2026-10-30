import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { jwtService } from './jwt.service.js';
import { googleAuthService } from './google-auth.service.js';
import { emailService } from './email.service.js';
import { ConflictError, UnauthorizedError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schemas.js';
import type { SafeAuthResponse, SafeUser, SafeProfile, AuthenticatedUser } from '../types/index.js';
import type { User, PlayerProfile } from '@prisma/client';

const BCRYPT_COST = 12;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function buildSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
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
    longestStreak: profile.longestStreak,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    country: profile.country,
    preferredStyle: profile.preferredStyle,
    favoriteOpening: profile.favoriteOpening,
    favoriteOpeningBlack: profile.favoriteOpeningBlack,
    flair: profile.flair,
    statusMessage: profile.statusMessage,
  };
}

export interface AuthResult {
  safeResponse: SafeAuthResponse & { devVerificationToken?: string };
  rawToken?: string;
}

export class AuthService {
  /**
   * Register a new user with email and password.
   * Creates User + PlayerProfile atomically.
   * When email verification is required, unverified accounts do NOT receive active sessions or JWT tokens.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const { profile, ...user } = await userRepository.createWithProfile({
      email: input.email,
      passwordHash,
      displayName: input.displayName
    });

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    };

    const isVerificationEnforced = env.REQUIRE_EMAIL_VERIFICATION || process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

    let rawToken: string | undefined = undefined;
    let tokens: { accessToken: string; refreshToken: string; expiresIn: string } | undefined = undefined;

    // Only establish an active session and issue JWT tokens if email verification is NOT enforced
    if (!isVerificationEnforced) {
      const sessionToken = generateRawToken();
      const tokenHash = hashToken(sessionToken);
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await sessionRepository.createSession(user.id, tokenHash, expiresAt);
      rawToken = sessionToken;

      tokens = await jwtService.generateTokenPair(authUser);
    }

    // Generate secure single-use email verification token
    const rawVerificationToken = generateRawToken();
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: verificationTokenHash,
        userId: user.id,
        expiresAt: verificationExpiresAt,
        used: false
      }
    });

    // Send verification email via Resend
    emailService.sendVerificationEmail(user.email, user.displayName, rawVerificationToken).catch((err) => {
      console.warn('[AuthService] Could not send verification email:', err?.message || err);
    });

    return {
      safeResponse: {
        user: buildSafeUser(user as User),
        profile: buildSafeProfile(profile),
        tokens,
        message: isVerificationEnforced
          ? 'Registration successful. Please verify your email address to activate your account.'
          : undefined,
        devVerificationToken: process.env.NODE_ENV !== 'production' ? rawVerificationToken : undefined
      },
      rawToken
    };
  }

  /**
   * Login an existing user with email and password.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const genericError = new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      // Dummy compare to mitigate timing attacks
      await bcrypt.compare(input.password, '$2b$12$invalidhashfortimingprotection00000000000000000000000000');
      throw genericError;
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw genericError;
    }

    const isVerificationEnforced = env.REQUIRE_EMAIL_VERIFICATION || process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (isVerificationEnforced && !user.emailVerified && !user.googleId) {
      throw new ForbiddenError(
        'Your email address has not been verified yet. Please check your inbox or request a new verification email.',
        'EMAIL_NOT_VERIFIED'
      );
    }

    const profile = await userRepository.findProfileByUserId(user.id);

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    };

    // Create session
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await sessionRepository.createSession(user.id, tokenHash, expiresAt);

    // Create JWT tokens
    const tokens = await jwtService.generateTokenPair(authUser);

    const safeProfile: SafeProfile = profile
      ? buildSafeProfile(profile)
      : {
          id: '',
          userId: user.id,
          rating: 400,
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
        profile: safeProfile,
        tokens
      },
      rawToken
    };
  }

  /**
   * Authenticate or register with Google OAuth ID token.
   * Verifies Google token signature, checks email verification, and safely links accounts.
   */
  async googleLogin(credential: string): Promise<AuthResult> {
    const googleUser = await googleAuthService.verifyIdToken(credential);

    // 1. Check if user already exists by googleId
    let user = await userRepository.findByGoogleId(googleUser.googleId);

    // 2. If not found by googleId, check by verified email (account linking)
    if (!user) {
      user = await userRepository.findByEmail(googleUser.email);
      if (user) {
        // Link googleId to existing user
        user = await userRepository.linkGoogleAccount(user.id, googleUser.googleId);
      }
    }

    let profile: PlayerProfile | null = null;

    // 3. If user doesn't exist at all, create new user + profile
    if (!user) {
      const created = await userRepository.createWithProfile({
        email: googleUser.email,
        displayName: googleUser.displayName,
        googleId: googleUser.googleId,
        passwordHash: null,
        emailVerified: true
      });
      user = created;
      profile = created.profile;
    } else {
      if (!user.emailVerified) {
        user = await userRepository.setEmailVerified(user.id, true);
      }
      profile = await userRepository.findProfileByUserId(user.id);
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    };

    // Create session
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await sessionRepository.createSession(user.id, tokenHash, expiresAt);

    // Create JWT tokens
    const tokens = await jwtService.generateTokenPair(authUser);

    const safeProfile: SafeProfile = profile
      ? buildSafeProfile(profile)
      : {
          id: '',
          userId: user.id,
          rating: 400,
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
        profile: safeProfile,
        tokens
      },
      rawToken
    };
  }

  /**
   * Request password reset token.
   * Always returns a generic message to prevent account enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ message: string; devResetToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Mitigate timing differences by running a dummy hash
      crypto.createHash('sha256').update(normalizedEmail).digest('hex');
      return {
        message: 'If an account with this email exists, a password reset link has been dispatched.'
      };
    }

    // Invalidate any older unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        used: false
      }
    });

    // Send password reset email via Resend
    emailService.sendPasswordResetEmail(user.email, user.displayName, rawToken).catch((err) => {
      console.warn('[AuthService] Could not send password reset email:', err?.message || err);
    });

    // In development / test mode, we expose the token to allow test assertions.
    return {
      message: 'If an account with this email exists, a password reset link has been dispatched.',
      devResetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined
    };
  }

  /**
   * Reset password using a valid, unexpired reset token.
   * Atomically invalidates all existing sessions & refresh tokens on success.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt <= new Date()) {
      throw new BadRequestError('Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await prisma.$transaction([
      // 1. Update user password
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash }
      }),
      // 2. Mark reset token as used
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true }
      }),
      // 3. Invalidate all sessions across all devices for this user
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId }
      }),
      // 4. Revoke all refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { revoked: true }
      })
    ]);

    const user = await userRepository.findById(resetRecord.userId);
    if (user) {
      emailService.sendPasswordChangedNotification(user.email, user.displayName).catch(() => {});
    }

    return { message: 'Password has been successfully updated. Please sign in with your new password.' };
  }

  /**
   * Change password for an authenticated user.
   * Verifies current password using bcrypt before hashing and saving new password.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('User does not have a local password set (e.g. signed in via Google).', 'OAUTH_ACCOUNT');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect.', 'INVALID_CREDENTIALS');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await userRepository.updatePassword(userId, newHash);

    emailService.sendPasswordChangedNotification(user.email, user.displayName).catch(() => {});

    return { message: 'Password updated successfully.' };
  }

  /**
   * Verify an email address using a valid, unexpired single-use verification token.
   */
  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!record || record.used || record.expiresAt <= new Date()) {
      throw new BadRequestError('Invalid or expired email verification token.', 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true }
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true }
      })
    ]);

    return { message: 'Email address verified successfully. You may now sign in.' };
  }

  /**
   * Resend verification email to an unverified user.
   */
  async resendVerification(email: string): Promise<{ message: string; devVerificationToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    const genericMessage = 'If an unverified account with this email exists, a verification link has been dispatched.';

    if (!user || user.emailVerified) {
      crypto.createHash('sha256').update(normalizedEmail).digest('hex');
      return { message: genericMessage };
    }

    // Invalidate existing unused verification tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        used: false
      }
    });

    emailService.sendVerificationEmail(user.email, user.displayName, rawToken).catch((err) => {
      console.warn('[AuthService] Could not resend verification email:', err?.message || err);
    });

    return {
      message: genericMessage,
      devVerificationToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined
    };
  }

  /**
   * Logout current session.
   */
  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await sessionRepository.deleteByTokenHash(tokenHash);
  }

  /**
   * Logout all sessions for a user (across all devices/browsers).
   */
  async logoutAll(userId: string): Promise<void> {
    await sessionRepository.deleteAllForUser(userId);
    await jwtService.revokeAllUserTokens(userId);
  }

  /**
   * Verify a raw session token from cookie.
   */
  async verifySession(rawToken: string): Promise<AuthenticatedUser | null> {
    const tokenHash = hashToken(rawToken);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await sessionRepository.deleteByTokenHash(tokenHash);
      return null;
    }

    const isVerificationEnforced = env.REQUIRE_EMAIL_VERIFICATION || process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (isVerificationEnforced && !session.user.emailVerified && !session.user.googleId) {
      return null;
    }

    sessionRepository.updateLastSeen(tokenHash).catch(() => {});

    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      role: session.user.role
    };
  }
}

export const authService = new AuthService();
