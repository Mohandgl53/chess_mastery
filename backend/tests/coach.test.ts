import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

const COACH_TEST_USER_EMAIL = 'coach-test-user@chesscoach.local';
const COACH_TEST_USER_PASSWORD = 'CoachPassword123!';
const COACH_TEST_USER_DISPLAY = 'Coach Test Player';

let authCookie = '';
let testUserId = '';
let userGameId = '';

describe('Phase 4: AI Chess Coach API Tests', () => {
  beforeAll(async () => {
    // 1. Ensure test user exists
    let user = await prisma.user.findUnique({ where: { email: COACH_TEST_USER_EMAIL } });

    if (!user) {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: COACH_TEST_USER_EMAIL,
          displayName: COACH_TEST_USER_DISPLAY,
          password: COACH_TEST_USER_PASSWORD
        });

      user = await prisma.user.findUnique({ where: { email: COACH_TEST_USER_EMAIL } });
    }

    testUserId = user!.id;

    // 2. Login to obtain session cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: COACH_TEST_USER_EMAIL, password: COACH_TEST_USER_PASSWORD });

    const setCookie = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];

    // 3. Create a test game owned by this user
    const gameRes = await request(app)
      .post('/api/games')
      .set('Cookie', authCookie)
      .send({
        opponentName: 'Stockfish 19 AI',
        opponentType: 'AI',
        playerColor: 'WHITE',
        status: 'IN_PROGRESS',
        finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      });

    if (gameRes.status !== 201) {
      throw new Error(`Failed to create test game: ${JSON.stringify(gameRes.body)}`);
    }

    userGameId = gameRes.body.data.id;
  });

  describe('1. Authentication Enforcement', () => {
    it('rejects unauthenticated POST /api/coach/explain with 401', async () => {
      const res = await request(app).post('/api/coach/explain').send({
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moveSan: 'e4',
        moveNumber: 1,
        playerColor: 'w',
        classification: 'BOOK_MOVE'
      });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /api/coach/hint with 401', async () => {
      const res = await request(app).post('/api/coach/hint').send({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playerColor: 'w'
      });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /api/coach/chat with 401', async () => {
      const res = await request(app).post('/api/coach/chat').send({
        query: 'What should my plan be?',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playerColor: 'w'
      });
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /api/coach/post-game with 401', async () => {
      const res = await request(app).post('/api/coach/post-game').send({
        moves: [],
        playerColor: 'w',
        result: 'WHITE_WINS',
        resultReason: 'Checkmate'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('2. Validation Constraints', () => {
    it('rejects missing required fields on POST /api/coach/explain with 400', async () => {
      const res = await request(app)
        .post('/api/coach/explain')
        .set('Cookie', authCookie)
        .send({
          moveSan: 'e4' // Missing fens, playerColor, etc.
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty query on POST /api/coach/chat with 400', async () => {
      const res = await request(app)
        .post('/api/coach/chat')
        .set('Cookie', authCookie)
        .send({
          query: '',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          playerColor: 'w'
        });
      expect(res.status).toBe(400);
    });
  });

  describe('3. Core Coaching Capabilities (MockLLMProvider)', () => {
    it('POST /api/coach/explain returns structured blunder analysis', async () => {
      const res = await request(app)
        .post('/api/coach/explain')
        .set('Cookie', authCookie)
        .send({
          fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5P2/PPPP2PP/RNBQKBNR b KQkq - 0 2',
          moveSan: 'f3',
          moveNumber: 2,
          playerColor: 'w',
          classification: 'BLUNDER',
          bestMove: 'Nf3',
          evalBefore: 20,
          evalAfter: -180,
          evalDelta: -200,
          coachMode: 'FULL_COACHING'
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toContain('Blunder');
      expect(res.body.data.content).toBeDefined();
      expect(res.body.data.lesson).toBeDefined();
      expect(res.body.data.suggestedMove).toBe('Nf3');
    });

    it('POST /api/coach/hint returns progressive hint levels', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const candidateMoves = [{ san: 'e5', score: 15 }, { san: 'c5', score: 20 }];

      // Level 1: Strategic
      const resL1 = await request(app)
        .post('/api/coach/hint')
        .set('Cookie', authCookie)
        .send({ fen, playerColor: 'b', hintLevel: 1, candidateMoves });

      expect(resL1.status).toBe(200);
      expect(resL1.body.data.title).toContain('Level 1');

      // Level 3: Direct Move
      const resL3 = await request(app)
        .post('/api/coach/hint')
        .set('Cookie', authCookie)
        .send({ fen, playerColor: 'b', hintLevel: 3, candidateMoves });

      expect(resL3.status).toBe(200);
      expect(resL3.body.data.title).toContain('Level 3');
      expect(resL3.body.data.suggestedMove).toBe('e5');
    });

    it('POST /api/coach/chat provides contextual conversational feedback', async () => {
      const res = await request(app)
        .post('/api/coach/chat')
        .set('Cookie', authCookie)
        .send({
          query: 'What should my strategic plan be here?',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          playerColor: 'w',
          moveHistorySan: ['e4', 'e5', 'Nf3', 'Nc6'],
          openingName: 'Ruy Lopez'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBeDefined();
      expect(res.body.data.lesson).toBeDefined();
    });

    it('POST /api/coach/post-game generates full game review and phase breakdown', async () => {
      const res = await request(app)
        .post('/api/coach/post-game')
        .set('Cookie', authCookie)
        .send({
          moves: [
            { moveNumber: 1, san: 'e4', color: 'w', classification: 'BOOK_MOVE' },
            { moveNumber: 1, san: 'e5', color: 'b', classification: 'BOOK_MOVE' },
            { moveNumber: 2, san: 'Qh5', color: 'w', classification: 'INACCURACY' },
            { moveNumber: 2, san: 'Nc6', color: 'b', classification: 'GOOD_MOVE' }
          ],
          playerColor: 'w',
          result: 'WHITE_WINS',
          resultReason: 'Opponent resigned',
          accuracyWhite: 85,
          accuracyBlack: 78
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.phaseReviews).toBeDefined();
      expect(res.body.data.phaseReviews.opening.title).toBe('Opening Phase');
      expect(res.body.data.phaseReviews.middlegame.title).toBe('Middlegame Strategy');
      expect(res.body.data.phaseReviews.endgame.title).toBe('Endgame Technique');
    });
  });

  describe('4. Game Ownership Isolation', () => {
    it('accepts coach request when gameId belongs to authenticated user', async () => {
      const res = await request(app)
        .post('/api/coach/explain')
        .set('Cookie', authCookie)
        .send({
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          moveSan: 'e4',
          moveNumber: 1,
          playerColor: 'w',
          classification: 'BOOK_MOVE',
          gameId: userGameId
        });
      expect(res.status).toBe(200);
    });

    it('rejects coach request when gameId does not exist with 404', async () => {
      const res = await request(app)
        .post('/api/coach/explain')
        .set('Cookie', authCookie)
        .send({
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          moveSan: 'e4',
          moveNumber: 1,
          playerColor: 'w',
          classification: 'BOOK_MOVE',
          gameId: 'non-existent-game-id-999'
        });
      expect(res.status).toBe(404);
    });
  });
});
