import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { seedPuzzles } from '../prisma/seed-puzzles.js';

const app = createApp();

describe('GET /api/puzzles/library', () => {
  beforeAll(async () => {
    await seedPuzzles(prisma);
  });

  afterAll(async () => {
    // Prisma is shared with the rest of the suite; nothing to tear down here.
  });

  it('returns active puzzles in rating order without authentication', async () => {
    const res = await request(app).get('/api/puzzles/library');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.puzzles)).toBe(true);
    expect(res.body.puzzles.length).toBeGreaterThanOrEqual(13);

    const ratings = res.body.puzzles.map((p: { rating: number }) => p.rating);
    expect(ratings).toEqual([...ratings].sort((a: number, b: number) => a - b));

    const first = res.body.puzzles[0];
    expect(first).toHaveProperty('fen');
    expect(first).toHaveProperty('solutionMoves');
    expect(first).toHaveProperty('hints');
    expect(first).not.toHaveProperty('isActive');
  });

  it('excludes inactive puzzles', async () => {
    const paused = await prisma.puzzle.findFirst({ where: { isActive: true } });
    if (!paused) return;
    await prisma.puzzle.update({ where: { id: paused.id }, data: { isActive: false } });
    try {
      const res = await request(app).get('/api/puzzles/library');
      expect(res.status).toBe(200);
      expect(res.body.puzzles.some((p: { id: string }) => p.id === paused.id)).toBe(false);
    } finally {
      await prisma.puzzle.update({ where: { id: paused.id }, data: { isActive: true } });
    }
  });
});
