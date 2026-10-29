import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { playerMemoryService } from '../src/services/player-memory.service.js';
import { trainingRecommendationService } from '../src/services/training-recommendation.service.js';
import { buildPlayerMemoryContext, buildExplainMovePrompt } from '../src/prompts/coach.prompts.js';
import { KnowledgeCategory, EvidenceType, EvidenceSeverity } from '@prisma/client';

const app = createApp();

const USER_A_EMAIL = 'player-memory-user-a@chesscoach.local';
const USER_A_PASSWORD = 'UserAPassword123!';
const USER_B_EMAIL = 'player-memory-user-b@chesscoach.local';
const USER_B_PASSWORD = 'UserBPassword123!';

let userACookie = '';
let userBCookie = '';
let userAId = '';
let userBId = '';

describe('Phase 6: Player Memory, Skill Profiling & Adaptive Learning Tests', () => {
  beforeAll(async () => {
    // 1. Ensure User A exists and authenticate
    let userA = await prisma.user.findUnique({ where: { email: USER_A_EMAIL } });
    if (!userA) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: USER_A_EMAIL, displayName: 'Player Memory User A', password: USER_A_PASSWORD });
      userA = await prisma.user.findUnique({ where: { email: USER_A_EMAIL } });
    }
    userAId = userA!.id;

    const loginResA = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_A_EMAIL, password: USER_A_PASSWORD });
    const setCookieA = loginResA.headers['set-cookie'];
    userACookie = Array.isArray(setCookieA) ? setCookieA[0].split(';')[0] : setCookieA.split(';')[0];

    // 2. Ensure User B exists and authenticate
    let userB = await prisma.user.findUnique({ where: { email: USER_B_EMAIL } });
    if (!userB) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: USER_B_EMAIL, displayName: 'Player Memory User B', password: USER_B_PASSWORD });
      userB = await prisma.user.findUnique({ where: { email: USER_B_EMAIL } });
    }
    userBId = userB!.id;

    const loginResB = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_B_EMAIL, password: USER_B_PASSWORD });
    const setCookieB = loginResB.headers['set-cookie'];
    userBCookie = Array.isArray(setCookieB) ? setCookieB[0].split(';')[0] : setCookieB.split(';')[0];
  });

  describe('1. Deterministic Skill Score Calculations', () => {
    it('returns neutral 50.0 score when no games have been analyzed', () => {
      const skills = playerMemoryService.calculateSkillScores([], 0, 0, 0, 75);
      expect(skills.tacticsSkill).toBe(50.0);
      expect(skills.calculationSkill).toBe(50.0);
      expect(skills.overallTrainingScore).toBe(50.0);
    });

    it('deterministically computes higher tactics score with positive evidence', () => {
      const evidence = [
        { category: 'TACTICS' as KnowledgeCategory, evidenceType: 'POSITIVE' as EvidenceType, theme: 'FORK' },
        { category: 'TACTICS' as KnowledgeCategory, evidenceType: 'POSITIVE' as EvidenceType, theme: 'PIN' },
        { category: 'TACTICS' as KnowledgeCategory, evidenceType: 'POSITIVE' as EvidenceType, theme: 'SKEWER' }
      ];

      const skills = playerMemoryService.calculateSkillScores(evidence, 3, 0, 1, 85);
      expect(skills.tacticsSkill).toBeGreaterThan(50.0);
      expect(skills.overallTrainingScore).toBeGreaterThan(50.0);
    });

    it('penalizes blunder prevention when blunders are high', () => {
      const skillsLowBlunder = playerMemoryService.calculateSkillScores([], 5, 1, 2, 75);
      const skillsHighBlunder = playerMemoryService.calculateSkillScores([], 5, 8, 2, 75);

      expect(skillsHighBlunder.blunderPreventionSkill).toBeLessThan(skillsLowBlunder.blunderPreventionSkill);
    });

    it('always returns the exact same score for identical input data (determinism)', () => {
      const evidence = [
        { category: 'TACTICS' as KnowledgeCategory, evidenceType: 'NEGATIVE' as EvidenceType, theme: 'FORK' },
        { category: 'KING_SAFETY' as KnowledgeCategory, evidenceType: 'NEGATIVE' as EvidenceType, theme: 'CASTLING' }
      ];

      const run1 = playerMemoryService.calculateSkillScores(evidence, 4, 2, 3, 70);
      const run2 = playerMemoryService.calculateSkillScores(evidence, 4, 2, 3, 70);

      expect(run1).toEqual(run2);
    });
  });

  describe('2. Weakness & Strength Aggregation Rules (Fixtures A, B, C)', () => {
    it('Fixture A: Single mistake produces low confidence weakness', async () => {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });
      expect(profile).toBeDefined();

      const theme = `TEST_FORK_SINGLE_${Date.now()}`;
      const singleMistake = [
        {
          category: 'TACTICS' as KnowledgeCategory,
          theme,
          evidenceType: 'NEGATIVE' as EvidenceType,
          severity: 'MEDIUM' as EvidenceSeverity,
          classification: 'BLUNDER' as any,
          moveSan: 'Nd5'
        }
      ];

      await prisma.$transaction(async (tx) => {
        await playerMemoryService.aggregateWeaknessesInTx(tx, profile!.id, singleMistake);
      });

      const weakness = await prisma.weakness.findUnique({
        where: { playerId_theme: { playerId: profile!.id, theme } }
      });

      expect(weakness).toBeDefined();
      expect(weakness!.occurrenceCount).toBe(1);
      expect(weakness!.confidence).toBeLessThan(0.6); // low confidence for 1 event
      expect(weakness!.status).toBe('ACTIVE');
    });

    it('Fixture B: Repeated mistakes across games escalate to high confidence weakness', async () => {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });
      const theme = `TEST_FORK_PERSISTENT_${Date.now()}`;
      const repeatedMistakes = Array(4).fill({
        category: 'TACTICS' as KnowledgeCategory,
        theme,
        evidenceType: 'NEGATIVE' as EvidenceType,
        severity: 'HIGH' as EvidenceSeverity,
        classification: 'BLUNDER' as any,
        moveSan: 'Nxe4'
      });

      await prisma.$transaction(async (tx) => {
        await playerMemoryService.aggregateWeaknessesInTx(tx, profile!.id, repeatedMistakes);
      });

      const weakness = await prisma.weakness.findUnique({
        where: { playerId_theme: { playerId: profile!.id, theme } }
      });

      expect(weakness).toBeDefined();
      expect(weakness!.occurrenceCount).toBe(4);
      expect(weakness!.confidence).toBeGreaterThan(0.75); // high confidence
    });

    it('Fixture C: Positive reinforcement improves an active weakness', async () => {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });
      const theme = `TEST_IMPROVEMENT_${Date.now()}`;

      // First create weakness
      await prisma.$transaction(async (tx) => {
        await playerMemoryService.aggregateWeaknessesInTx(tx, profile!.id, [
          {
            category: 'TACTICS' as KnowledgeCategory,
            theme,
            evidenceType: 'NEGATIVE' as EvidenceType,
            severity: 'MEDIUM' as EvidenceSeverity
          }
        ]);
      });

      const before = await prisma.weakness.findUnique({
        where: { playerId_theme: { playerId: profile!.id, theme } }
      });
      expect(before!.status).toBe('ACTIVE');

      // Now add positive events for this theme
      await prisma.$transaction(async (tx) => {
        await playerMemoryService.aggregateWeaknessesInTx(
          tx,
          profile!.id,
          Array(2).fill({
            category: 'TACTICS' as KnowledgeCategory,
            theme,
            evidenceType: 'POSITIVE' as EvidenceType,
            severity: 'LOW' as EvidenceSeverity
          })
        );
      });

      const after = await prisma.weakness.findUnique({
        where: { playerId_theme: { playerId: profile!.id, theme } }
      });
      expect(after!.confidence).toBeLessThan(before!.confidence);
      expect(['IMPROVING', 'RESOLVED']).toContain(after!.status);
    });
  });

  describe('3. Training Recommendation Engine', () => {
    it('generates prioritized recommendations based on real player weaknesses', async () => {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });

      const recommendations = await trainingRecommendationService.generateRecommendationsForPlayer(profile!.id);
      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const top = recommendations[0];
        expect(top.priority).toBeGreaterThanOrEqual(1.0);
        expect(top.reason).toContain('Detected');
        expect(top.status).toBe('ACTIVE');
      }
    });

    it('can complete an active recommendation', async () => {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });
      const recs = await prisma.trainingRecommendation.findMany({
        where: { playerId: profile!.id, status: 'ACTIVE' }
      });

      if (recs.length > 0) {
        const completed = await trainingRecommendationService.completeRecommendation(recs[0].id, profile!.id);
        expect(completed.status).toBe('COMPLETED');
        expect(completed.completedAt).toBeDefined();
      }
    });
  });

  describe('4. Post-Game Pipeline & Idempotency (Fixture F)', () => {
    let testGameId = '';

    it('processes completed game, creates evidence, updates profile, and creates SkillSnapshot', async () => {
      // Create a game with moves and Stockfish analysis
      const gameRes = await request(app)
        .post('/api/games')
        .set('Cookie', userACookie)
        .send({
          opponentName: 'Stockfish Lite',
          opponentType: 'AI',
          playerColor: 'WHITE',
          status: 'COMPLETED',
          result: 'LOSS',
          finalFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
          moves: [
            {
              ply: 1,
              moveNumber: 1,
              color: 'w',
              san: 'e4',
              uci: 'e2e4',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
              classification: 'BOOK'
            },
            {
              ply: 2,
              moveNumber: 1,
              color: 'b',
              san: 'e5',
              uci: 'e7e5',
              fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
              classification: 'BOOK'
            },
            {
              ply: 3,
              moveNumber: 2,
              color: 'w',
              san: 'Nf3',
              uci: 'g1f3',
              fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
              classification: 'BEST'
            },
            {
              ply: 4,
              moveNumber: 2,
              color: 'b',
              san: 'Nc6',
              uci: 'b8c6',
              fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
              classification: 'BEST'
            },
            {
              ply: 5,
              moveNumber: 3,
              color: 'w',
              san: 'Bc4',
              uci: 'f1c4',
              fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
              classification: 'BLUNDER',
              explanation: 'Allows knight fork on e4 winning material.'
            }
          ],
          analysis: {
            engineName: 'Stockfish 19 Lite WASM',
            engineVersion: '19.0.0',
            accuracyWhite: 68.5,
            accuracyBlack: 94.0,
            summary: 'White committed a tactical oversight with Bc4.'
          }
        });

      expect(gameRes.status).toBe(201);
      testGameId = gameRes.body.data.id;

      // Check evidence created
      const evidence = await prisma.learningEvidence.findMany({
        where: { gameId: testGameId }
      });
      expect(evidence.length).toBeGreaterThan(0);

      // Verify Game has learningProcessedAt timestamp
      const gameInDb = await prisma.game.findUnique({ where: { id: testGameId } });
      expect(gameInDb!.learningProcessedAt).toBeDefined();

      // Verify SkillSnapshot was generated
      const profile = await prisma.playerProfile.findUnique({ where: { userId: userAId } });
      const snapshots = await prisma.skillSnapshot.findMany({
        where: { playerId: profile!.id }
      });
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('Fixture F: Idempotency guard prevents duplicate evidence when game is re-processed', async () => {
      const evidenceBefore = await prisma.learningEvidence.findMany({
        where: { gameId: testGameId }
      });

      // Call processCompletedGame again on the exact same game
      const secondRun = await playerMemoryService.processCompletedGame(userAId, testGameId);
      expect(secondRun.processed).toBe(false);
      expect(secondRun.evidenceCreated).toBe(0);

      const evidenceAfter = await prisma.learningEvidence.findMany({
        where: { gameId: testGameId }
      });

      expect(evidenceAfter.length).toBe(evidenceBefore.length);
    });
  });

  describe('5. Player API Security & Ownership Enforcement (Fixture E)', () => {
    it('rejects unauthenticated requests to /api/player/profile with 401', async () => {
      const res = await request(app).get('/api/player/profile');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /api/player/progress with 401', async () => {
      const res = await request(app).get('/api/player/progress');
      expect(res.status).toBe(401);
    });

    it('User A receives only their own player profile', async () => {
      const res = await request(app).get('/api/player/profile').set('Cookie', userACookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userAId);
    });

    it('User B receives only their own player profile and not User A memory', async () => {
      const res = await request(app).get('/api/player/profile').set('Cookie', userBCookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(userBId);
      expect(res.body.data.userId).not.toBe(userAId);
    });

    it('Fixture E: User B cannot process or access a game owned by User A', async () => {
      // User B attempts to call process-game for User A's game
      const gamesA = await prisma.game.findMany({ where: { userId: userAId }, take: 1 });
      if (gamesA.length > 0) {
        const res = await request(app)
          .post(`/api/player/process-game/${gamesA[0].id}`)
          .set('Cookie', userBCookie);

        // Should error with 500 or 403 (game does not belong to user)
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('validates query parameters with Zod schema', async () => {
      const res = await request(app)
        .get('/api/player/weaknesses?status=INVALID_STATUS')
        .set('Cookie', userACookie);
      expect(res.status).toBe(400);
    });
  });

  describe('6. Empty-Data Behavior (Fixture D)', () => {
    it('Fixture D: User with 0 analyzed games returns isSufficientData: false', async () => {
      // Fresh new user with 0 games
      const email = `empty-user-${Date.now()}@chesscoach.local`;
      await request(app).post('/api/auth/register').send({
        email,
        displayName: 'Empty User',
        password: 'Password123!'
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email,
        password: 'Password123!'
      });
      const cookie = loginRes.headers['set-cookie'][0].split(';')[0];

      const res = await request(app).get('/api/player/progress').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.isSufficientData).toBe(false);
      expect(res.body.data.profile.gamesAnalyzed).toBe(0);
      expect(res.body.data.profile.overallTrainingScore).toBe(50.0);
    });
  });

  describe('7. Personalized Coach Context Grounding (Prompt Injection & Truth)', () => {
    it('correctly constructs structured player memory context block', () => {
      const memoryContext = buildPlayerMemoryContext({
        overallTrainingScore: 68.5,
        tacticsSkill: 62.0,
        gamesAnalyzed: 5,
        activeWeaknesses: [
          { theme: 'FORK', category: 'TACTICS', count: 3, confidence: 0.85 }
        ],
        strengths: [
          { theme: 'CENTER_CONTROL', category: 'STRATEGY', count: 4 }
        ]
      });

      expect(memoryContext).toContain('--- PLAYER MEMORY (Grounding Profile — Reference Only) ---');
      expect(memoryContext).toContain('Overall Normalized Training Score: 68.5/100');
      expect(memoryContext).toContain('FORK (TACTICS): detected 3 times');
      expect(memoryContext).toContain('--- END PLAYER MEMORY ---');
    });

    it('injects player memory before RAG knowledge in LLM prompts', () => {
      const prompt = buildExplainMovePrompt(
        {
          fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          moveSan: 'e5',
          moveNumber: 1,
          playerColor: 'b',
          classification: 'BOOK_MOVE',
          coachMode: 'FULL_COACHING',
          playerMemory: {
            overallTrainingScore: 72.0,
            activeWeaknesses: [{ theme: 'FORK', category: 'TACTICS', count: 4, confidence: 0.9 }]
          }
        },
        [
          {
            id: 'rag-1',
            title: 'King Safety Basics',
            content: 'Always castle early.',
            category: 'KING_SAFETY'
          }
        ]
      );

      // Verify structure: System prompt has rule 6
      expect(prompt.system).toContain('PERSONALIZED COACHING GROUNDING');
      // User prompt contains Player Memory before Knowledge Base
      const memIndex = prompt.user.indexOf('--- PLAYER MEMORY');
      const ragIndex = prompt.user.indexOf('--- KNOWLEDGE BASE');
      expect(memIndex).toBeGreaterThan(-1);
      expect(ragIndex).toBeGreaterThan(-1);
      expect(memIndex).toBeLessThan(ragIndex);
    });
  });
});
