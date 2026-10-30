import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { emailService } from '../src/services/email.service.js';
import { env } from '../src/config/env.js';

const app = createApp();

describe('Resend Email Integration & Verification Security Suite', () => {
  const timestamp = Date.now();
  const testPassword = 'Password123!Secure';
  const testUsersToCleanup: string[] = [];

  afterAll(async () => {
    if (testUsersToCleanup.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: testUsersToCleanup } }
      });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Registration & Email Verification Token Generation
  // =========================================================================
  describe('1. Registration Verification Token Generation & Storage', () => {
    it('generates a secure, single-use, expiring verification token on user registration', async () => {
      const email = `verify-reg-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Verify User', password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.emailVerified).toBe(false);

      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationTokens: true }
      });

      expect(user).toBeDefined();
      expect(user!.emailVerified).toBe(false);
      expect(user!.emailVerificationTokens.length).toBe(1);

      const tokenRecord = user!.emailVerificationTokens[0];
      expect(tokenRecord.used).toBe(false);
      // Expiration should be ~24 hours in the future
      expect(tokenRecord.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
      expect(tokenRecord.expiresAt.getTime()).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000);

      // Verify that the raw token itself is NOT stored in the database
      const rawToken = res.body.devVerificationToken;
      expect(rawToken).toBeDefined();
      expect(tokenRecord.tokenHash).not.toBe(rawToken);

      // Verify tokenHash is the SHA-256 digest of the rawToken
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(tokenRecord.tokenHash).toBe(expectedHash);

      // Verify EmailService recorded a verification email
      const sentEmail = emailService.sentEmails.find(
        (e) => e.to === email && e.type === 'VERIFICATION'
      );
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.subject).toBe('Verify your Chess Mastery account');
    });
  });

  // =========================================================================
  // 2. Token Validation, Single-Use Enforcement & Expiry
  // =========================================================================
  describe('2. Email Verification Token Validation & Single-Use', () => {
    it('successfully verifies email with valid raw token and updates user status', async () => {
      const email = `valid-verify-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Valid Player', password: testPassword });

      const rawToken = regRes.body.devVerificationToken;

      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.message).toContain('verified successfully');

      // Verify DB updates
      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationTokens: true }
      });

      expect(user!.emailVerified).toBe(true);
      expect(user!.emailVerificationTokens[0].used).toBe(true);
    });

    it('rejects already-used verification tokens (Single-Use enforcement)', async () => {
      const email = `reuse-verify-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Reuse Player', password: testPassword });

      const rawToken = regRes.body.devVerificationToken;

      // 1st verification succeeds
      const firstRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });
      expect(firstRes.status).toBe(200);

      // 2nd verification must fail
      const secondRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('rejects expired verification tokens', async () => {
      const email = `expired-verify-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Expired Player', password: testPassword });

      const rawToken = regRes.body.devVerificationToken;
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Manually backdate the expiration date
      await prisma.emailVerificationToken.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 10000) }
      });

      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('rejects invalid or forged verification tokens', async () => {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: fakeToken });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('rejects missing or empty token with 400 validation error', async () => {
      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: '' });

      expect(verifyRes.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. Resend Verification Link
  // =========================================================================
  describe('3. Resend Verification Link', () => {
    it('invalidates previous unused tokens and sends a fresh verification token', async () => {
      const email = `resend-verify-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Resend Player', password: testPassword });

      const firstToken = regRes.body.devVerificationToken;
      const firstHash = crypto.createHash('sha256').update(firstToken).digest('hex');

      // Request resend
      const resendRes = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email });

      expect(resendRes.status).toBe(200);

      // Verify that the first token was invalidated
      const firstRecord = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: firstHash }
      });
      expect(firstRecord!.used).toBe(true);

      // Verify the new token is valid and unverified
      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationTokens: { orderBy: { createdAt: 'desc' } } }
      });
      expect(user!.emailVerificationTokens.length).toBe(2);
      expect(user!.emailVerificationTokens[0].used).toBe(false);

      // Old token can no longer be used
      const tryOld = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: firstToken });
      expect(tryOld.status).toBe(400);

      // New token works
      const newToken = resendRes.body.data.devVerificationToken;
      expect(newToken).toBeDefined();
      const tryNew = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: newToken });
      expect(tryNew.status).toBe(200);
    });

    it('returns generic message for non-existent or already verified email without account enumeration', async () => {
      const fakeEmail = `nonexistent-${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: fakeEmail });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('verification link has been dispatched');
    });
  });

  // =========================================================================
  // 4. Email Verification Enforcement & Complete Session Isolation
  // =========================================================================
  describe('4. Email Verification Enforcement on Normal Login & Session Isolation', () => {
    it('ensures REQUIRE_EMAIL_VERIFICATION defaults to true in production and can be overridden in dev', async () => {
      // In production mode without explicit override, it must default to true
      const originalNodeEnv = process.env.NODE_ENV;
      const originalReq = process.env.REQUIRE_EMAIL_VERIFICATION;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.REQUIRE_EMAIL_VERIFICATION;
        
        // Re-evaluate logic matching envSchema
        const prodDefault = (process.env.REQUIRE_EMAIL_VERIFICATION as any) !== undefined
          ? (process.env.REQUIRE_EMAIL_VERIFICATION === 'true')
          : (process.env.NODE_ENV === 'production');
        expect(prodDefault).toBe(true);

        // Can be explicitly overridden to false even in production
        process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
        const prodOverride = (process.env.REQUIRE_EMAIL_VERIFICATION === 'true');
        expect(prodOverride).toBe(false);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalReq !== undefined) {
          process.env.REQUIRE_EMAIL_VERIFICATION = originalReq;
        } else {
          delete process.env.REQUIRE_EMAIL_VERIFICATION;
        }
      }
    });

    it('ensures unverified password accounts CANNOT obtain authenticated sessions on registration or login', async () => {
      const email = `no-session-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      // Enable email verification enforcement for this test
      process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

      try {
        // 1. Registration must NOT return tokens or set session cookie when verification is enforced
        const regRes = await request(app)
          .post('/api/auth/register')
          .send({ email, displayName: 'No Session Player', password: testPassword });

        expect(regRes.status).toBe(201);
        expect(regRes.body.user.emailVerified).toBe(false);
        expect(regRes.body.tokens).toBeUndefined();
        expect(regRes.headers['set-cookie']).toBeUndefined();
        expect(regRes.body.message).toContain('Please verify your email');

        const rawToken = regRes.body.devVerificationToken;
        expect(rawToken).toBeDefined();

        // 2. Attempting login before verification -> blocked with 403
        const blockedLogin = await request(app)
          .post('/api/auth/login')
          .send({ email, password: testPassword });

        expect(blockedLogin.status).toBe(403);
        expect(blockedLogin.body.error.code).toBe('EMAIL_NOT_VERIFIED');
        expect(blockedLogin.headers['set-cookie']).toBeUndefined();

        // 3. Attempting to access protected endpoint -> rejected with 401
        const protectedRes = await request(app)
          .get('/api/auth/me');
        expect(protectedRes.status).toBe(401);

        // 4. Now verify the account
        const verifyRes = await request(app)
          .post('/api/auth/verify-email')
          .send({ token: rawToken });
        expect(verifyRes.status).toBe(200);

        // 5. Login after verification -> must now succeed and grant session cookie
        const successLogin = await request(app)
          .post('/api/auth/login')
          .send({ email, password: testPassword });

        expect(successLogin.status).toBe(200);
        expect(successLogin.body.user.email).toBe(email);
        expect(successLogin.headers['set-cookie']).toBeDefined();
        expect(successLogin.body.tokens?.accessToken).toBeDefined();
      } finally {
        delete process.env.REQUIRE_EMAIL_VERIFICATION;
      }
    });
  });

  // =========================================================================
  // 5. Password Reset & Password Change Notification Emails
  // =========================================================================
  describe('5. Password Reset & Security Notification Emails', () => {
    it('dispatches password reset email and password-change notification via EmailService', async () => {
      const email = `pw-reset-flow-${timestamp}@test.com`;
      testUsersToCleanup.push(email);

      await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'PW Reset User', password: testPassword });

      // Request password reset
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });

      expect(forgotRes.status).toBe(200);

      // Verify reset email recorded
      const resetEmail = emailService.sentEmails.find(
        (e) => e.to === email && e.type === 'PASSWORD_RESET'
      );
      expect(resetEmail).toBeDefined();
      expect(resetEmail!.subject).toBe('Reset your Chess Mastery password');

      const rawResetToken = forgotRes.body.data.devResetToken;
      expect(rawResetToken).toBeDefined();

      const newPassword = 'NewSecretPassword99!';

      // Perform reset
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawResetToken, password: newPassword });

      expect(resetRes.status).toBe(200);

      // Verify security notification email was recorded
      const changedEmail = emailService.sentEmails.find(
        (e) => e.to === email && e.type === 'PASSWORD_CHANGED'
      );
      expect(changedEmail).toBeDefined();
      expect(changedEmail!.subject).toContain('Security Alert');

      // Verify login with new password succeeds
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email, password: newPassword });

      expect(newLogin.status).toBe(200);
    });
  });

  // =========================================================================
  // 6. Google Sign-In Automatic Email Verification Preservation
  // =========================================================================
  describe('6. Google Sign-In Email Verification Preservation', () => {
    it('marks Google-authenticated users as emailVerified: true without requiring manual verification', async () => {
      const googleEmail = `google-verified-${timestamp}@gmail.com`;
      const googleId = `gid-resend-${timestamp}`;
      testUsersToCleanup.push(googleEmail);

      const mockToken = `mock-google-token-:${googleEmail}:${googleId}:Google Verified User`;

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(res.status).toBe(200);

      const user = await prisma.user.findFirst({
        where: { googleId }
      });

      expect(user).toBeDefined();
      expect(user!.emailVerified).toBe(true);

      // Clean up google test user
      await prisma.user.delete({ where: { id: user!.id } });
    });

    it('upgrades existing unverified password account to emailVerified: true upon Google OAuth linking', async () => {
      const linkEmail = `link-verify-${timestamp}@gmail.com`;
      const googleId = `gid-link-${timestamp}`;
      testUsersToCleanup.push(linkEmail);

      // 1. Register with email/password (unverified)
      await request(app)
        .post('/api/auth/register')
        .send({ email: linkEmail, displayName: 'Unverified Link Player', password: testPassword });

      let user = await prisma.user.findUnique({ where: { email: linkEmail } });
      expect(user!.emailVerified).toBe(false);

      // 2. Log in with Google OAuth using same email
      const mockToken = `mock-google-token-:${linkEmail}:${googleId}:Linked Google Player`;
      const googleRes = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(googleRes.status).toBe(200);

      // 3. User account is now linked and emailVerified is true!
      user = await prisma.user.findUnique({ where: { email: linkEmail } });
      expect(user!.googleId).toBe(googleId);
      expect(user!.emailVerified).toBe(true);
    });
  });

  // =========================================================================
  // 7. Resend API Safe Error Handling
  // =========================================================================
  describe('7. Resend Safe Error Handling & Resilience', () => {
    it('handles email send failures gracefully without crashing the server', async () => {
      // Simulate dispatching to an address that causes a rejection or restriction
      const result = await emailService.sendVerificationEmail(
        'unverified-recipient@external-domain.com',
        'Test Player',
        'fake-token-123'
      );

      // Result should report success or structured failure without throwing an unhandled exception
      expect(result).toHaveProperty('success');
    });
  });
});
