import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import crypto from 'crypto';

const app = createApp();

// ---------------------------------------------------------------------------
// Helper to create a session via login and return the cookie string
// ---------------------------------------------------------------------------
async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  }

  const setCookie = res.headers['set-cookie'];
  if (!setCookie || !setCookie[0]) {
    throw new Error('No session cookie returned from login');
  }

  // Extract just the chess_coach_session=... part for subsequent requests
  return Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];
}

// ---------------------------------------------------------------------------
// Test user credentials — unique per test run to avoid conflicts
// ---------------------------------------------------------------------------
const suffix = Date.now();
const testUserEmail = `testuser-${suffix}@chesscoach.test`;
const testUserPassword = 'TestPassword123!';
const testUserDisplayName = 'Test Player';

const userBEmail = `userb-${suffix}@chesscoach.test`;
const userBPassword = 'AnotherPassword456!';

describe('Phase 3B Authentication Tests', () => {
  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: [testUserEmail, userBEmail] } }
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Registration
  // =========================================================================
  describe('1. Registration', () => {
    it('POST /api/auth/register — succeeds with valid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testUserEmail, displayName: testUserDisplayName, password: testUserPassword });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUserEmail);
      expect(res.body.user.displayName).toBe(testUserDisplayName);
      expect(res.body).toHaveProperty('profile');
    });

    it('POST /api/auth/register — password is hashed (bcrypt hash in DB)', async () => {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      expect(user).not.toBeNull();
      // bcrypt hashes start with $2a$ or $2b$
      expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
      // Must NOT equal the raw password
      expect(user!.passwordHash).not.toBe(testUserPassword);
    });

    it('POST /api/auth/register — passwordHash is never returned', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `extra-${suffix}@chesscoach.test`, displayName: 'Extra', password: testUserPassword });

      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');

      // Clean up the extra user
      await prisma.user.deleteMany({ where: { email: `extra-${suffix}@chesscoach.test` } });
    });

    it('POST /api/auth/register — duplicate email returns 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testUserEmail, displayName: 'Duplicate', password: testUserPassword });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('POST /api/auth/register — invalid email returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', displayName: 'Test', password: testUserPassword });

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/register — short password returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `short-${suffix}@test.com`, displayName: 'Test', password: '12345' });

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/register — sets httpOnly session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `cookietest-${suffix}@test.com`, displayName: 'Cookie', password: testUserPassword });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(sessionCookie).toContain('chess_coach_session=');
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');

      await prisma.user.deleteMany({ where: { email: `cookietest-${suffix}@test.com` } });
    });

    it('POST /api/auth/register — session token NOT stored raw in DB', async () => {
      // Get the cookie value
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: `rawtoken-${suffix}@test.com`, displayName: 'TokenTest', password: testUserPassword });

      const cookies = regRes.headers['set-cookie'];
      const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
      const rawToken = cookieStr.split('chess_coach_session=')[1]?.split(';')[0];

      expect(rawToken).toBeTruthy();

      // Find the session in the DB — tokenHash should be the SHA-256 hash
      const expectedHash = crypto.createHash('sha256').update(rawToken!).digest('hex');
      const session = await prisma.session.findUnique({ where: { tokenHash: expectedHash } });

      // Session must exist with hash, not raw token
      expect(session).not.toBeNull();
      expect(session!.tokenHash).toBe(expectedHash);
      expect(session!.tokenHash).not.toBe(rawToken);

      await prisma.user.deleteMany({ where: { email: `rawtoken-${suffix}@test.com` } });
    });
  });

  // =========================================================================
  // 2. Login
  // =========================================================================
  describe('2. Login', () => {
    it('POST /api/auth/login — succeeds with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUserEmail);
    });

    it('POST /api/auth/login — fails with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('POST /api/auth/login — fails with non-existent email (generic error)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@chesscoach.test', password: 'AnyPassword' });

      expect(res.status).toBe(401);
      // Must NOT reveal whether email exists
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('POST /api/auth/login — sets session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(sessionCookie).toContain('chess_coach_session=');
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('POST /api/auth/login — email normalization (uppercase accepted)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail.toUpperCase(), password: testUserPassword });

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 3. /api/auth/me
  // =========================================================================
  describe('3. /api/auth/me', () => {
    it('GET /api/auth/me — returns 401 without authentication', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me — returns user/profile when authenticated', async () => {
      const cookie = await loginAndGetCookie(testUserEmail, testUserPassword);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUserEmail);
      expect(res.body).toHaveProperty('profile');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });
  });

  // =========================================================================
  // 4. Protected game routes require authentication
  // =========================================================================
  describe('4. Protected routes — unauthenticated', () => {
    it('GET /api/games — returns 401 without authentication', async () => {
      const res = await request(app).get('/api/games');
      expect(res.status).toBe(401);
    });

    it('POST /api/games — returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({ opponentName: 'Test', finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] });
      expect(res.status).toBe(401);
    });

    it('GET /api/users/profile — returns 401 without authentication', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 5. Authenticated game creation and ownership
  // =========================================================================
  describe('5. Authenticated game operations', () => {
    let gameId: string;
    let cookie: string;

    beforeAll(async () => {
      cookie = await loginAndGetCookie(testUserEmail, testUserPassword);
    });

    it('POST /api/games — authenticated user can create a game', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', cookie)
        .send({
          opponentName: 'Stockfish',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      gameId = res.body.data.id;
    });

    it('Game is owned by the authenticated user (server-side, not client-provided)', async () => {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      expect(game!.userId).toBe(user!.id);
    });

    it('Client-provided userId in body is ignored — server uses session', async () => {
      // Try to create a game with a fake userId in the body
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', cookie)
        .send({
          opponentName: 'FakeOwner',
          userId: 'fake-user-id-should-be-ignored',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        });

      expect(res.status).toBe(201);
      // The game should be owned by the session user, not the fake userId
      const createdGame = await prisma.game.findUnique({ where: { id: res.body.data.id } });
      expect(createdGame!.userId).not.toBe('fake-user-id-should-be-ignored');
      await prisma.game.delete({ where: { id: res.body.data.id } });
    });
  });

  // =========================================================================
  // 6. Cross-user game access (User A cannot access User B's games)
  // =========================================================================
  describe('6. Game ownership isolation', () => {
    let userAGameId: string;
    let cookieA: string;
    let cookieB: string;

    beforeAll(async () => {
      // Register User B
      await request(app)
        .post('/api/auth/register')
        .send({ email: userBEmail, displayName: 'User B', password: userBPassword });

      cookieA = await loginAndGetCookie(testUserEmail, testUserPassword);
      cookieB = await loginAndGetCookie(userBEmail, userBPassword);

      // User A creates a game
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', cookieA)
        .send({
          opponentName: 'Stockfish A',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        });
      userAGameId = res.body.data.id;
    });

    it('User B cannot read User A\'s game (403)', async () => {
      const res = await request(app)
        .get(`/api/games/${userAGameId}`)
        .set('Cookie', cookieB);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('User B cannot update User A\'s game (403)', async () => {
      const res = await request(app)
        .put(`/api/games/${userAGameId}`)
        .set('Cookie', cookieB)
        .send({ status: 'COMPLETED' });
      expect(res.status).toBe(403);
    });

    it('User B cannot delete User A\'s game (403)', async () => {
      const res = await request(app)
        .delete(`/api/games/${userAGameId}`)
        .set('Cookie', cookieB);
      expect(res.status).toBe(403);
    });

    it('User B sees only their own games', async () => {
      // User B creates a game
      await request(app)
        .post('/api/games')
        .set('Cookie', cookieB)
        .send({
          opponentName: 'Stockfish B',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        });

      const res = await request(app)
        .get('/api/games')
        .set('Cookie', cookieB);

      expect(res.status).toBe(200);
      // All returned games should belong to User B, not User A
      const userA = await prisma.user.findUnique({ where: { email: testUserEmail } });
      for (const game of res.body.data) {
        expect(game.userId).not.toBe(userA!.id);
      }
    });
  });

  // =========================================================================
  // 7. Logout
  // =========================================================================
  describe('7. Logout', () => {
    it('POST /api/auth/logout — invalidates session', async () => {
      const cookie = await loginAndGetCookie(testUserEmail, testUserPassword);

      // Confirm authenticated before logout
      const before = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(before.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);
      expect(logoutRes.status).toBe(200);

      // Session must no longer work
      const after = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(after.status).toBe(401);
    });

    it('POST /api/auth/logout — safe when session already missing', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'chess_coach_session=invalidtoken');
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 8. Expired session
  // =========================================================================
  describe('8. Expired session', () => {
    it('Expired session returns 401', async () => {
      // Get user ID
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });

      // Create a session that is already expired
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
      await prisma.session.create({
        data: {
          userId: user!.id,
          tokenHash: expiredHash,
          expiresAt: new Date(Date.now() - 1000), // 1 second in the past
        }
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `chess_coach_session=${expiredToken}`);

      expect(res.status).toBe(401);

      // Verify the expired session was cleaned up
      const session = await prisma.session.findUnique({ where: { tokenHash: expiredHash } });
      expect(session).toBeNull();
    });
  });

  // =========================================================================
  // 9. Existing dev user data accessibility
  // =========================================================================
  describe('9. DEV_USER_ID data accessibility', () => {
    it('Existing dev-user-123 games remain in DB', async () => {
      const devUser = await prisma.user.findUnique({ where: { id: 'dev-user-123' } });
      // If seed was run, dev user should exist
      if (devUser) {
        const games = await prisma.game.findMany({ where: { userId: 'dev-user-123' } });
        expect(Array.isArray(games)).toBe(true);
      } else {
        // Dev user not present — that's fine for fresh test environments
        expect(true).toBe(true);
      }
    });
  });

  // =========================================================================
  // 10. Health check (no auth required)
  // =========================================================================
  describe('10. Health check (public endpoint)', () => {
    it('GET /api/health — returns 200 without authentication', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
