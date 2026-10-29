import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

const app = createApp();

// ---------------------------------------------------------------------------
// Phase 3B: Tests authenticate via real session cookies.
// We create/ensure a test user and login to get a session cookie,
// then use that cookie for all authenticated requests.
// No DEV_USER_ID injection.
// ---------------------------------------------------------------------------

const TEST_USER_EMAIL = 'api-test-user@chesscoach.local';
const TEST_USER_PASSWORD = 'ApiTestPassword123!';
const TEST_USER_DISPLAY = 'API Test Player';

let authCookie = '';
let testUserId = '';

describe('Chess Coach Backend API Tests', () => {
  beforeAll(async () => {
    // Ensure test user exists (upsert by email)
    // First try to find existing user
    let user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });

    if (!user) {
      // Register via API to get a properly hashed password
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: TEST_USER_EMAIL,
          displayName: TEST_USER_DISPLAY,
          password: TEST_USER_PASSWORD
        });

      if (regRes.status !== 201 && regRes.status !== 409) {
        throw new Error(`Failed to create test user: ${JSON.stringify(regRes.body)}`);
      }

      user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
    }

    testUserId = user!.id;

    // Login to get session cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }

    const setCookie = loginRes.headers['set-cookie'];
    authCookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /api/health should return 200 and report database connectivity', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.services).toEqual({
        api: 'ok',
        database: 'ok'
      });
    });
  });

  describe('2. User Profile Endpoint', () => {
    it('GET /api/users/profile should return safe player profile without passwordHash', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', testUserId);
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).toHaveProperty('rating');
      expect(res.body.data).toHaveProperty('gamesPlayed');
    });

    it('GET /api/users/profile should return 401 without authentication', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Game Creation and Validation (DATA OWNERSHIP & Chess Legality)', () => {
    let createdGameId: string;

    it('POST /api/games should accept a legal game with moves and analysis', async () => {
      const payload = {
        opponentName: 'Stockfish 19 AI',
        opponentType: 'AI',
        playerColor: 'WHITE',
        result: 'WIN',
        status: 'COMPLETED',
        openingName: 'Scholar\'s Mate Setup',
        openingEco: 'C20',
        finalFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        moves: [
          {
            ply: 1,
            moveNumber: 1,
            color: 'w',
            san: 'e4',
            uci: 'e2e4',
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
            evaluation: 0.2,
            classification: 'BEST',
            explanation: 'Controls central squares'
          },
          {
            ply: 2,
            moveNumber: 1,
            color: 'b',
            san: 'e5',
            uci: 'e7e5',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            evaluation: 0.2,
            classification: 'BEST',
            explanation: 'Responds centrally'
          },
          {
            ply: 3,
            moveNumber: 2,
            color: 'w',
            san: 'Bc4',
            uci: 'f1c4',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
            evaluation: 0.3,
            classification: 'BEST',
            explanation: 'Targets f7'
          },
          {
            ply: 4,
            moveNumber: 2,
            color: 'b',
            san: 'Nc6',
            uci: 'b8c6',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
            evaluation: 0.3,
            classification: 'BEST',
            explanation: 'Develops knight'
          },
          {
            ply: 5,
            moveNumber: 3,
            color: 'w',
            san: 'Qf3',
            uci: 'd1f3',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            evaluation: 0.4,
            classification: 'GOOD',
            explanation: 'Threatens Qxf7#'
          },
          {
            ply: 6,
            moveNumber: 3,
            color: 'b',
            san: 'Nf6',
            uci: 'g8f6',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
            evaluation: 0.1,
            classification: 'BEST',
            explanation: 'Defends f7 checkmate'
          }
        ],
        analysis: {
          engineName: 'Stockfish',
          engineVersion: 'Stockfish 19 Lite WASM',
          accuracyWhite: 92.5,
          accuracyBlack: 88.0,
          summary: 'Solid opening execution with Scholar\'s threat neutralized.',
          details: {
            phaseReviews: {
              opening: { title: 'Opening', positivePoints: ['Sound central development'] }
            }
          }
        }
      };

      const res = await request(app)
        .post('/api/games')
        .set('Cookie', authCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.moves).toHaveLength(6);

      // Verify DATA OWNERSHIP separation:
      expect(res.body.data.moves[0].evaluation).toBe(0.2);
      expect(res.body.data.moves[0].classification).toBe('BEST');
      expect(res.body.data.moves[0].explanation).toBe('Controls central squares');

      // Aggregate analysis data resides on analysis
      expect(res.body.data.analysis).not.toBeNull();
      expect(res.body.data.analysis.engineVersion).toBe('Stockfish 19 Lite WASM');
      expect(res.body.data.analysis.accuracyWhite).toBe(92.5);
      expect(res.body.data.analysis.accuracyBlack).toBe(88.0);
      expect(res.body.data.analysis.summary).toBe('Solid opening execution with Scholar\'s threat neutralized.');

      createdGameId = res.body.data.id;
    });

    it('POST /api/games should reject an illegal move with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', authCookie)
        .send({
          opponentName: 'Stockfish AI',
          playerColor: 'WHITE',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [
            {
              ply: 1,
              moveNumber: 1,
              color: 'w',
              san: 'e5', // e5 is illegal on move 1 for White
              fen: 'rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
            }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('ILLEGAL_MOVE');
    });

    it('POST /api/games should reject an inconsistent final FEN with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', authCookie)
        .send({
          opponentName: 'Stockfish AI',
          playerColor: 'WHITE',
          finalFen: '8/8/8/8/8/8/8/8 w - - 0 1', // Bogus final FEN
          moves: [
            {
              ply: 1,
              moveNumber: 1,
              color: 'w',
              san: 'e4',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
            }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('INCONSISTENT_FINAL_FEN');
    });

    it('POST /api/games should reject invalid ply sequence with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', authCookie)
        .send({
          opponentName: 'Stockfish AI',
          playerColor: 'WHITE',
          finalFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          moves: [
            {
              ply: 3, // Skipped ply 1 and 2
              moveNumber: 1,
              color: 'w',
              san: 'e4',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
            }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PLY');
    });
  });

  describe('4. Game Retrieval and Pagination', () => {
    it('GET /api/games should list games with pagination (authenticated)', async () => {
      const res = await request(app)
        .get('/api/games?page=1&limit=10')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 10);
    });

    it('GET /api/games/:gameId should return the created game with ordered plies', async () => {
      const listRes = await request(app)
        .get('/api/games?limit=1')
        .set('Cookie', authCookie);

      if (listRes.body.data.length === 0) return; // no games yet

      const game = listRes.body.data[0];
      const res = await request(app)
        .get(`/api/games/${game.id}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(game.id);
      expect(res.body.data.moves).toBeDefined();

      // Check plies are ordered ascending
      for (let i = 0; i < res.body.data.moves.length; i++) {
        expect(res.body.data.moves[i].ply).toBe(i + 1);
      }
    });

    it('GET /api/games/:gameId should return 404 for nonexistent game', async () => {
      const res = await request(app)
        .get('/api/games/non-existent-game-id-99999')
        .set('Cookie', authCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('GAME_NOT_FOUND');
    });
  });

  describe('5. Game Update and Cascade Deletion', () => {
    let tempGameId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Cookie', authCookie)
        .send({
          opponentName: 'Test Opponent',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: []
        });
      tempGameId = res.body.data.id;
    });

    it('PUT /api/games/:gameId should update game status and result', async () => {
      const res = await request(app)
        .put(`/api/games/${tempGameId}`)
        .set('Cookie', authCookie)
        .send({ status: 'RESIGNED', result: 'LOSS' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RESIGNED');
      expect(res.body.data.result).toBe('LOSS');
    });

    it('DELETE /api/games/:gameId should delete game and cascade', async () => {
      const res = await request(app)
        .delete(`/api/games/${tempGameId}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tempGameId);

      const verifyRes = await request(app)
        .get(`/api/games/${tempGameId}`)
        .set('Cookie', authCookie);
      expect(verifyRes.status).toBe(404);
    });
  });

  describe('6. Game Ownership & Unauthorized Access', () => {
    let otherUserGameId: string;

    beforeAll(async () => {
      // Create a game belonging to another user directly in DB
      const otherUser = await prisma.user.upsert({
        where: { id: 'other-user-999' },
        update: {},
        create: {
          id: 'other-user-999',
          email: 'other@chesscoach.local',
          passwordHash: 'hashed',
          displayName: 'Other Player'
        }
      });

      const otherGame = await prisma.game.create({
        data: {
          id: 'other-user-secret-game',
          userId: otherUser.id,
          opponentName: 'Magnus Carlsen',
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        }
      });
      otherUserGameId = otherGame.id;
    });

    afterAll(async () => {
      await prisma.game.deleteMany({ where: { userId: 'other-user-999' } });
      await prisma.user.deleteMany({ where: { id: 'other-user-999' } });
    });

    it('GET /api/games/:gameId should return 403 when accessing another user\'s game', async () => {
      const res = await request(app)
        .get(`/api/games/${otherUserGameId}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PUT /api/games/:gameId should return 403 when modifying another user\'s game', async () => {
      const res = await request(app)
        .put(`/api/games/${otherUserGameId}`)
        .set('Cookie', authCookie)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('DELETE /api/games/:gameId should return 403 when deleting another user\'s game', async () => {
      const res = await request(app)
        .delete(`/api/games/${otherUserGameId}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
