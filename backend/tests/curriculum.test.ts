import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Phase 9: Persistent Curriculum & Adaptive Learning Loop Tests', () => {
  let authCookie: string;
  let userId: string;
  const testEmail = `curriculum_test_${Date.now()}@chessmastery.test`;

  beforeAll(async () => {
    // Register test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        displayName: 'Curriculum Tester'
      });

    expect(res.status).toBe(201);
    userId = res.body.user.id;
    const cookies = res.headers['set-cookie'];
    authCookie = Array.isArray(cookies) ? cookies[0] : cookies;
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.userLessonProgress.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('1. Authentication & Catalog Access', () => {
    it('rejects unauthenticated request to /api/curriculum/catalog with 401', async () => {
      const res = await request(app).get('/api/curriculum/catalog');
      expect(res.status).toBe(401);
    });

    it('returns structured catalog with seeded modules and stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.modules).toBeDefined();
      expect(Array.isArray(res.body.modules)).toBe(true);
      expect(res.body.modules.length).toBeGreaterThanOrEqual(3);

      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalLessons).toBeGreaterThanOrEqual(5);
      expect(res.body.stats.completedLessons).toBe(0);

      // Check first module structure
      const firstMod = res.body.modules[0];
      expect(firstMod.id).toBeDefined();
      expect(firstMod.title).toBeDefined();
      expect(Array.isArray(firstMod.lessons)).toBe(true);
      expect(firstMod.lessons.length).toBeGreaterThan(0);

      const firstLesson = firstMod.lessons[0];
      expect(firstLesson.completed).toBe(false);
      expect(firstLesson.progressPercent).toBe(0);
      expect(firstLesson.currentStep).toBe(1);
    });
  });

  describe('2. Lesson Step Retrieval & Progress Resumption', () => {
    it('returns 404 for non-existent lesson', async () => {
      const res = await request(app)
        .get('/api/curriculum/lessons/non-existent-lesson-xyz')
        .set('Cookie', authCookie);

      expect(res.status).toBe(404);
    });

    it('returns full lesson details with ordered steps', async () => {
      const res = await request(app)
        .get('/api/curriculum/lessons/opening-center-control')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.lesson).toBeDefined();
      expect(res.body.lesson.id).toBe('opening-center-control');
      expect(res.body.lesson.totalSteps).toBe(3);
      expect(res.body.currentStep).toBe(1);
      expect(res.body.completed).toBe(false);

      expect(Array.isArray(res.body.lesson.steps)).toBe(true);
      expect(res.body.lesson.steps.length).toBe(3);

      const step1 = res.body.lesson.steps[0];
      expect(step1.stepNumber).toBe(1);
      expect(step1.type).toBe('concept');

      const step2 = res.body.lesson.steps[1];
      expect(step2.stepNumber).toBe(2);
      expect(step2.type).toBe('interactive_move');
      expect(step2.expectedMove?.san).toBe('e4');
    });
  });

  describe('3. Authoritative Move Validation & Persistence', () => {
    it('rejects an illegal chess move with an authoritative message', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 2,
          moveSan: 'Nxf7' // Impossible on initial board
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.feedback).toContain('not legal');
    });

    it('rejects a legal move that does not match the lesson objective', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 2,
          moveSan: 'h3' // Legal but passive flank pawn push
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.feedback).toContain('You played h3');
    });

    it('validates correct move e4, advances step to 3, and persists in PostgreSQL', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 2,
          moveSan: 'e4'
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
      expect(res.body.nextStepNumber).toBe(3);
      expect(res.body.isLessonCompleted).toBe(false);

      // Verify DB persistence of resumption state
      const checkRes = await request(app)
        .get('/api/curriculum/lessons/opening-center-control')
        .set('Cookie', authCookie);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.currentStep).toBe(3);
      expect(checkRes.body.lesson.progressPercent).toBeGreaterThanOrEqual(66);
    });

    it('validates final step Nf3, marks lesson completed, and updates PlayerProfile without double-counting', async () => {
      // Check initial profile
      const profBefore = await prisma.playerProfile.findUnique({
        where: { userId }
      });
      const initialCompleted = profBefore?.lessonsCompleted || 0;

      const res = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 3,
          moveSan: 'Nf3'
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
      expect(res.body.isLessonCompleted).toBe(true);
      expect(res.body.nextStepNumber).toBeNull();

      // Verify profile count incremented by 1
      const profAfter = await prisma.playerProfile.findUnique({
        where: { userId }
      });
      expect(profAfter?.lessonsCompleted).toBe(initialCompleted + 1);

      // Verify catalog reflects completion
      const catalogRes = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', authCookie);

      expect(catalogRes.body.stats.completedLessons).toBe(1);

      // Repeat validation of step 3: must NOT double-increment lessonsCompleted
      const repeatRes = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 3,
          moveSan: 'Nf3'
        });

      expect(repeatRes.status).toBe(200);
      const profAfterRepeat = await prisma.playerProfile.findUnique({
        where: { userId }
      });
      expect(profAfterRepeat?.lessonsCompleted).toBe(initialCompleted + 1); // Not + 2!
    });

    it('resets lesson progress back to step 1 upon user request', async () => {
      const resetRes = await request(app)
        .post('/api/curriculum/lessons/opening-center-control/reset')
        .set('Cookie', authCookie);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.progress.currentStep).toBe(1);

      const checkRes = await request(app)
        .get('/api/curriculum/lessons/opening-center-control')
        .set('Cookie', authCookie);

      expect(checkRes.body.currentStep).toBe(1);
    });
  });

  describe('4. Question Step Validation', () => {
    it('validates multiple-choice question steps with correct and incorrect options', async () => {
      // Step 2 of basics-board-vision is a question
      const wrongRes = await request(app)
        .post('/api/curriculum/lessons/basics-board-vision/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 2,
          selectedOptionId: 'opt-1'
        });

      expect(wrongRes.status).toBe(200);
      expect(wrongRes.body.correct).toBe(false);

      const correctRes = await request(app)
        .post('/api/curriculum/lessons/basics-board-vision/validate-step')
        .set('Cookie', authCookie)
        .send({
          stepNumber: 2,
          selectedOptionId: 'opt-2'
        });

      expect(correctRes.status).toBe(200);
      expect(correctRes.body.correct).toBe(true);
      expect(correctRes.body.isLessonCompleted).toBe(true);
    });
  });

  describe('5. Weakness-to-Lesson Adaptive Linking', () => {
    it('links detected player weaknesses to targeted lesson recommendations in catalog', async () => {
      // Inject an active weakness for this user in tactical PIN
      const profile = await prisma.playerProfile.findUnique({ where: { userId } });
      await prisma.weakness.create({
        data: {
          playerId: profile!.id,
          title: 'Susceptibility to Pins',
          description: 'Frequent errors facing absolute and relative pins',
          category: 'TACTICS',
          theme: 'pin',
          confidence: 0.95,
          occurrenceCount: 4,
          status: 'ACTIVE'
        }
      });

      const res = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.recommendedLesson).toBeDefined();
      expect(res.body.recommendedLesson.id).toBe('tactics-absolute-pin');
      expect(res.body.recommendedLesson.reason).toContain('pin');
    });
  });
});
