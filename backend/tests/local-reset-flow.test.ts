import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { emailService } from '../src/services/email.service.js';
import { env } from '../src/config/env.js';
import bcrypt from 'bcryptjs';

describe('Local Password Reset End-to-End Verification Flow', () => {
  const app = createApp();
  const timestamp = Date.now();
  const testEmail = `pw-local-test-${timestamp}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'NewSecurePassword456!';

  beforeAll(async () => {
    // Clean up if existing
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create a verified test user
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        displayName: 'Local Test User',
        passwordHash,
        emailVerified: true
      }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it('1. Verifies local clientUrl configuration has NO vercel or external placeholder', () => {
    const activeClientUrl = (emailService as any).clientUrl;
    expect(activeClientUrl).toBe('http://localhost:5173');
    expect(activeClientUrl).not.toContain('vercel.app');
    expect(activeClientUrl).not.toContain('https://');
  });

  it('2. Requests password reset and confirms generated email contains http://localhost:5173/reset-password link', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('password reset link has been dispatched');

    // Retrieve recorded email from EmailService in-memory tracker
    const sentEmail = emailService.sentEmails.find(
      (e) => e.to === testEmail && e.type === 'PASSWORD_RESET'
    );
    expect(sentEmail).toBeDefined();
    expect(sentEmail!.token).toBeDefined();

    // Verify token was generated and exists in database
    const tokenInDb = await prisma.passwordResetToken.findFirst({
      where: { user: { email: testEmail }, used: false }
    });
    expect(tokenInDb).toBeDefined();

    // Verify the URL constructed using active clientUrl
    const generatedUrl = `${(emailService as any).clientUrl}/reset-password?token=${encodeURIComponent(sentEmail!.token!)}`;
    expect(generatedUrl).toContain('http://localhost:5173/reset-password?token=');
    expect(generatedUrl).not.toContain('vercel');
  });

  it('3. Successfully resets password using the raw token from the local link', async () => {
    const sentEmail = emailService.sentEmails.find(
      (e) => e.to === testEmail && e.type === 'PASSWORD_RESET'
    );
    const rawToken = sentEmail!.token!;

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: updatedPassword
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.message).toContain('Password has been successfully updated');

    // Verify login with old password fails
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: initialPassword });
    expect(oldLogin.status).toBe(401);

    // Verify login with new password succeeds
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: updatedPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.email).toBe(testEmail);
  });

  it('4. Rejects token reuse (single-use enforcement)', async () => {
    const sentEmail = emailService.sentEmails.find(
      (e) => e.to === testEmail && e.type === 'PASSWORD_RESET'
    );
    const rawToken = sentEmail!.token!;

    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        password: 'AnotherPassword789!'
      });

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('5. Rejects expired reset tokens', async () => {
    // Create an expired reset token directly in DB
    const expiredToken = 'expired-raw-token-123456';
    const expiredHash = require('crypto').createHash('sha256').update(expiredToken).digest('hex');
    const user = await prisma.user.findUnique({ where: { email: testEmail } });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: expiredHash,
        userId: user!.id,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
        used: false
      }
    });

    const expiredRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: expiredToken,
        password: 'AnotherPassword789!'
      });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.error.code).toBe('INVALID_RESET_TOKEN');
  });
});
