import { beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { generalApiRateLimiter } from '../src/middleware/rateLimiter.js';

const app = createApp();

describe('Rate limiter enforcement in test mode', () => {
  beforeEach(() => {
    generalApiRateLimiter.reset();
  });

  it('returns 429 after the test limit is exceeded', async () => {
    const hit = () => request(app)
      .get('/api/health')
      .set('x-test-rate-limit', 'true')
      .set('x-test-rate-limit-limit', '2');

    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(200);

    const third = await hit();
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(third.headers['retry-after']).toBeDefined();
  });
});
