import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

describe('Full-Stack Player Profile & Avatar Persistence Suite', () => {
  const app = createApp();
  const testEmail = `avatar-test-${Date.now()}@chessmastery.test`;
  const testPassword = 'Password123!';
  let sessionCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Register verified test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        displayName: 'Initial Player',
        password: testPassword
      });

    // Mark verified directly in DB for test
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    userId = user!.id;
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    });

    // Login to obtain active session
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    sessionCookie = loginRes.headers['set-cookie'][0];
    expect(sessionCookie).toBeDefined();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  it('rejects unauthenticated PATCH /api/player/profile with 401', async () => {
    const res = await request(app)
      .patch('/api/player/profile')
      .send({ avatarUrl: 'data:image/webp;base64,sample' });

    expect(res.status).toBe(401);
  });

  it('successfully updates and persists avatar image and profile customization in PostgreSQL', async () => {
    const mockCompressedAvatar = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoIAAgAAkA4JZwCdAD0eE8AAP7/lP/gP/99/33/Pf88/zf/M/8w/y7/KP8g/x7/Gf8V/xD/Cv8A';

    const patchRes = await request(app)
      .patch('/api/player/profile')
      .set('Cookie', sessionCookie)
      .send({
        displayName: 'Grandmaster Mohan',
        avatarUrl: mockCompressedAvatar,
        bio: 'Tactical calculating specialist striving for grandmaster norms.',
        country: 'India 🇮🇳',
        preferredStyle: 'Tactical',
        favoriteOpening: 'Italian Game',
        favoriteOpeningBlack: 'Sicilian Defense',
        flair: '👑',
        statusMessage: 'Ready for blitz tournaments'
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.profile.avatarUrl).toBe(mockCompressedAvatar);
    expect(patchRes.body.data.profile.country).toBe('India 🇮🇳');
    expect(patchRes.body.data.profile.flair).toBe('👑');
    expect(patchRes.body.data.user.displayName).toBe('Grandmaster Mohan');

    // Verify persisted directly in PostgreSQL
    const profileInDb = await prisma.playerProfile.findUnique({ where: { userId } });
    expect(profileInDb?.avatarUrl).toBe(mockCompressedAvatar);
    expect(profileInDb?.country).toBe('India 🇮🇳');
    expect(profileInDb?.bio).toContain('Tactical calculating specialist');

    const userInDb = await prisma.user.findUnique({ where: { id: userId } });
    expect(userInDb?.displayName).toBe('Grandmaster Mohan');
  });

  it('returns updated avatar and profile fields on GET /api/player/profile', async () => {
    const res = await request(app)
      .get('/api/player/profile')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toContain('data:image/webp;base64');
    expect(res.body.data.country).toBe('India 🇮🇳');
    expect(res.body.data.flair).toBe('👑');
  });

  it('returns updated avatar on GET /api/auth/me session check', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Grandmaster Mohan');
    expect(res.body.profile.avatarUrl).toContain('data:image/webp;base64');
    expect(res.body.profile.country).toBe('India 🇮🇳');
  });
});
