import { prisma } from '../config/database.js';
import type { Session, User } from '@prisma/client';

export type SessionWithUser = Session & { user: User };

export class SessionRepository {
  /**
   * Create a new session record.
   * Only the SHA-256 hash of the token is stored — never the raw token.
   */
  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<Session> {
    return prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        lastSeenAt: new Date()
      }
    });
  }

  /**
   * Find a session by its SHA-256 token hash, including the associated user.
   * Returns null if not found.
   */
  async findByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  }

  /**
   * Delete a session by its SHA-256 token hash.
   * Safe to call even if the session does not exist.
   */
  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  /**
   * Update lastSeenAt timestamp for a session.
   */
  async updateLastSeen(tokenHash: string): Promise<void> {
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { lastSeenAt: new Date() }
    });
  }

  /**
   * Opportunistically delete all expired sessions.
   * Called occasionally; not a guaranteed cleanup mechanism.
   */
  async deleteExpired(): Promise<void> {
    await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  }
}

export const sessionRepository = new SessionRepository();
