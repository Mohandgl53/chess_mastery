import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { emailService } from '../src/services/email.service.js';
import {
  verifyTestAccount,
  getLatestTestVerificationToken,
  getLatestTestPasswordResetToken,
  createVerifiedTestUser
} from './helpers/test-auth-helper.js';

const app = createApp();

describe('TASK 8: E2E Verification & Security Acceptance Tests', () => {
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

  // -------------------------------------------------------------------------
  // Test A: Standard registration with unverified email
  // Confirm blocked login -> confirm no access to protected endpoints
  // -------------------------------------------------------------------------
  it('Test A: Standard registration with unverified email -> blocked login -> no access', async () => {
    const email = `e2e-test-a-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

    // 1. Register new user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test A User', password: testPassword });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.email).toBe(email);
    expect(regRes.body.user.emailVerified).toBe(false);
    expect(regRes.body.tokens).toBeUndefined();
    expect(regRes.headers['set-cookie']).toBeUndefined();

    // 2. Confirm blocked login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: testPassword });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(loginRes.headers['set-cookie']).toBeUndefined();

    // 3. Confirm no access to protected endpoints
    const protectedRes = await request(app).get('/api/auth/me');
    expect(protectedRes.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Test B: Open verification link -> confirm emailVerified = true -> confirm successful login
  // -------------------------------------------------------------------------
  it('Test B: Open verification link -> emailVerified marked true -> successful login', async () => {
    const email = `e2e-test-b-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test B User', password: testPassword });

    const rawToken = regRes.body.devVerificationToken;
    expect(rawToken).toBeDefined();

    // 2. Verify email via link token
    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rawToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.message).toContain('verified successfully');

    // Confirm DB status
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser!.emailVerified).toBe(true);

    // 3. Confirm login now succeeds
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: testPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie']).toBeDefined();
    expect(loginRes.body.user.emailVerified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test C: Resend verification email -> confirm old token invalidated -> confirm new token works
  // -------------------------------------------------------------------------
  it('Test C: Resend verification email -> old token invalidated -> new token works', async () => {
    const email = `e2e-test-c-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test C User', password: testPassword });

    const oldToken = regRes.body.devVerificationToken;

    // 2. Request resend
    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    expect(resendRes.status).toBe(200);
    const newToken = resendRes.body.data.devVerificationToken;
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    // 3. Confirm old token is invalidated
    const oldAttempt = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: oldToken });

    expect(oldAttempt.status).toBe(400);
    expect(oldAttempt.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');

    // 4. Confirm new token succeeds
    const newAttempt = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: newToken });

    expect(newAttempt.status).toBe(200);
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser!.emailVerified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test D: Forgot password -> open reset link -> update password -> confirm old password fails -> confirm new password succeeds
  // -------------------------------------------------------------------------
  it('Test D: Forgot password -> open reset link -> update password -> old fails, new succeeds', async () => {
    const email = `e2e-test-d-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // 1. Register and verify
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test D User', password: testPassword });

    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: regRes.body.devVerificationToken });

    // 2. Request forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.data.devResetToken;
    expect(resetToken).toBeDefined();

    // 3. Perform password reset
    const newPassword = 'BrandNewPassword789!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    expect(resetRes.status).toBe(200);

    // 4. Confirm old password fails
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: testPassword });

    expect(oldLogin.status).toBe(401);

    // 5. Confirm new password succeeds
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword });

    expect(newLogin.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // Test E: Try to use expired or tampered token for verification and reset -> confirm proper error
  // -------------------------------------------------------------------------
  it('Test E: Expired or tampered tokens for verification & reset return 400', async () => {
    const email = `e2e-test-e-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // 1. Tampered verification token
    const tamperedRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'completely-tampered-token-12345' });

    expect(tamperedRes.status).toBe(400);
    expect(tamperedRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');

    // 2. Tampered reset token
    const tamperedReset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'completely-tampered-reset-token-67890', password: 'AnyPassword123!' });

    expect(tamperedReset.status).toBe(400);
    expect(tamperedReset.body.error.code).toBe('INVALID_RESET_TOKEN');

    // 3. Expired verification token
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test E User', password: testPassword });

    const rawToken = regRes.body.devVerificationToken;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Force expire in DB
    await prisma.emailVerificationToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 60000) }
    });

    const expiredRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rawToken });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // -------------------------------------------------------------------------
  // Test F: Controlled test verification helper safely verifies test account
  // & strictly prohibits bypass when NODE_ENV === 'production'
  // -------------------------------------------------------------------------
  it('Test F: Controlled test verification helper verifies user & rejects in production', async () => {
    const email = `e2e-test-f-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // 1. Create unverified account
    await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test F User', password: testPassword });

    // Confirm unverified
    let user = await prisma.user.findUnique({ where: { email } });
    expect(user!.emailVerified).toBe(false);

    // 2. Use controlled test helper
    await verifyTestAccount(email);

    user = await prisma.user.findUnique({ where: { email } });
    expect(user!.emailVerified).toBe(true);

    // 3. Confirm helper strictly throws if NODE_ENV === 'production'
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      await expect(verifyTestAccount(email)).rejects.toThrow(/cannot be invoked in production/);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  // -------------------------------------------------------------------------
  // Test G: Controlled token retrieval works in test & strictly throws in production
  // -------------------------------------------------------------------------
  it('Test G: Controlled token retrieval functions safely & protects production', async () => {
    const email = `e2e-test-g-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test G User', password: testPassword });

    // Retrieve token via test helper
    const capturedToken = getLatestTestVerificationToken(email);
    expect(capturedToken).toBeDefined();

    // Confirm helper blocks in production
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() => getLatestTestVerificationToken(email)).toThrow(/cannot be invoked in production/);
      expect(() => getLatestTestPasswordResetToken(email)).toThrow(/cannot be invoked in production/);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  // -------------------------------------------------------------------------
  // Test H: Resend email delivery is safely mocked by default in automated tests
  // -------------------------------------------------------------------------
  it('Test H: Automated test mock mode operates without real Resend API calls', async () => {
    const email = `e2e-test-h-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    const emailCountBefore = emailService.sentEmails.length;

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test H Mock Player', password: testPassword });

    expect(res.status).toBe(201);
    expect(emailService.sentEmails.length).toBe(emailCountBefore + 1);

    const sent = emailService.sentEmails[emailService.sentEmails.length - 1];
    expect(sent.to).toBe(email);
    expect(sent.type).toBe('VERIFICATION');
  });

  // -------------------------------------------------------------------------
  // Test I: Password reset on unverified account preserves emailVerified = false
  // (Prevents forgot-password from becoming an unintended verification bypass)
  // -------------------------------------------------------------------------
  it('Test I: Password reset preserves emailVerified = false (no bypass backdoor)', async () => {
    const email = `e2e-test-i-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // 1. Register unverified user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Test I Unverified User', password: testPassword });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.emailVerified).toBe(false);

    // 2. Request password reset while unverified
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.data.devResetToken;
    expect(resetToken).toBeDefined();

    // 3. Reset password
    const newPassword = 'NewSecretPassword999!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: newPassword });

    expect(resetRes.status).toBe(200);

    // 4. Confirm account REMAINS unverified in the database
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser!.emailVerified).toBe(false);

    // 5. Confirm login is STILL rejected with EMAIL_NOT_VERIFIED when verification is enforced
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

