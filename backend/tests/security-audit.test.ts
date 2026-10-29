import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { jwtService } from '../src/services/jwt.service.js';

const app = createApp();

const timestamp = Date.now();
const testUserEmail = `sec-user-${timestamp}@chesscoach.test`;
const testAdminEmail = `sec-admin-${timestamp}@chesscoach.test`;
const otherUserEmail = `sec-other-${timestamp}@chesscoach.test`;
const testPassword = 'StrongPassword123!';

let testUserId: string;
let testAdminId: string;
let otherUserId: string;

let userCookie: string;
let userAccessToken: string;
let userRefreshToken: string;

let adminCookie: string;
let adminAccessToken: string;

describe('Security Audit & Hardening Verification Suite', () => {
  beforeAll(async () => {
    // 1. Create standard test user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUserEmail,
        displayName: 'Standard User',
        password: testPassword
      });
    expect(userRes.status).toBe(201);
    testUserId = userRes.body.user.id;
    const cookieHeader = userRes.headers['set-cookie'];
    userCookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(';')[0] : cookieHeader.split(';')[0];
    userAccessToken = userRes.body.tokens.accessToken;
    userRefreshToken = userRes.body.tokens.refreshToken;

    // 2. Create admin user and promote to ADMIN
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testAdminEmail,
        displayName: 'Security Admin',
        password: testPassword
      });
    expect(adminRes.status).toBe(201);
    testAdminId = adminRes.body.user.id;
    const adminCookieHeader = adminRes.headers['set-cookie'];
    adminCookie = Array.isArray(adminCookieHeader) ? adminCookieHeader[0].split(';')[0] : adminCookieHeader.split(';')[0];
    adminAccessToken = adminRes.body.tokens.accessToken;

    // Elevate admin in DB
    await prisma.user.update({
      where: { id: testAdminId },
      data: { role: 'ADMIN' }
    });

    // Re-login admin to refresh claims
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdminEmail, password: testPassword });
    adminAccessToken = adminLoginRes.body.tokens.accessToken;
    const newAdminCookie = adminLoginRes.headers['set-cookie'];
    adminCookie = Array.isArray(newAdminCookie) ? newAdminCookie[0].split(';')[0] : newAdminCookie.split(';')[0];

    // 3. Create another user for isolation tests
    const otherRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: otherUserEmail,
        displayName: 'Other User',
        password: testPassword
      });
    otherUserId = otherRes.body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            testUserEmail,
            testAdminEmail,
            otherUserEmail,
            'google-audit@example.com',
            'link-google@example.com'
          ]
        }
      }
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Authentication & Password Security
  // =========================================================================
  describe('1. Authentication & Password Security', () => {
    it('passwordHash is stored as a bcrypt hash ($2b$) and never plaintext', async () => {
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user).not.toBeNull();
      expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
      expect(user!.passwordHash).not.toBe(testPassword);
    });

    it('passwordHash is never exposed in login or registration response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('forgot-password returns generic message for non-existent email (prevents enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent-random-user@fake.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('If an account with this email exists');
    });

    it('forgot-password creates unexpired reset token in DB and reset-password updates hash', async () => {
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(forgotRes.status).toBe(200);
      const devToken = forgotRes.body.data.devResetToken;
      expect(devToken).toBeDefined();

      const newPassword = 'NewSecretPassword999!';
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: devToken, password: newPassword });

      expect(resetRes.status).toBe(200);

      // Verify old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password works
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: newPassword });
      expect(newLoginRes.status).toBe(200);
      // Restore password for other tests
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: (await request(app).post('/api/auth/forgot-password').send({ email: testUserEmail })).body.data.devResetToken,
          password: testPassword
        });
    });

    it('logout-all invalidates all active sessions across devices', async () => {
      // Create a fresh session
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword });
      const cookie = loginRes.headers['set-cookie'][0].split(';')[0];

      // Logout all
      const logoutAllRes = await request(app)
        .post('/api/auth/logout-all')
        .set('Cookie', cookie);
      expect(logoutAllRes.status).toBe(200);

      // Previous cookie is now invalid
      const checkRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);
      expect(checkRes.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. JWT Security & Refresh Token Rotation
  // =========================================================================
  describe('2. JWT Security & Refresh Token Rotation', () => {
    it('authenticates successfully via Authorization: Bearer <jwt>', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(testUserId);
      expect(res.body.user.email).toBe(testUserEmail);
    });

    it('rejects tampered or forged JWT access tokens', async () => {
      const tampered = userAccessToken.slice(0, -6) + 'xxxxxx';
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });

    it('rotates refresh token and issues a new valid token pair', async () => {
      // Obtain a fresh active refresh token via login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword });
      expect(loginRes.status).toBe(200);
      const activeRefreshToken = loginRes.body.tokens.refreshToken;

      const rotateRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: activeRefreshToken });

      expect(rotateRes.status).toBe(200);
      expect(rotateRes.body.data).toHaveProperty('accessToken');
      expect(rotateRes.body.data).toHaveProperty('refreshToken');

      const newAccessToken = rotateRes.body.data.accessToken;
      const newRefreshToken = rotateRes.body.data.refreshToken;

      // New access token works
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);
      expect(meRes.status).toBe(200);

      // Attempting to reuse old refresh token triggers TOKEN_REUSE_DETECTED
      const reuseRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: activeRefreshToken });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // The new refresh token has now been revoked as part of the reuse security penalty
      const penalizedRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: newRefreshToken });
      expect(penalizedRes.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. Authorization & RBAC
  // =========================================================================
  describe('3. Role-Based Access Control (RBAC) & Authorization', () => {
    it('regular USER cannot access GET /api/admin/users (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('ADMIN can access GET /api/admin/users and GET /api/admin/system', async () => {
      const usersRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(usersRes.status).toBe(200);
      expect(Array.isArray(usersRes.body.data)).toBe(true);

      const sysRes = await request(app)
        .get('/api/admin/system')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(sysRes.status).toBe(200);
      expect(sysRes.body.data).toHaveProperty('uptimeSeconds');
      expect(sysRes.body.data).toHaveProperty('users');
    });

    it('ADMIN cannot demote self (prevents accidental lockout)', async () => {
      const demoteRes = await request(app)
        .patch(`/api/admin/users/${testAdminId}/role`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ role: 'USER' });

      expect(demoteRes.status).toBe(400);
      expect(demoteRes.body.error.code).toBe('CANNOT_DEMOTE_SELF');
    });

    it('public profile GET /api/users/:userId does NOT leak email to other users', async () => {
      const res = await request(app)
        .get(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(otherUserId);
      expect(res.body.data.email).toBeUndefined(); // PII protected!
    });
  });

  // =========================================================================
  // 4. Google Login (OAuth 2.0 / OpenID Connect)
  // =========================================================================
  describe('4. Google Sign-In & Safe Account Linking', () => {
    it('authenticates and creates user with verified Google token', async () => {
      const mockToken = 'mock-google-token-:google-audit@example.com:gid-998877:Google Champion';
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('google-audit@example.com');
      expect(res.body.user.displayName).toBe('Google Champion');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body).toHaveProperty('tokens');
    });

    it('rejects unverified Google accounts', async () => {
      const unverifiedToken = 'mock-google-token-unverified';
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: unverifiedToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNVERIFIED_EMAIL');
    });

    it('links Google ID to existing email account without duplicate creation', async () => {
      const email = 'link-google@example.com';
      // Register with email/password first
      await request(app)
        .post('/api/auth/register')
        .send({ email, displayName: 'Link Account', password: testPassword });

      // Now log in with Google ID token matching that email
      const mockToken = `mock-google-token-:${email}:gid-554433:Link Account Google`;
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);

      // Verify Google ID was linked in DB
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user!.googleId).toBe('gid-554433');
    });
  });

  // =========================================================================
  // 5. Rate Limiting
  // =========================================================================
  describe('5. Rate Limiting', () => {
    it('returns standard RateLimit headers on requests', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('x-test-rate-limit', 'true');

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });
});
