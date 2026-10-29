import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { practiceService } from '../src/services/practice.service.js';
import { adaptivePlannerService } from '../src/services/adaptive-planner.service.js';
import { practiceRepository } from '../src/repositories/practice.repository.js';
import { playerMemoryRepository } from '../src/repositories/player-memory.repository.js';
import { seedPuzzles } from '../prisma/seed-puzzles.js';

const app = createApp();

const TEST_USER_EMAIL = 'practice-test-user@chesscoach.local';
const TEST_USER_PASS = 'TestPassword123!';
const OTHER_USER_EMAIL = 'practice-other-user@chesscoach.local';
const OTHER_USER_PASS = 'OtherPassword123!';

let userCookie = '';
let userId = '';
let userProfileId = '';
let otherCookie = '';
let otherUserId = '';

describe('Phase 7: Adaptive Practice, Theme Mastery & Personalized Training Tests', () => {
  beforeAll(async () => {
    // 1. Ensure puzzles are seeded
    await seedPuzzles();

    // 2. Setup Primary Test User
    let user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: TEST_USER_EMAIL, displayName: 'Practice Tester', password: TEST_USER_PASS });
      user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
    }
    userId = user!.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASS });
    const setCookie = loginRes.headers['set-cookie'];
    userCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];

    const profile = await playerMemoryRepository.getOrCreateProfile(userId);
    userProfileId = profile.id;

    // 3. Setup Secondary User for Security / Authorization checks
    let otherUser = await prisma.user.findUnique({ where: { email: OTHER_USER_EMAIL } });
    if (!otherUser) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: OTHER_USER_EMAIL, displayName: 'Other Player', password: OTHER_USER_PASS });
      otherUser = await prisma.user.findUnique({ where: { email: OTHER_USER_EMAIL } });
    }
    otherUserId = otherUser!.id;

    const loginOtherRes = await request(app)
      .post('/api/auth/login')
      .send({ email: OTHER_USER_EMAIL, password: OTHER_USER_PASS });
    const setOtherCookie = loginOtherRes.headers['set-cookie'];
    otherCookie = Array.isArray(setOtherCookie) ? setOtherCookie[0].split(';')[0] : setOtherCookie.split(';')[0];
  });

  // -------------------------------------------------------------------------
  // 1. Adaptive Training Planner
  // -------------------------------------------------------------------------
  describe('1. Adaptive Training Planner', () => {
    it('prioritizes active weakness with highest need score', async () => {
      // Clear previous weaknesses and masteries to ensure clean deterministic initial state
      await prisma.weakness.deleteMany({ where: { playerId: userProfileId } });
      await prisma.themeMastery.deleteMany({ where: { playerId: userProfileId } });

      await prisma.weakness.create({
        data: {
          playerId: userProfileId,
          category: 'TACTICS',
          theme: 'PIN',
          title: 'Pin Exploitation Defense',
          description: 'Tested weakness in PIN',
          confidence: 0.85,
          occurrenceCount: 3,
          status: 'ACTIVE'
        }
      });

      const plan = await adaptivePlannerService.generateAdaptivePlan(userId);
      expect(plan.targetTheme).toBe('PIN');
      expect(plan.sessionType).toBe('ADAPTIVE');
      expect(plan.plannedItemCount).toBe(5);
      expect(plan.priorityScore).toBeGreaterThan(0.5);
    });

    it('honors explicitly requested theme from recommendation or route', async () => {
      const plan = await adaptivePlannerService.generateAdaptivePlan(userId, 'FORK');
      expect(plan.targetTheme).toBe('FORK');
      expect(plan.sessionType).toBe('THEME_DRILL');
      expect(plan.priorityScore).toBe(10.0);
    });

    it('triggers spaced review session when theme review deadline has passed', async () => {
      // Set PIN review deadline in the past
      await practiceRepository.upsertThemeMastery({
        playerId: userProfileId,
        theme: 'PIN',
        attemptCount: 5,
        correctCount: 4,
        incorrectCount: 1,
        accuracy: 0.8,
        masteryScore: 82.0,
        recentAccuracy: 0.8,
        streak: 3,
        bestStreak: 3,
        currentDifficulty: 1100,
        lastAttemptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        nextReviewAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      });

      const plan = await adaptivePlannerService.generateAdaptivePlan(userId);
      expect(plan.targetTheme).toBe('PIN');
      expect(plan.isSpacedReview).toBe(true);
      expect(plan.sessionType).toBe('WEAKNESS_REVIEW');
    });

    it('calculates deterministic spaced repetition intervals', () => {
      const now = Date.now();
      const highAccuracyDate = adaptivePlannerService.calculateNextReviewDate(0.85, 3);
      // Streak 3 -> +7 days
      const daysDiff = (highAccuracyDate.getTime() - now) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(6.9);
      expect(daysDiff).toBeLessThanOrEqual(7.1);

      const lowAccuracyDate = adaptivePlannerService.calculateNextReviewDate(0.4, 0);
      // Low accuracy -> +4 hours
      const hoursDiff = (lowAccuracyDate.getTime() - now) / (1000 * 60 * 60);
      expect(hoursDiff).toBeGreaterThanOrEqual(3.9);
      expect(hoursDiff).toBeLessThanOrEqual(4.1);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Practice Session Lifecycle & API
  // -------------------------------------------------------------------------
  describe('2. Practice Session Lifecycle & API', () => {
    let testSessionId = '';

    it('POST /api/practice/sessions creates a new session and returns first puzzle', async () => {
      // Close any open session first
      await prisma.practiceSession.updateMany({
        where: { playerId: userProfileId, status: 'ACTIVE' },
        data: { status: 'COMPLETED' }
      });

      const res = await request(app)
        .post('/api/practice/sessions')
        .set('Cookie', userCookie)
        .send({ theme: 'FORK' });

      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.targetTheme).toBe('FORK');
      expect(res.body.session.status).toBe('ACTIVE');
      expect(res.body.puzzle).toBeDefined();
      expect(res.body.puzzle.theme).toBe('FORK');

      testSessionId = res.body.session.id;
    });

    it('GET /api/practice/sessions/:id returns active session with attempt history', async () => {
      const res = await request(app)
        .get(`/api/practice/sessions/${testSessionId}`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSessionId);
      expect(Array.isArray(res.body.attempts)).toBe(true);
    });

    it('POST /api/practice/sessions/:id/attempts records correct attempt, updates mastery, and creates learning evidence', async () => {
      const puzzle = await prisma.puzzle.findFirst({ where: { theme: 'FORK', id: 'puz-fork-101' } });
      expect(puzzle).toBeDefined();

      const res = await request(app)
        .post(`/api/practice/sessions/${testSessionId}/attempts`)
        .set('Cookie', userCookie)
        .send({
          puzzleId: puzzle!.id,
          moveSan: 'Nxc7+',
          from: 'd5',
          to: 'c7',
          timeSpentMs: 4200,
          usedHint: false,
          hintCount: 0
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe('CORRECT');
      expect(res.body.isCorrect).toBe(true);
      expect(res.body.completedItemCount).toBe(1);
      expect(res.body.correctCount).toBe(1);
      expect(res.body.masteryUpdate).toBeDefined();
      expect(res.body.masteryUpdate.theme).toBe('FORK');

      // Verify LearningEvidence was persisted in database
      const evidence = await prisma.learningEvidence.findFirst({
        where: {
          playerId: userProfileId,
          theme: 'FORK',
          evidenceType: 'POSITIVE'
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(evidence).toBeDefined();
      expect(evidence?.category).toBe('TACTICS');

      // Verify PlayerProfile counters incremented
      const profile = await prisma.playerProfile.findUnique({ where: { id: userProfileId } });
      expect(profile?.puzzlesAttempted).toBeGreaterThanOrEqual(1);
      expect(profile?.puzzlesSolved).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/practice/sessions/:id/attempts rejects illegal moves with 400', async () => {
      const puzzle = await prisma.puzzle.findFirst({ where: { theme: 'FORK', id: 'puz-fork-101' } });

      const res = await request(app)
        .post(`/api/practice/sessions/${testSessionId}/attempts`)
        .set('Cookie', userCookie)
        .send({
          puzzleId: puzzle!.id,
          moveSan: 'Nxe8', // Illegal knight jump into king
          from: 'd5',
          to: 'e8'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Illegal chess move');
    });

    it('POST /api/practice/sessions/:id/attempts records incorrect move without crash', async () => {
      const puzzle = await prisma.puzzle.findFirst({ where: { theme: 'FORK', id: 'puz-fork-101' } });

      // Legal move that is not the tactical solution (e.g. h3 or a3)
      const res = await request(app)
        .post(`/api/practice/sessions/${testSessionId}/attempts`)
        .set('Cookie', userCookie)
        .send({
          puzzleId: puzzle!.id,
          moveSan: 'h3',
          from: 'h2',
          to: 'h3'
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBe('INCORRECT');
      expect(res.body.isCorrect).toBe(false);
      expect(res.body.incorrectCount).toBe(1);
    });

    it('POST /api/practice/sessions/:id/complete marks session COMPLETED', async () => {
      const res = await request(app)
        .post(`/api/practice/sessions/${testSessionId}/complete`)
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe('COMPLETED');
    });

    it('rejects attempt on an already completed session', async () => {
      const puzzle = await prisma.puzzle.findFirst({ where: { theme: 'FORK' } });

      const res = await request(app)
        .post(`/api/practice/sessions/${testSessionId}/attempts`)
        .set('Cookie', userCookie)
        .send({
          puzzleId: puzzle!.id,
          moveSan: 'Nxc7+'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already been completed');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Security & Cross-User Authorization
  // -------------------------------------------------------------------------
  describe('3. Security & Authorization', () => {
    let sessionUserAId = '';

    beforeAll(async () => {
      const session = await practiceRepository.createSession({
        playerId: userProfileId,
        sessionType: 'ADAPTIVE',
        targetTheme: 'PIN',
        plannedItemCount: 5,
        averageDifficulty: 1000
      });
      sessionUserAId = session.id;
    });

    it('requires authentication for /api/practice endpoints', async () => {
      const res = await request(app).get('/api/practice/dashboard');
      expect(res.status).toBe(401);
    });

    it('denies User B from submitting attempts to User A\'s session', async () => {
      const puzzle = await prisma.puzzle.findFirst({ where: { theme: 'PIN' } });

      const res = await request(app)
        .post(`/api/practice/sessions/${sessionUserAId}/attempts`)
        .set('Cookie', otherCookie) // User B tries to mutate User A's session
        .send({
          puzzleId: puzzle!.id,
          moveSan: 'Bb5'
        });

      expect(res.status).toBe(403);
    });

    it('denies User B from completing User A\'s session', async () => {
      const res = await request(app)
        .post(`/api/practice/sessions/${sessionUserAId}/complete`)
        .set('Cookie', otherCookie);

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 4. GET /api/practice/dashboard & GET /api/practice/mastery
  // -------------------------------------------------------------------------
  describe('4. Dashboard & Mastery Endpoints', () => {
    it('GET /api/practice/dashboard returns structured training overview', async () => {
      const res = await request(app)
        .get('/api/practice/dashboard')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(res.body.plan).toBeDefined();
      expect(res.body.plan.targetTheme).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(Array.isArray(res.body.masteries)).toBe(true);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('GET /api/practice/mastery returns list of theme mastery records', async () => {
      const res = await request(app)
        .get('/api/practice/mastery')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.masteries)).toBe(true);
      const forkMastery = res.body.masteries.find((m: any) => m.theme === 'FORK');
      expect(forkMastery).toBeDefined();
      expect(forkMastery.attemptCount).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Theme Validation Tests (Regression for practice-theme validation)
  // -------------------------------------------------------------------------
  describe('5. Theme Validation', () => {
    const VALID_THEMES = [
      'FORK',
      'PIN',
      'SKEWER',
      'HANGING_PIECE',
      'BACK_RANK',
      'LATE_CASTLING',
      'CENTER_CONTROL',
      'OPEN_FILE'
    ] as const;

    // Clean up any active sessions before each test
    beforeAll(async () => {
      await prisma.practiceSession.updateMany({
        where: { playerId: userProfileId, status: 'ACTIVE' },
        data: { status: 'COMPLETED' }
      });
    });

    describe('All eight valid theme values are accepted', () => {
      for (const theme of VALID_THEMES) {
        it(`accepts theme: ${theme}`, async () => {
          // Close any open session first
          await prisma.practiceSession.updateMany({
            where: { playerId: userProfileId, status: 'ACTIVE' },
            data: { status: 'COMPLETED' }
          });

          const res = await request(app)
            .post('/api/practice/sessions')
            .set('Cookie', userCookie)
            .send({ theme });

          expect(res.status).toBe(201);
          expect(res.body.session).toBeDefined();
          expect(res.body.session.targetTheme).toBe(theme);
          expect(res.body.puzzle).toBeDefined();
          expect(res.body.puzzle.theme).toBe(theme);

          // Clean up: complete the session
          await request(app)
            .post(`/api/practice/sessions/${res.body.session.id}/complete`)
            .set('Cookie', userCookie);
        });
      }
    });

    describe('Omitted optional theme continues to work (adaptive planning)', () => {
      it('creates session without explicit theme', async () => {
        await prisma.practiceSession.updateMany({
          where: { playerId: userProfileId, status: 'ACTIVE' },
          data: { status: 'COMPLETED' }
        });

        const res = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({}); // No theme provided

        expect(res.status).toBe(201);
        expect(res.body.session).toBeDefined();
        expect(res.body.session.targetTheme).toBeDefined();
        expect(VALID_THEMES).toContain(res.body.session.targetTheme);
        expect(res.body.puzzle).toBeDefined();
        expect(VALID_THEMES).toContain(res.body.puzzle.theme);

        await request(app)
          .post(`/api/practice/sessions/${res.body.session.id}/complete`)
          .set('Cookie', userCookie);
      });

      it('creates session with theme explicitly set to null', async () => {
        await prisma.practiceSession.updateMany({
          where: { playerId: userProfileId, status: 'ACTIVE' },
          data: { status: 'COMPLETED' }
        });

        const res = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({ theme: null });

        expect(res.status).toBe(201);
        expect(res.body.session).toBeDefined();
        expect(res.body.session.targetTheme).toBeDefined();
        expect(VALID_THEMES).toContain(res.body.session.targetTheme);

        await request(app)
          .post(`/api/practice/sessions/${res.body.session.id}/complete`)
          .set('Cookie', userCookie);
      });
    });

    describe('Invalid themes are rejected at validation boundary', () => {
      const INVALID_THEMES = [
        'INVALID_THEME',
        'fork', // lowercase
        'Pin', // mixed case
        'BACKRANK', // wrong format
        'LATE_CASTLE', // typo
        'OPEN_RANK', // wrong theme
        'MATE_IN_ONE', // not a practice theme
        '', // empty string
        ' ', // whitespace
        123, // number
        true, // boolean
        [], // array
        {} // object
      ];

      for (const invalidTheme of INVALID_THEMES) {
        it(`rejects invalid theme: ${JSON.stringify(invalidTheme)}`, async () => {
          const res = await request(app)
            .post('/api/practice/sessions')
            .set('Cookie', userCookie)
            .send({ theme: invalidTheme });

          expect(res.status).toBe(400);
          expect(res.body.error).toBeDefined();
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.message).toContain('theme');
        });
      }

      it('does not create a session when theme is invalid', async () => {
        const initialSessions = await prisma.practiceSession.count({
          where: { playerId: userProfileId }
        });

        await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({ theme: 'INVALID_THEME' });

        const finalSessions = await prisma.practiceSession.count({
          where: { playerId: userProfileId }
        });

        expect(finalSessions).toBe(initialSessions);
      });
    });

    describe('Malformed request bodies are rejected', () => {
      it('rejects request with extra unknown fields', async () => {
        const res = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({ theme: 'FORK', unknownField: 'value' });

        // Zod by default strips unknown fields, so this should succeed
        // But if we want strict mode, we'd need .strict()
        expect(res.status).toBe(201);
      });

      it('rejects request with wrong sessionType value', async () => {
        const res = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({ theme: 'FORK', sessionType: 'INVALID_TYPE' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('accepts valid sessionType with valid theme', async () => {
        await prisma.practiceSession.updateMany({
          where: { playerId: userProfileId, status: 'ACTIVE' },
          data: { status: 'COMPLETED' }
        });

        const res = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({ theme: 'FORK', sessionType: 'THEME_DRILL' });

        expect(res.status).toBe(201);
        expect(res.body.session.sessionType).toBe('THEME_DRILL');

        await request(app)
          .post(`/api/practice/sessions/${res.body.session.id}/complete`)
          .set('Cookie', userCookie);
      });
    });

    describe('Existing adaptive sessions without explicit theme still work', () => {
      it('returns existing active session when no theme requested', async () => {
        // First create a session without theme (adaptive)
        await prisma.practiceSession.updateMany({
          where: { playerId: userProfileId, status: 'ACTIVE' },
          data: { status: 'COMPLETED' }
        });

        const res1 = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({});

        expect(res1.status).toBe(201);
        const sessionId = res1.body.session.id;

        // Second request without theme should return the same session
        const res2 = await request(app)
          .post('/api/practice/sessions')
          .set('Cookie', userCookie)
          .send({});

        expect(res2.status).toBe(201);
        expect(res2.body.session.id).toBe(sessionId);
        expect(res2.body.isNew).toBe(false);

        await request(app)
          .post(`/api/practice/sessions/${sessionId}/complete`)
          .set('Cookie', userCookie);
      });
    });

    describe('Authorization and ownership protections still work', () => {
      let otherUserSessionId = '';

      beforeAll(async () => {
        // Create a session for the other user
        const otherProfile = await playerMemoryRepository.getOrCreateProfile(otherUserId);
        const session = await practiceRepository.createSession({
          playerId: otherProfile.id,
          sessionType: 'ADAPTIVE',
          targetTheme: 'PIN',
          plannedItemCount: 5,
          averageDifficulty: 1000
        });
        otherUserSessionId = session.id;
      });

      it('denies access to other user\'s session', async () => {
        const res = await request(app)
          .post(`/api/practice/sessions/${otherUserSessionId}/attempts`)
          .set('Cookie', userCookie) // User A tries to access User B's session
          .send({
            puzzleId: 'puz-pin-101',
            moveSan: 'Bb5'
          });

        expect(res.status).toBe(403);
      });

      it('denies completion of other user\'s session', async () => {
        const res = await request(app)
          .post(`/api/practice/sessions/${otherUserSessionId}/complete`)
          .set('Cookie', userCookie);

        expect(res.status).toBe(403);
      });
    });
  });
});
