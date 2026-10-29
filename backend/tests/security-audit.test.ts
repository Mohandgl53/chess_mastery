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

    it('change-password rejects incorrect current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          currentPassword: 'WrongPassword999!',
          newPassword: 'UpdatedPassword777!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('change-password securely hashes new password and updates credentials', async () => {
      const updatedPassword = 'BrandNewPassword888!';
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: updatedPassword
        });

      expect(res.status).toBe(200);

      // Verify DB hash is bcrypt $2b$
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
      expect(user!.passwordHash).not.toBe(updatedPassword);

      // Verify login with new password succeeds
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: updatedPassword });
      expect(newLogin.status).toBe(200);

      // Reset back for remaining tests
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${newLogin.body.tokens.accessToken}`)
        .send({
          currentPassword: updatedPassword,
          newPassword: testPassword
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

    it('creates exactly one user and the expected starting PlayerProfile for a new Google user', async () => {
      const ts = Date.now();
      const email = `new-google-user-${ts}@test.com`;
      const googleId = `gid-unique-${ts}`;
      const mockToken = `mock-google-token-:${email}:${googleId}:New Player`;
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
      expect(res.body.profile.rating).toBe(800);
      expect(res.body.profile.gamesPlayed).toBe(0);

      // Verify DB records
      const users = await prisma.user.findMany({ where: { email } });
      expect(users.length).toBe(1);

      const profile = await prisma.playerProfile.findUnique({ where: { userId: users[0].id } });
      expect(profile).toBeDefined();
      expect(profile!.rating).toBe(800);

      // Subsequent login with the same Google ID does NOT duplicate the user or profile
      const res2 = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });
      expect(res2.status).toBe(200);

      const usersAfter = await prisma.user.findMany({ where: { email } });
      expect(usersAfter.length).toBe(1);

      // Clean up
      await prisma.user.delete({ where: { email } });
    });

    it('rejects tokens issued for a different Google Client ID', async () => {
      const wrongAudienceToken = 'mock-google-token-wrong-audience';
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: wrongAudienceToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_AUDIENCE');
    });

    it('rejects expired Google ID tokens', async () => {
      const expiredToken = 'mock-google-token-expired';
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: expiredToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects malformed or invalid Google ID tokens', async () => {
      const malformedToken = 'mock-google-token-malformed';
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: malformedToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIAL');
    });

    it('failed Google authentication never creates an authenticated session or cookie', async () => {
      const beforeSessions = await prisma.session.count();
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'mock-google-token-unverified' });

      expect(res.status).toBe(401);
      // No session cookie should be set
      const cookies = res.headers['set-cookie'] || [];
      const sessionCookie = cookies.find((c: string) => c.includes('chess_coach_session'));
      expect(sessionCookie).toBeUndefined();

      // No new DB session should be created
      const afterSessions = await prisma.session.count();
      expect(afterSessions).toBe(beforeSessions);
    });

    it('validates authentication cookies follow security policy (HttpOnly, SameSite)', async () => {
      const tsCookie = Date.now();
      const emailCookie = `cookie-check-${tsCookie}@test.com`;
      const mockToken = `mock-google-token-:${emailCookie}:gid-cookie-${tsCookie}:Cookie Tester`;
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: mockToken });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('SameSite=Lax');
      expect(cookieStr).toContain('Path=/');

      // Clean up
      await prisma.user.delete({ where: { email: emailCookie } });
    });

    it('allows Google login from Docker development origin http://localhost and Vite http://localhost:5173', async () => {
      // Test with Docker origin http://localhost
      const tsDocker = Date.now();
      const emailDocker = `docker-origin-${tsDocker}@test.com`;
      const gidDocker = `gid-dock-${tsDocker}`;
      const resDocker = await request(app)
        .post('/api/auth/google')
        .set('Origin', 'http://localhost')
        .send({ credential: `mock-google-token-:${emailDocker}:${gidDocker}:Docker User` });

      expect(resDocker.status).toBe(200);
      expect(resDocker.body.user.email).toBe(emailDocker);

      // Test with Vite origin http://localhost:5173
      const tsVite = Date.now() + 1;
      const emailVite = `vite-origin-${tsVite}@test.com`;
      const gidVite = `gid-vite-${tsVite}`;
      const resVite = await request(app)
        .post('/api/auth/google')
        .set('Origin', 'http://localhost:5173')
        .send({ credential: `mock-google-token-:${emailVite}:${gidVite}:Vite User` });

      expect(resVite.status).toBe(200);
      expect(resVite.body.user.email).toBe(emailVite);

      // Clean up
      await prisma.user.deleteMany({ where: { email: { in: [emailDocker, emailVite] } } });
    });
  });

  // =========================================================================
  // 5. Rate Limiting
  // =========================================================================
  describe('5. Rate Limiting', () => {
    it('rejects registration requests with malicious Origin (CSRF protection)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', 'http://malicious-attacker-website.com')
        .send({
          email: `csrf-test-${Date.now()}@test.com`,
          displayName: 'CSRF Attacker',
          password: 'Password123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_FORBIDDEN');
    });

    it('prevents privilege escalation during registration (role parameter is ignored)', async () => {
      const escalateEmail = `escalate-${Date.now()}@test.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: escalateEmail,
          displayName: 'Escalation Attempt',
          password: testPassword,
          role: 'ADMIN' // Malicious injection attempt
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('USER');

      // Verify in DB directly
      const user = await prisma.user.findUnique({ where: { email: escalateEmail } });
      expect(user!.role).toBe('USER');

      // Clean up
      await prisma.user.delete({ where: { email: escalateEmail } });
    });

    it('rejects oversized passwords to prevent Hash DoS attacks', async () => {
      const oversizedPassword = 'A'.repeat(5000);
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: oversizedPassword
        });

      expect(res.status).toBe(400);
    });

    it('returns standard RateLimit headers on requests', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('x-test-rate-limit', 'true');

      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });

  // =========================================================================
  // 6. Database Query Safety, Parameterization & Bounded Pagination
  // =========================================================================
  describe('6. Database Query Safety & Injection Resistance', () => {
    it('rejects SQL injection payloads in enum query filters with 400', async () => {
      const injectionStatus = "' OR 1=1 --";
      const res = await request(app)
        .get(`/api/games?status=${encodeURIComponent(injectionStatus)}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(400);
    });

    it('clamps negative or excessively large pagination parameters to safe bounds', async () => {
      const res = await request(app)
        .get('/api/games?page=-5&limit=999999')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('raw full-text and vector RAG search safely parameterizes SQL injection attempts', async () => {
      // Execute a coach question containing aggressive SQL injection tokens
      const injectionQuery = "'; DROP TABLE \"User\"; SELECT * FROM \"KnowledgeChunk\" WHERE '1'='1";
      const res = await request(app)
        .post('/api/coach/chat')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          query: injectionQuery,
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
        });

      // The server safely handles it as text (HTTP 200) or structured error without crashing or executing SQL
      expect([200, 400]).toContain(res.status);

      // Verify User table is completely intact
      const userCount = await prisma.user.count();
      expect(userCount).toBeGreaterThan(0);
    });
  });
});
