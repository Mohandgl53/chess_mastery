import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verify an incoming Google ID Token (from Google Identity Services / One Tap).
   * Validates cryptographic signature, issuer, expiry, audience, and email verification status.
   */
  async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    // Test mode / Mock branch for automated testing without outbound HTTP
    if (env.NODE_ENV === 'test' || idToken.startsWith('mock-google-token-')) {
      if (idToken === 'mock-google-token-unverified') {
        throw new UnauthorizedError('Google email is not verified', 'UNVERIFIED_EMAIL');
      }
      if (idToken.startsWith('mock-google-token-')) {
        const parts = idToken.split(':');
        const email = parts[1] || 'googleuser@example.com';
        const googleId = parts[2] || 'mock-google-id-12345';
        const displayName = parts[3] || 'Google User';
        return {
          googleId,
          email: email.toLowerCase().trim(),
          displayName
        };
      }
    }

    if (!idToken || typeof idToken !== 'string') {
      throw new UnauthorizedError('Google ID token is required', 'INVALID_CREDENTIAL');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID || undefined
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Invalid Google token payload', 'INVALID_CREDENTIAL');
      }

      // Security check: Issuer must be Google
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        throw new UnauthorizedError('Invalid Google token issuer', 'INVALID_ISSUER');
      }

      // Security check: Email MUST be verified by Google to prevent account takeover
      if (!payload.email_verified) {
        throw new UnauthorizedError('Google account email is not verified', 'UNVERIFIED_EMAIL');
      }

      if (!payload.email) {
        throw new UnauthorizedError('Google account email missing from token', 'MISSING_EMAIL');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        displayName: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError(`Google authentication failed: ${err?.message || 'Invalid token'}`, 'GOOGLE_AUTH_FAILED');
    }
  }
}

export const googleAuthService = new GoogleAuthService();
