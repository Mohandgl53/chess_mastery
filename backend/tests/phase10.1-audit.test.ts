import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Chess } from 'chess.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { seedPuzzles } from '../prisma/seed-puzzles.js';
import { seedCurriculum } from '../prisma/seed-curriculum.js';

const app = createApp();

describe('Phase 10.1: Acceptance Audit & Production Readiness Tests', () => {
  let userACookie: string;
  let userAId: string;
  let userBCookie: string;
  let userBId: string;
  const userAEmail = `audit_userA_${Date.now()}@chessmastery.test`;
  const userBEmail = `audit_userB_${Date.now()}@chessmastery.test`;

  beforeAll(async () => {
    await seedCurriculum();
    await seedPuzzles(prisma);

    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: userAEmail, password: 'Password123!', displayName: 'Auditor A' });
    expect(regA.status).toBe(201);
    userAId = regA.body.user.id;
    const cookiesA = regA.headers['set-cookie'];
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : (cookiesA as string);

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: userBEmail, password: 'Password123!', displayName: 'Auditor B' });
    expect(regB.status).toBe(201);
    userBId = regB.body.user.id;
    const cookiesB = regB.headers['set-cookie'];
    userBCookie = Array.isArray(cookiesB) ? cookiesB[0] : (cookiesB as string);
  });

  afterAll(async () => {
    for (const uid of [userAId, userBId]) {
      if (uid) {
        await prisma.learningEvidence.deleteMany({ where: { game: { userId: uid } } });
        await prisma.gameMove.deleteMany({ where: { game: { userId: uid } } });
        await prisma.gameAnalysis.deleteMany({ where: { game: { userId: uid } } });
        await prisma.game.deleteMany({ where: { userId: uid } });
        await prisma.userLessonProgress.deleteMany({ where: { userId: uid } });
        await prisma.practiceAttempt.deleteMany({ where: { player: { userId: uid } } });
        await prisma.session.deleteMany({ where: { userId: uid } });
        await prisma.playerProfile.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await prisma.$disconnect();
  });

  describe('1. Cross-User Data Isolation & Authentication Boundaries', () => {
    let userAGameId: string;

    it('creates a game for User A successfully', async () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');

      const payload = {
        opponentName: 'Stockfish AI',
        opponentType: 'AI',
        playerColor: 'WHITE',
        result: 'WIN',
        status: 'COMPLETED',
        finalFen: chess.fen(),
        moves: [
          { ply: 1, moveNumber: 1, color: 'w', san: 'e4', uci: 'e2e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
          { ply: 2, moveNumber: 1, color: 'b', san: 'e5', uci: 'e7e5', fen: chess.fen() }
        ]
      };

      const res = await request(app)
        .post('/api/games')
        .set('Cookie', userACookie)
        .send(payload);

      expect(res.status).toBe(201);
      userAGameId = res.body.data.id;
      expect(userAGameId).toBeDefined();
    });

    it('prevents User B from accessing User A’s private game (cross-user isolation)', async () => {
      const res = await request(app)
        .get(`/api/games/${userAGameId}`)
        .set('Cookie', userBCookie);

      // Must be forbidden (403) or not found (404)
      expect([403, 404]).toContain(res.status);
    });

    it('ensures User B’s game list does NOT include User A’s games', async () => {
      const res = await request(app)
        .get('/api/games')
        .set('Cookie', userBCookie);

      expect(res.status).toBe(200);
      const found = res.body.data.find((g: any) => g.id === userAGameId);
      expect(found).toBeUndefined();
    });
  });

  describe('2. Idempotent Lesson Progress Persistence Across Sessions', () => {
    it('persists step validation for Scholar’s Mate lesson across logout and re-login', async () => {
      // User A validates Step 2 (3... g6!)
      const step2Res = await request(app)
        .post('/api/curriculum/lessons/opening-traps-scholar/validate-step')
        .set('Cookie', userACookie)
        .send({ stepNumber: 2, moveSan: 'g6', moveFrom: 'g7', moveTo: 'g6' });

      expect(step2Res.status).toBe(200);
      expect(step2Res.body.correct).toBe(true);

      // User A logs out
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', userACookie);
      expect(logoutRes.status).toBe(200);

      // User A logs in again with fresh credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userAEmail, password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      const newCookies = loginRes.headers['set-cookie'];
      userACookie = Array.isArray(newCookies) ? newCookies[0] : (newCookies as string);

      // Verify that curriculum catalog reflects persisted progress in new session
      const catalogRes = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', userACookie);

      expect(catalogRes.status).toBe(200);
      const openingsModule = catalogRes.body.modules.find((m: any) => m.id === 'openings');
      const scholarLesson = openingsModule.lessons.find((l: any) => l.id === 'opening-traps-scholar');
      expect(scholarLesson).toBeDefined();
      expect(scholarLesson.currentStep).toBe(3);
      expect(scholarLesson.progressPercent).toBeGreaterThan(0);
      expect(catalogRes.body.stats.inProgressLessons).toBeGreaterThan(0);

      // Verify DB record uniqueness: exactly 1 progress row exists for User A on this lesson
      const progressRows = await prisma.userLessonProgress.findMany({
        where: { userId: userAId, lessonId: 'opening-traps-scholar' }
      });
      expect(progressRows.length).toBe(1);
    });
  });

  describe('3. Authoritative Chess Move Legality Enforcement', () => {
    it('accepts authoritatively legal chess games', async () => {
      const chess = new Chess();
      chess.move('d4');
      chess.move('d5');

      const validPayload = {
        opponentName: 'Stockfish AI',
        opponentType: 'AI',
        playerColor: 'WHITE',
        result: 'DRAW',
        status: 'COMPLETED',
        finalFen: chess.fen(),
        moves: [
          { ply: 1, moveNumber: 1, color: 'w', san: 'd4', uci: 'd2d4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1' },
          { ply: 2, moveNumber: 1, color: 'b', san: 'd5', uci: 'd7d5', fen: chess.fen() }
        ]
      };

      const res = await request(app)
        .post('/api/games')
        .set('Cookie', userACookie)
        .send(validPayload);

      expect(res.status).toBe(201);
    });

    it('strictly rejects illegal moves submitted to /api/games with HTTP 400', async () => {
      const illegalPayload = {
        opponentName: 'Cheater Bot',
        opponentType: 'AI',
        playerColor: 'WHITE',
        result: 'WIN',
        status: 'COMPLETED',
        finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: [
          // Pawn jumping across board illegally
          { ply: 1, moveNumber: 1, color: 'w', san: 'e7', uci: 'e2e7', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1' }
        ]
      };

      const res = await request(app)
        .post('/api/games')
        .set('Cookie', userACookie)
        .send(illegalPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('4. Independent Tactical Verification of Opening Trap Lessons', () => {
    it('validates Scholar’s Mate complete pedagogical sequence with chess.js', () => {
      const game = new Chess();
      // 1. e4 e5
      expect(game.move('e4')).not.toBeNull();
      expect(game.move('e5')).not.toBeNull();
      // 2. Qh5 Nc6
      expect(game.move('Qh5')).not.toBeNull();
      expect(game.move('Nc6')).not.toBeNull();
      // 3. Bc4
      expect(game.move('Bc4')).not.toBeNull();

      // Verify the critical instructive choice:
      // A: 3... Nf6?? is legal on board but allows checkmate
      const testFork = new Chess(game.fen());
      testFork.move('Nf6');
      expect(testFork.move('Qxf7#')).not.toBeNull();
      expect(testFork.isCheckmate()).toBe(true);

      // B: Instructive master line: 3... g6! closes the diagonal
      expect(game.move('g6')).not.toBeNull();
      // White retreats queen renewing threat: 4. Qf3
      expect(game.move('Qf3')).not.toBeNull();
      // Black develops and defends cleanly: 4... Nf6!
      expect(game.move('Nf6')).not.toBeNull();

      // Check board state: Black has harmonious piece development, White's queen is misplaced
      expect(game.isCheckmate()).toBe(false);
      expect(game.isCheck()).toBe(false);
    });

    it('validates Fried Liver Defense complete pedagogical sequence with chess.js', () => {
      const game = new Chess();
      // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5
      for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']) {
        expect(game.move(m)).not.toBeNull();
      }

      // Verify 4... d5! is legal and blocks the c4 bishop
      expect(game.move('d5')).not.toBeNull();
      // White captures: 5. exd5
      expect(game.move('exd5')).not.toBeNull();

      // Verify 5... Na5! counterattacks the bishop
      const na5Move = game.move('Na5');
      expect(na5Move).not.toBeNull();
      expect(na5Move?.from).toBe('c6');
      expect(na5Move?.to).toBe('a5');

      // The c4 bishop is attacked
      expect(game.attackers('c4', 'b')).toContain('a5');
    });
  });
});
