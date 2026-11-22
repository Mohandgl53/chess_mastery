import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { derivePlayerStats } from '../src/services/player-stats.service.js';

const app = createApp();

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const userEmail = `game-idempotency-${stamp}@chesscoach.test`;
const userPassword = 'IdempotencyTest123!';

let cookie = '';
let userId = '';

function gamePayload(
  idempotencyKey: string,
  result: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN' = 'WIN',
  status: 'COMPLETED' | 'IN_PROGRESS' | 'RESIGNED' | 'DRAW' = 'COMPLETED'
) {
  return {
    idempotencyKey,
    opponentName: 'Stockfish',
    opponentType: 'AI',
    playerColor: 'WHITE',
    result,
    status,
    finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: []
  };
}

async function createGame(
  idempotencyKey: string,
  result: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN' = 'WIN',
  status: 'COMPLETED' | 'IN_PROGRESS' | 'RESIGNED' | 'DRAW' = 'COMPLETED'
) {
  return request(app)
    .post('/api/games')
    .set('Cookie', cookie)
    .send(gamePayload(idempotencyKey, result, status));
}

async function getProfile() {
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Test user has no profile');
  return profile;
}

async function resetGamesAndStats() {
  await prisma.game.deleteMany({ where: { userId } });
  await prisma.playerProfile.update({
    where: { userId },
    data: {
      rating: 400,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesDrawn: 0,
      gamesLost: 0,
      currentStreak: 0,
      longestStreak: 0
    }
  });
}

describe('Game save idempotency and stats/rating reconciliation', () => {
  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, displayName: 'Idempotency Tester', password: userPassword });
    expect(reg.status).toBe(201);
    userId = reg.body.user.id;

    const cookieHeader = reg.headers['set-cookie'];
    cookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(';')[0] : cookieHeader.split(';')[0];
    expect(cookie).toContain('chess_coach_session=');
  });

  beforeEach(async () => {
    await resetGamesAndStats();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: userEmail } });
    await prisma.$disconnect();
  });

  it('derives stats from decisive games only, using K=16 and a 100 floor', () => {
    const t = Date.now();
    const derived = derivePlayerStats([
      { id: 'win-1', result: 'WIN' as any, status: 'COMPLETED' as any, createdAt: new Date(t + 1000) },
      { id: 'unknown', result: 'UNKNOWN' as any, status: 'COMPLETED' as any, createdAt: new Date(t + 2000) },
      { id: 'in-progress', result: 'WIN' as any, status: 'IN_PROGRESS' as any, createdAt: new Date(t + 3000) },
      { id: 'loss', result: 'LOSS' as any, status: 'RESIGNED' as any, createdAt: new Date(t + 4000) },
      { id: 'win-2', result: 'WIN' as any, status: 'COMPLETED' as any, createdAt: new Date(t + 5000) }
    ]);

    expect(derived).toEqual({
      rating: 416, // 400 +16 -16 +16
      gamesPlayed: 3,
      gamesWon: 2,
      gamesDrawn: 0,
      gamesLost: 1,
      currentStreak: 1,
      longestStreak: 1
    });
  });

  it('duplicate create with the same idempotency key returns the original game without double-counting', async () => {
    const key = `dup-${stamp}`;
    const first = await createGame(key, 'WIN');
    expect(first.status).toBe(201);

    const second = await createGame(key, 'WIN');
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    const rows = await prisma.game.findMany({ where: { userId, idempotencyKey: key } });
    expect(rows).toHaveLength(1);

    const profile = await getProfile();
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.gamesWon).toBe(1);
    expect(profile.rating).toBe(416);
  });

  it('concurrent duplicate creates produce exactly one game and one stats update', async () => {
    const key = `race-${stamp}`;
    const [first, second] = await Promise.all([
      createGame(key, 'WIN'),
      createGame(key, 'WIN')
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    const rows = await prisma.game.findMany({ where: { userId, idempotencyKey: key } });
    expect(rows).toHaveLength(1);

    const profile = await getProfile();
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.gamesWon).toBe(1);
    expect(profile.rating).toBe(416);
  });

  it('serializes concurrent saves with different keys without losing stat updates', async () => {
    const [first, second] = await Promise.all([
      createGame(`parallel-win-${stamp}`, 'WIN'),
      createGame(`parallel-loss-${stamp}`, 'LOSS')
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const games = await prisma.game.findMany({ where: { userId } });
    expect(games).toHaveLength(2);

    const expected = derivePlayerStats(games);
    const profile = await getProfile();
    expect(profile).toMatchObject(expected);
    expect(profile.gamesPlayed).toBe(2);
    expect(profile.gamesWon).toBe(1);
    expect(profile.gamesLost).toBe(1);
    expect(profile.rating).toBe(400); // +16 then -16
  });

  it('does not count UNKNOWN results or IN_PROGRESS games', async () => {
    const unknown = await createGame(`unknown-${stamp}`, 'UNKNOWN');
    expect(unknown.status).toBe(201);

    const inProgress = await createGame(`inprogress-${stamp}`, 'WIN', 'IN_PROGRESS');
    expect(inProgress.status).toBe(201);

    const profile = await getProfile();
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.gamesWon).toBe(0);
    expect(profile.rating).toBe(400);
  });

  it('changing a game result recomputes stats and rating in both directions', async () => {
    const created = await createGame(`update-${stamp}`, 'UNKNOWN');
    expect(created.status).toBe(201);
    const gameId = created.body.data.id as string;

    let response = await request(app)
      .put(`/api/games/${gameId}`)
      .set('Cookie', cookie)
      .send({ result: 'WIN' });
    expect(response.status).toBe(200);
    let profile = await getProfile();
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.gamesWon).toBe(1);
    expect(profile.rating).toBe(416);

    response = await request(app)
      .put(`/api/games/${gameId}`)
      .set('Cookie', cookie)
      .send({ result: 'LOSS' });
    expect(response.status).toBe(200);
    profile = await getProfile();
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.gamesWon).toBe(0);
    expect(profile.gamesLost).toBe(1);
    expect(profile.rating).toBe(384);

    response = await request(app)
      .put(`/api/games/${gameId}`)
      .set('Cookie', cookie)
      .send({ result: 'UNKNOWN' });
    expect(response.status).toBe(200);
    profile = await getProfile();
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.rating).toBe(400);
  });

  it('deleting a game removes its contribution to stats', async () => {
    const created = await createGame(`delete-${stamp}`, 'WIN');
    expect(created.status).toBe(201);
    const gameId = created.body.data.id as string;

    expect((await getProfile()).rating).toBe(416);

    const deleted = await request(app)
      .delete(`/api/games/${gameId}`)
      .set('Cookie', cookie);
    expect(deleted.status).toBe(200);

    const profile = await getProfile();
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.gamesWon).toBe(0);
    expect(profile.rating).toBe(400);
  });

  it('reconciles corrupted profile counters with the authoritative game rows', async () => {
    await createGame(`reconcile-win-${stamp}`, 'WIN');
    await createGame(`reconcile-loss-${stamp}`, 'LOSS');
    const draw = await createGame(`reconcile-draw-${stamp}`, 'DRAW');
    expect(draw.status).toBe(201);

    // Simulate drift from previous blind increments.
    await prisma.playerProfile.update({
      where: { userId },
      data: { rating: 999, gamesPlayed: 42, gamesWon: 42, gamesLost: 42, gamesDrawn: 42, currentStreak: 42, longestStreak: 42 }
    });

    // Any game mutation triggers a full recalculation.
    const updated = await request(app)
      .put(`/api/games/${draw.body.data.id}`)
      .set('Cookie', cookie)
      .send({ result: 'DRAW' });
    expect(updated.status).toBe(200);

    const games = await prisma.game.findMany({ where: { userId } });
    const expected = derivePlayerStats(games);
    const profile = await getProfile();

    expect(profile).toMatchObject(expected);
    expect(profile.gamesPlayed).toBe(3);
    expect(profile.gamesWon).toBe(1);
    expect(profile.gamesLost).toBe(1);
    expect(profile.gamesDrawn).toBe(1);
    expect(profile.rating).toBe(400);
    expect(profile.currentStreak).toBe(0);
    expect(profile.longestStreak).toBe(1);
  });
});
