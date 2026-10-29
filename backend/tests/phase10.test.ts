import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Chess } from 'chess.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { seedPuzzles } from '../prisma/seed-puzzles.js';
import { seedCurriculum } from '../prisma/seed-curriculum.js';
import { chessThemeDetector } from '../src/utils/chess-theme-detector.js';

const app = createApp();

describe('Phase 10: Chess Intelligence & Personalized Training Quality Tests', () => {
  let userCookie: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Ensure clean, verified seed state
    await seedCurriculum();
    await seedPuzzles(prisma);

    // 2. Register test user
    const email = `phase10_test_${Date.now()}@chessmastery.test`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password: 'Password123!',
        displayName: 'Phase10 Auditor'
      });

    expect(regRes.status).toBe(201);
    testUserId = regRes.body.user.id;
    const rawCookies = regRes.headers['set-cookie'];
    userCookie = Array.isArray(rawCookies) ? rawCookies[0] : (rawCookies as string);
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.userLessonProgress.deleteMany({ where: { userId: testUserId } });
      await prisma.practiceAttempt.deleteMany({
        where: { player: { userId: testUserId } }
      });
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.playerProfile.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  describe('1. Puzzle Seeding Idempotency & Data Integrity', () => {
    it('seeds exactly 13 active verified chess puzzles across diverse themes', async () => {
      const count = await prisma.puzzle.count({ where: { isActive: true } });
      expect(count).toBe(13);

      const puzzles = await prisma.puzzle.findMany();
      const themes = new Set(puzzles.map((p) => p.theme));
      expect(themes.has('FORK')).toBe(true);
      expect(themes.has('PIN')).toBe(true);
      expect(themes.has('SKEWER')).toBe(true);
      expect(themes.has('HANGING_PIECE')).toBe(true);
      expect(themes.has('BACK_RANK')).toBe(true);
      expect(themes.has('CENTER_CONTROL')).toBe(true);

      // Verify each puzzle has valid FEN and legal solution move
      for (const p of puzzles) {
        const chess = new Chess(p.fen);
        expect(chess.turn()).toBe(p.playerColor);
        const sol = p.solutionMoves as Array<{ from: string; to: string; san: string }>;
        expect(sol.length).toBeGreaterThan(0);
        const legal = chess.move({ from: sol[0].from as any, to: sol[0].to as any });
        expect(legal).not.toBeNull();
      }
    });

    it('rerunning seed is strictly idempotent and does not duplicate puzzles', async () => {
      const initialCount = await prisma.puzzle.count();
      await seedPuzzles(prisma);
      const postCount = await prisma.puzzle.count();
      expect(postCount).toBe(initialCount);
    });
  });

  describe('2. Interactive Opening Trainer: Scholar’s Mate & Fried Liver Lessons', () => {
    it('includes both new opening trap lessons in the active catalog', async () => {
      const res = await request(app)
        .get('/api/curriculum/catalog')
        .set('Cookie', userCookie);

      expect(res.status).toBe(200);
      const openingsModule = res.body.modules.find((m: any) => m.id === 'openings');
      expect(openingsModule).toBeDefined();

      const scholarLesson = openingsModule.lessons.find((l: any) => l.id === 'opening-traps-scholar');
      expect(scholarLesson).toBeDefined();
      expect(scholarLesson.title).toContain("Scholar's Mate");
      expect(scholarLesson.themeTag).toBe('opening_trap');

      const friedLiverLesson = openingsModule.lessons.find((l: any) => l.id === 'opening-traps-fried-liver');
      expect(friedLiverLesson).toBeDefined();
      expect(friedLiverLesson.title).toContain('Fried Liver');
      expect(friedLiverLesson.themeTag).toBe('opening_trap');
    });

    it('validates Scholar’s Mate Defense interactive step authoritatively with chess.js', async () => {
      // Step 2 is: 3... g6! blocking the Queen attack on f7
      const validRes = await request(app)
        .post('/api/curriculum/lessons/opening-traps-scholar/validate-step')
        .set('Cookie', userCookie)
        .send({
          stepNumber: 2,
          moveSan: 'g6',
          moveFrom: 'g7',
          moveTo: 'g6'
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.correct).toBe(true);
      expect(validRes.body.nextStepNumber).toBe(3);

      // Rejects incorrect move (e.g. 3... a6) with instructive feedback
      const invalidRes = await request(app)
        .post('/api/curriculum/lessons/opening-traps-scholar/validate-step')
        .set('Cookie', userCookie)
        .send({
          stepNumber: 2,
          moveSan: 'a6',
          moveFrom: 'a7',
          moveTo: 'a6'
        });

      expect(invalidRes.status).toBe(200);
      expect(invalidRes.body.correct).toBe(false);
      expect(invalidRes.body.feedback).toContain('not the objective');

      // Rejects outright illegal move
      const illegalRes = await request(app)
        .post('/api/curriculum/lessons/opening-traps-scholar/validate-step')
        .set('Cookie', userCookie)
        .send({
          stepNumber: 2,
          moveSan: 'e4',
          moveFrom: 'e7',
          moveTo: 'e4'
        });

      expect(illegalRes.status).toBe(200);
      expect(illegalRes.body.correct).toBe(false);
      expect(illegalRes.body.feedback).toContain('not legal');
    });

    it('validates Fried Liver Attack Defense interactive move 5... Na5! authoritatively', async () => {
      // Step 3 is 5... Na5! attacking the c4 bishop
      const validRes = await request(app)
        .post('/api/curriculum/lessons/opening-traps-fried-liver/validate-step')
        .set('Cookie', userCookie)
        .send({
          stepNumber: 3,
          moveSan: 'Na5',
          moveFrom: 'c6',
          moveTo: 'a5'
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.correct).toBe(true);
      expect(validRes.body.nextStepNumber).toBe(4);
    });
  });

  describe('3. Chess Geometry & Theme Detection Accuracy', () => {
    it('detects knight fork accurately with concrete piece coordinates', () => {
      // White knight on d5 plays Nxc7+ checking King on e8 and attacking Rook on a8
      const fenBefore = 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1';
      const chess = new Chess(fenBefore);
      const move = chess.move('Nxc7+');
      expect(move).toBeDefined();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter: chess.fen(),
        moveSan: 'Nxc7+',
        moveNumber: 1,
        playerColor: 'w',
        classification: 'BEST'
      });

      const forkTheme = themes.find((t) => t.theme === 'FORK');
      expect(forkTheme).toBeDefined();
      expect(forkTheme?.category).toBe('TACTICS');
    });

    it('detects hanging piece blunders accurately', () => {
      // White moves knight to unprotected square d4 attacked by Black pawn on e5
      const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
      const chess = new Chess(fenBefore);
      chess.move('Nd4');
      const fenAfter = chess.fen();

      const themes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: 'Nd4',
        moveNumber: 2,
        playerColor: 'w',
        classification: 'BLUNDER'
      });

      const hanging = themes.find((t) => t.theme === 'HANGING_PIECE');
      expect(hanging).toBeDefined();
    });
  });

  describe('4. Engine Line Replay & Legality Verification', () => {
    it('validates principal variation sequentially with chess.js without inventing illegal moves', () => {
      // Italian game position
      const fenBefore = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const pv = ['O-O', 'Nf6', 'd3', 'd6'];

      const testChess = new Chess(fenBefore);
      const replayed: string[] = [];

      for (const san of pv) {
        const m = testChess.move(san);
        expect(m).not.toBeNull();
        replayed.push(m!.san);
      }

      expect(replayed).toEqual(pv);
      expect(testChess.isGameOver()).toBe(false);
    });
  });
});
