import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { jwtService } from '../src/services/jwt.service.js';
import { authService } from '../src/services/auth.service.js';

const app = createApp();
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = 'OriginalPassword123!';
const resetUserEmail = `token-race-reset-${stamp}@chesscoach.test`;
const verifyUserEmail = `token-race-verify-${stamp}@chesscoach.test`;

function rejectionCode(result: PromiseSettledResult<unknown>): string | undefined {
  return result.status === 'rejected' ? (result.reason as any)?.code : undefined;
}

describe('Single-use token and refresh rotation race hardening', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [resetUserEmail, verifyUserEmail] } }
    });
    await prisma.$disconnect();
  });

  it('allows exactly one atomic refresh-token claim and detects concurrent reuse', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: resetUserEmail, displayName: 'Token Race User', password });
    expect(reg.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: resetUserEmail } });
    const pair = await jwtService.generateTokenPair({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    });

    const results = await Promise.allSettled([
      jwtService.rotateRefreshToken(pair.refreshToken),
      jwtService.rotateRefreshToken(pair.refreshToken)
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejectionCode(rejected[0])).toBe('TOKEN_REUSE_DETECTED');
    expect(fulfilled[0].value.refreshToken).not.toBe(pair.refreshToken);
    expect(fulfilled[0].value.accessToken).toBeTruthy();

    // Reuse detection revokes the whole family, including the winner's replacement.
    const allTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(allTokens.length).toBeGreaterThanOrEqual(2);
    expect(allTokens.every((token) => token.revoked)).toBe(true);
  });

  it('allows exactly one password reset from a single-use reset token', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: resetUserEmail });
    expect(forgot.status).toBe(200);
    const token = forgot.body.data.devResetToken as string;
    expect(token).toBeTruthy();

    const passwords = ['WinnerPasswordA123!', 'WinnerPasswordB123!'];
    const results = await Promise.allSettled([
      authService.resetPassword(token, passwords[0]),
      authService.resetPassword(token, passwords[1])
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejectionCode(rejected[0])).toBe('INVALID_RESET_TOKEN');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: resetUserEmail } });
    const winningIndex = results.indexOf(fulfilled[0]);
    expect(await bcrypt.compare(passwords[winningIndex], user.passwordHash!)).toBe(true);
    expect(await bcrypt.compare(password, user.passwordHash!)).toBe(false);

    const tokenRow = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') }
    });
    expect(tokenRow?.used).toBe(true);
  });

  it('allows exactly one email verification from a single-use verification token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: verifyUserEmail, displayName: 'Verify Race User', password });
    expect(reg.status).toBe(201);
    const token = reg.body.devVerificationToken as string;
    expect(token).toBeTruthy();

    const results = await Promise.allSettled([
      authService.verifyEmail(token),
      authService.verifyEmail(token)
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejectionCode(rejected[0])).toBe('INVALID_VERIFICATION_TOKEN');

    const user = await prisma.user.findUniqueOrThrow({ where: { email: verifyUserEmail } });
    expect(user.emailVerified).toBe(true);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRow = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    expect(tokenRow?.used).toBe(true);
  });
});
