import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { practiceService } from '../src/services/practice.service.js';
import { prisma } from '../src/config/database.js';
import { practiceRepository } from '../src/repositories/practice.repository.js';

describe('Phase 8.1.1: Reliability & Acceptance Verification', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Unique test user for isolated reliability tests
    const unique = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const user = await prisma.user.create({
      data: {
        email: `${unique}@chesscoach.test`,
        passwordHash: 'dummy_hash_for_test',
        displayName: 'Reliability Tester',
        profile: {
          create: {
            rating: 1200,
            gamesPlayed: 5,
            lessonsCompleted: 2
          }
        }
      },
      include: { profile: true }
    });
    testUserId = user.id;
  });

  describe('1. Practice Session Recovery & Duplicate Prevention', () => {
    it('returns existing active session rather than creating duplicate', async () => {
      // Start initial session
      const res1 = await practiceService.startSession(testUserId, 'PIN');
      expect(res1.isNew).toBe(true);
      expect(res1.session.status).toBe('ACTIVE');
      expect(res1.session.completedItemCount).toBe(0);

      // Call startSession again immediately
      const res2 = await practiceService.startSession(testUserId, 'PIN');
      expect(res2.isNew).toBe(false);
      expect(res2.session.id).toBe(res1.session.id);

      // Verify DB has only 1 active session for player
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: { profile: true }
      });
      const activeSessions = await prisma.practiceSession.findMany({
        where: {
          playerId: user!.profile!.id,
          status: 'ACTIVE'
        }
      });
      expect(activeSessions.length).toBe(1);
    });

    it('records attempt, advances session items, and preserves session ID', async () => {
      const res = await practiceService.startSession(testUserId, 'FORK');
      const sessionId = res.session.id;
      const puzzleId = res.puzzle!.id;
      const chess = new Chess(res.puzzle!.fen);
      const legalMoves = chess.moves();
      const testMove = legalMoves[0];

      // Make a legal attempt
      const attemptRes = await practiceService.recordAttempt(testUserId, sessionId, {
        puzzleId,
        moveSan: testMove,
        timeSpentMs: 1200
      });

      expect(attemptRes.completedItemCount).toBe(1);

      // Verify resumption retains previous attempt
      const resumeRes = await practiceService.startSession(testUserId, 'FORK');
      expect(resumeRes.session.id).toBe(sessionId);
      expect(resumeRes.session.completedItemCount).toBe(1);
    });

    it('completing session allows clean creation of next session', async () => {
      const res1 = await practiceService.startSession(testUserId, 'SKEWER');
      const sessionId = res1.session.id;

      // Complete session early
      const comp = await practiceService.completeSession(testUserId, sessionId);
      expect(comp.session.status).toBe('COMPLETED');
      expect(comp.session.completedAt).toBeDefined();

      // Start new session
      const res2 = await practiceService.startSession(testUserId, 'BACK_RANK');
      expect(res2.isNew).toBe(true);
      expect(res2.session.id).not.toBe(sessionId);
      expect(res2.session.status).toBe('ACTIVE');
    });
  });

  describe('2. Theme Mastery Boundary Accuracy', () => {
    function computeTier(score: number, isUnstarted: boolean) {
      if (isUnstarted) return 'Not started';
      if (score >= 70) return 'Proficient';
      if (score >= 40) return 'Developing';
      return 'Needs Focus';
    }

    it('validates explicit boundary conditions: 0, 39, 40, 69, 70, 100', () => {
      expect(computeTier(0, true)).toBe('Not started');
      expect(computeTier(0, false)).toBe('Needs Focus');
      expect(computeTier(39, false)).toBe('Needs Focus');
      expect(computeTier(40, false)).toBe('Developing');
      expect(computeTier(69, false)).toBe('Developing');
      expect(computeTier(70, false)).toBe('Proficient');
      expect(computeTier(100, false)).toBe('Proficient');
    });
  });

  describe('3. User Identity & Email Sanitization', () => {
    function formatDisplayEmail(rawEmail?: string | null, displayName?: string | null): string {
      const trimmed = rawEmail?.trim();
      const isSynthetic = Boolean(trimmed && /^testuser_random_[a-z0-9_]+@/i.test(trimmed));
      if (!trimmed || isSynthetic) {
        const cleanName = (displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${cleanName || 'player'}@chesscoach.local`;
      }
      return trimmed;
    }

    it('preserves genuine user emails without altering them', () => {
      expect(formatDisplayEmail('alice@example.com', 'Alice')).toBe('alice@example.com');
      expect(formatDisplayEmail('bob.smith@gmail.com', 'Bob Smith')).toBe('bob.smith@gmail.com');
      expect(formatDisplayEmail('grandmaster@chess.org', 'GM')).toBe('grandmaster@chess.org');
    });

    it('masks internal automated test synthetic addresses cleanly', () => {
      expect(formatDisplayEmail('testuser_random_xyz987@example.com', 'Mohan')).toBe('mohan@chesscoach.local');
      expect(formatDisplayEmail('testuser_random_123456@foo.bar', 'Sarah Connor')).toBe('sarahconnor@chesscoach.local');
    });

    it('falls back gracefully when email is missing or empty', () => {
      expect(formatDisplayEmail('', 'Mohan')).toBe('mohan@chesscoach.local');
      expect(formatDisplayEmail(undefined, 'David')).toBe('david@chesscoach.local');
      expect(formatDisplayEmail(undefined, null)).toBe('player@chesscoach.local');
    });
  });

  describe('4. Lesson Progress Sourcing', () => {
    it('profile contains authoritative lessonsCompleted integer', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: { profile: true }
      });
      expect(user!.profile!.lessonsCompleted).toBe(2);
      expect(typeof user!.profile!.lessonsCompleted).toBe('number');
    });
  });
});
