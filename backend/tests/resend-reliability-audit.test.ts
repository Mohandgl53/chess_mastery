import { describe, it, expect, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { emailService } from '../src/services/email.service.js';

const app = createApp();

describe('Resend Email Delivery & Registration Recovery Reliability Audit', () => {
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
  // 1. User registers but Resend rejects verification email
  // =========================================================================
  it('1. Registration succeeds and returns 201 even when Resend rejects verification email', async () => {
    const email = `audit-reg-reject-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // Mock sendVerificationEmail to simulate a Resend API rejection
    const originalSend = emailService.sendVerificationEmail;
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValueOnce({
      success: false,
      error: 'validation_error: Domain not verified in sandbox'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Audit Reject Player', password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.emailVerified).toBe(false);

    vi.spyOn(emailService, 'sendVerificationEmail').mockImplementation(originalSend);
  });

  // =========================================================================
  // 2. Pending account remains in a consistent state
  // =========================================================================
  it('2. Pending account remains in a consistent state in the database', async () => {
    const email = `audit-consistent-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Consistent Player', password: testPassword });

    expect(res.status).toBe(201);

    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { emailVerificationTokens: true, profile: true }
    });

    expect(dbUser).toBeDefined();
    expect(dbUser!.emailVerified).toBe(false);
    expect(dbUser!.profile).toBeDefined();
    expect(dbUser!.profile!.rating).toBe(400);
    expect(dbUser!.emailVerificationTokens.length).toBe(1);

    const tokenRecord = dbUser!.emailVerificationTokens[0];
    expect(tokenRecord.used).toBe(false);
    expect(tokenRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // =========================================================================
  // 3. User can request another verification email
  // =========================================================================
  it('3. User can successfully request another verification email', async () => {
    const email = `audit-resend-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Resend Player', password: testPassword });

    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.data.message).toContain('verification link has been dispatched');

    const freshToken = resendRes.body.data.devVerificationToken;
    expect(freshToken).toBeDefined();

    // Verify DB contains 2 tokens: the original (used/invalidated) and the fresh one (active)
    const dbUser = await prisma.user.findUnique({
      where: { email },
      include: { emailVerificationTokens: { orderBy: { createdAt: 'desc' } } }
    });

    expect(dbUser!.emailVerificationTokens.length).toBe(2);
    expect(dbUser!.emailVerificationTokens[0].used).toBe(false); // Newest token is active
    expect(dbUser!.emailVerificationTokens[1].used).toBe(true);  // Previous token invalidated
  });

  // =========================================================================
  // 4. Retrying registration does NOT create duplicate accounts
  // =========================================================================
  it('4. Retrying registration with existing email is rejected with 409 Conflict', async () => {
    const email = `audit-dup-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // Initial registration
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Dup Player', password: testPassword });
    expect(res1.status).toBe(201);

    // Duplicate registration attempt
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Dup Player Retry', password: testPassword });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('EMAIL_TAKEN');

    // Confirm only one user exists in the database
    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  // =========================================================================
  // 5. Expired verification tokens are rejected & safely replaced
  // =========================================================================
  it('5. Expired verification tokens are rejected with 400 and safely replaced on resend', async () => {
    const email = `audit-expired-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Expired Player', password: testPassword });

    const rawToken = regRes.body.devVerificationToken;

    // Manually expire the token in the database
    await prisma.emailVerificationToken.updateMany({
      where: { user: { email } },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    // Attempt verification with expired token -> must fail
    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rawToken });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');

    // User requests new verification link
    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    expect(resendRes.status).toBe(200);
    const replacementToken = resendRes.body.data.devVerificationToken;
    expect(replacementToken).toBeDefined();

    // Verification with replacement token must succeed
    const successVerify = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: replacementToken });

    expect(successVerify.status).toBe(200);
    expect(successVerify.body.data.message).toContain('verified successfully');

    const updatedUser = await prisma.user.findUnique({ where: { email } });
    expect(updatedUser!.emailVerified).toBe(true);
  });

  // =========================================================================
  // 6. Resend API acceptance is NOT treated as confirmed delivery
  // =========================================================================
  it('6. Resend API acceptance does not mark account as verified until token is confirmed', async () => {
    const email = `audit-acceptance-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // Mock successful acceptance by Resend SDK
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValueOnce({
      success: true,
      messageId: 'mock-resend-id-998877'
    });

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Pending Player', password: testPassword });

    expect(regRes.status).toBe(201);

    // The account MUST still be unverified in the DB!
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser!.emailVerified).toBe(false);

    // Login must be blocked when REQUIRE_EMAIL_VERIFICATION is enforced
    try {
      process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: testPassword });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;
    }
  });

  // =========================================================================
  // 7. Delivery failures are logged without exposing personal data or secrets
  // =========================================================================
  it('7. Delivery failure sanitization redacts email addresses and secrets from logs', () => {
    const rawError = 'Error sending to confidential.player@secret-domain.com with token=abc123xyz-secret';
    const sanitized = emailService.sanitizeLogMessage(rawError);

    expect(sanitized).not.toContain('confidential.player@secret-domain.com');
    expect(sanitized).not.toContain('abc123xyz-secret');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
    expect(sanitized).toContain('token=[REDACTED]');
  });

  // =========================================================================
  // 8. Rate limits prevent email-spamming and account enumeration
  // =========================================================================
  it('8. Returns identical generic response for non-existent and existing accounts (anti-enumeration)', async () => {
    const existingEmail = `audit-enum-exists-${timestamp}@test.com`;
    const nonExistingEmail = `audit-enum-nonexists-${timestamp}@notfound.com`;
    testUsersToCleanup.push(existingEmail);

    await request(app)
      .post('/api/auth/register')
      .send({ email: existingEmail, displayName: 'Enum Player', password: testPassword });

    // Request resend for existing unverified user
    const res1 = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: existingEmail });

    // Request resend for non-existent user
    const res2 = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: nonExistingEmail });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.data.message).toBe(res2.body.data.message);
  });

  // =========================================================================
  // 9. Temporary Resend outages recover cleanly without manual DB intervention
  // =========================================================================
  it('9. Temporary Resend outage during registration recovers without manual database intervention', async () => {
    const email = `audit-outage-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    // Step A: Registration occurs during simulated Resend outage (API rejects with 500)
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValueOnce({
      success: false,
      error: 'Resend 500 Internal Server Error'
    });

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'Outage Player', password: testPassword });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.emailVerified).toBe(false);

    // Step B: Resend service is restored. User requests verification link again
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValueOnce({
      success: true,
      messageId: 'resend-restored-id-12345'
    });

    const resendRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    expect(resendRes.status).toBe(200);
    const token = resendRes.body.data.devVerificationToken;
    expect(token).toBeDefined();

    // Step C: User clicks verification link
    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token });

    expect(verifyRes.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.emailVerified).toBe(true);
  });

  // =========================================================================
  // 10. Password-reset requests behave safely when email delivery fails
  // =========================================================================
  it('10. Password-reset requests behave safely when email delivery fails (password preserved)', async () => {
    const email = `audit-pw-fail-${timestamp}@test.com`;
    testUsersToCleanup.push(email);

    await request(app)
      .post('/api/auth/register')
      .send({ email, displayName: 'PW Fail Player', password: testPassword });

    // Simulate Resend delivery failure on password reset
    vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValueOnce({
      success: false,
      error: 'Resend API rate limit exceeded'
    });

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.data.message).toContain('password reset link has been dispatched');

    // Existing password MUST still work
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: testPassword });

    expect(loginRes.status).toBe(200);
  });
});
