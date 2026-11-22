import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('CSRF origin validation for unsafe methods', () => {
  it('rejects cookie-authenticated writes with no Origin header', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('x-test-csrf-enforce', 'true')
      .send({
        email: `csrf-no-origin-${Date.now()}@chessmastery.test`,
        displayName: 'No Origin Tester',
        password: 'Password123!'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FORBIDDEN');
    expect(res.body.error.message).toMatch(/origin/i);
  });

  it('allows writes from the configured client origin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: `csrf-allowed-${Date.now()}@chessmastery.test`,
        displayName: 'Allowed Origin Tester',
        password: 'Password123!'
      });

    expect([200, 201]).toContain(res.status);
  });
});
