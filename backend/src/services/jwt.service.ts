import crypto from 'crypto';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { AuthenticatedUser } from '../types/index.js';

export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  iss: string;
  aud: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

const ISSUER = 'chess-mastery';
const AUDIENCE = 'chess-mastery-client';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class JwtService {
  /**
   * Generate a signed JWT Access Token with restricted algorithm and standard claims.
   */
  generateAccessToken(user: AuthenticatedUser): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      iss: ISSUER,
      aud: AUDIENCE
    };

    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as any
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  /**
   * Verify and decode a JWT Access Token.
   * Strictly enforces HS256 algorithm and issuer/audience claims.
   */
  verifyAccessToken(token: string): AuthenticatedUser {
    try {
      const options: VerifyOptions = {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE
      };

      const decoded = jwt.verify(token, env.JWT_SECRET, options) as JwtPayload;

      return {
        id: decoded.sub,
        email: decoded.email,
        displayName: decoded.displayName,
        role: decoded.role
      };
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'INVALID_TOKEN');
    }
  }

  /**
   * Generate a secure opaque refresh token, hash it, and store in the database.
   */
  async createRefreshToken(userId: string): Promise<string> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        revoked: false
      }
    });

    return rawToken;
  }

  /**
   * Generate both access token and refresh token for a user.
   */
  async generateTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }

  /**
   * Rotate a refresh token:
   * - Detects token reuse (if an already revoked token is used, revokes all tokens for that user!).
   * - Marks existing token as revoked.
   * - Issues a new access token and a new rotated refresh token.
   */
  async rotateRefreshToken(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Token Reuse Detection: If a revoked token is used, suspect theft and invalidate all sessions!
    if (storedToken.revoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revoked: true }
      });
      throw new UnauthorizedError(
        'Refresh token reuse detected. All sessions have been revoked for security.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    // Check expiry
    if (storedToken.expiresAt <= new Date()) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true }
      });
      throw new UnauthorizedError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const isVerificationEnforced = env.REQUIRE_EMAIL_VERIFICATION || process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (isVerificationEnforced && !storedToken.user.emailVerified && !storedToken.user.googleId) {
      throw new UnauthorizedError(
        'Email address must be verified before rotating tokens.',
        'EMAIL_NOT_VERIFIED'
      );
    }

    // Generate new refresh token
    const newRawToken = generateRawToken();
    const newTokenHash = hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Atomically revoke old and create new
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revoked: true,
          replacedBy: newTokenHash
        }
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.userId,
          expiresAt: newExpiresAt,
          revoked: false
        }
      })
    ]);

    const user: AuthenticatedUser = {
      id: storedToken.user.id,
      email: storedToken.user.email,
      displayName: storedToken.user.displayName,
      role: storedToken.user.role
    };

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newRawToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }

  /**
   * Explicitly revoke a refresh token (e.g. on logout).
   */
  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true }
    });
  }

  /**
   * Revoke all refresh tokens for a user (e.g., password reset, suspicious activity).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });
  }
}

export const jwtService = new JwtService();

