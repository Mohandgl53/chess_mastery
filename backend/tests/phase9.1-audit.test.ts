import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

describe('Phase 9.1: Independent Acceptance Audit & Reliability Tests', () => {
  let userACookie: string;
  let userAId: string;
  let userBCookie: string;
  let userBId: string;

  const userAEmail = `audit_userA_${Date.now()}@chessmastery.test`;
  const userBEmail = `audit_userB_${Date.now()}@chessmastery.test`;

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        email: userAEmail,
        password: 'Password123!',
        displayName: 'Audit User A'
      });
    expect(resA.status).toBe(201);
    userAId = resA.body.user.id;
    const cookiesA = resA.headers['set-cookie'];
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        email: userBEmail,
        password: 'Password123!',
        displayName: 'Audit User B'
      });
    expect(resB.status).toBe(201);
    userBId = resB.body.user.id;
    const cookiesB = resB.headers['set-cookie'];
    userBCookie = Array.isArray(cookiesB) ? cookiesB[0] : cookiesB;
  });

  afterAll(async () => {
    if (userAId) {
      await prisma.userLessonProgress.deleteMany({ where: { userId: userAId } });
      await prisma.learningEvidence.deleteMany({ where: { player: { userId: userAId } } });
      await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    }
    if (userBId) {
      await prisma.userLessonProgress.deleteMany({ where: { userId: userBId } });
      await prisma.learningEvidence.deleteMany({ where: { player: { userId: userBId } } });
      await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    }
  });

  describe('1. Curriculum Security, Isolation & Authorization', () => {
    it('enforces authentication across all curriculum endpoints', async () => {
      const getCatalog = await request(app).get('/api/curriculum/catalog');
      expect(getCatalog.status).toBe(401);

      const getLesson = await request(app).get('/api/curriculum/lessons/basics-board-vision');
      expect(getLesson.status).toBe(401);

      const postStep = await request(app)
        .post('/api/curriculum/lessons/basics-board-vision/validate-step')
        .send({ stepNumber: 1 });
      expect(postStep.status).toBe(401);

      const postReset = await request(app)
        .post('/api/curriculum/lessons/basics-board-vision/reset');
      expect(postReset.status).toBe(401);
    });

    it('strictly isolates user progress between User A and User B', async () => {
      // User A completes step 1 of endgame-back-rank
      const resA = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
        .set('Cookie', userACookie)
        .send({
          stepNumber: 1,
          moveSan: 'Rxe8#'
        });
      expect(resA.status).toBe(200);
      expect(resA.body.isLessonCompleted).toBe(true);

      // Check User A catalog shows 1 completed lesson
      const catalogA = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', userACookie);
      expect(catalogA.body.stats.completedLessons).toBe(1);

      // Check User B catalog shows 0 completed lessons (strict isolation!)
      const catalogB = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', userBCookie);
      expect(catalogB.body.stats.completedLessons).toBe(0);

      // Check User B lesson details shows step 1 and completed=false
      const lessonB = await request(app)
        .get('/api/curriculum/lessons/endgame-back-rank')
        .set('Cookie', userBCookie);
      expect(lessonB.body.completed).toBe(false);
      expect(lessonB.body.currentStep).toBe(1);
    });
  });

  describe('2. Atomicity & Idempotency of Lesson Completion', () => {
    it('concurrent completion requests do not double-increment profile lessonsCompleted', async () => {
      // User B completes an interactive lesson with 5 concurrent requests
      const promises = Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
          .set('Cookie', userBCookie)
          .send({
            stepNumber: 1,
            moveSan: 'Rxe8#'
          })
      );

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.correct).toBe(true);
      }

      // Check User B player profile lessonsCompleted in database directly
      const profileB = await prisma.playerProfile.findUnique({
        where: { userId: userBId }
      });
      expect(profileB).toBeDefined();
      expect(profileB?.lessonsCompleted).toBe(1); // EXACTLY 1, despite 5 concurrent requests!

      // Check learning evidence was created
      const evidence = await prisma.learningEvidence.findMany({
        where: { playerId: profileB!.id, theme: 'back_rank_mate' }
      });
      expect(evidence.length).toBe(1); // EXACTLY 1 evidence entry
    });

    it('subsequent repeated completion requests are idempotent and do not increment counters', async () => {
      // Send another completion request for User B
      const repeatRes = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
        .set('Cookie', userBCookie)
        .send({
          stepNumber: 1,
          moveSan: 'Rxe8#'
        });

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.correct).toBe(true);
      expect(repeatRes.body.isLessonCompleted).toBe(true);

      const profileB = await prisma.playerProfile.findUnique({
        where: { userId: userBId }
      });
      expect(profileB?.lessonsCompleted).toBe(1); // Still 1!
    });
  });

  describe('3. Lesson Reset and Resumption', () => {
    it('resetting a completed lesson resets currentStep to 1 while preserving earned profile counters', async () => {
      const resetRes = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/reset')
        .set('Cookie', userBCookie);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify lesson state shows currentStep = 1
      const lessonRes = await request(app)
        .get('/api/curriculum/lessons/endgame-back-rank')
        .set('Cookie', userBCookie);

      expect(lessonRes.body.currentStep).toBe(1);

      // Verify profile lessonsCompleted counter was NOT decreased
      const profileB = await prisma.playerProfile.findUnique({
        where: { userId: userBId }
      });
      expect(profileB?.lessonsCompleted).toBe(1);
    });
  });

  describe('4. Chess Legality & Backend Validation Authority', () => {
    it('rejects an illegal move attempt with authoritative chess rule feedback', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
        .set('Cookie', userACookie)
        .send({
          stepNumber: 1,
          moveSan: 'Ke8' // Illegal king teleport
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.feedback).toContain('not legal according to authoritative chess rules');
    });

    it('rejects a legal move that does not match the lesson objective with coach feedback', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
        .set('Cookie', userACookie)
        .send({
          stepNumber: 1,
          moveSan: 'h3' // Legal pawn move, but not back rank mate
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(false);
      expect(res.body.feedback).toContain('That move is legal, but not the objective');
    });

    it('accepts correct move submitted by square coordinates (e1 to e8)', async () => {
      const res = await request(app)
        .post('/api/curriculum/lessons/endgame-back-rank/validate-step')
        .set('Cookie', userACookie)
        .send({
          stepNumber: 1,
          moveFrom: 'e1',
          moveTo: 'e8'
        });

      expect(res.status).toBe(200);
      expect(res.body.correct).toBe(true);
      expect(res.body.isLessonCompleted).toBe(true);
    });
  });
});
