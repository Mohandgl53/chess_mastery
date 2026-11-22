import { Game, GameResult, GameStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

/**
 * Single source of truth for game-derived player statistics.
 *
 * Profile counters/rating are never incremented in place: they are rebuilt from
 * the user's recorded game rows. This keeps create/update/delete/idempotent
 * replay paths consistent even when requests are retried or reordered.
 */

const BASELINE_RATING = 400;
const MIN_RATING = 100;
const RATING_K = 16; // Fixed K-factor used by the backend for decisive games.

type CountedGame = Pick<Game, 'id' | 'result' | 'status' | 'createdAt'>;

export interface PlayerStatSnapshot {
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
}

/** Pure derivation used by both the service and its unit tests. */
export function derivePlayerStats(games: CountedGame[]): PlayerStatSnapshot {
  let rating = BASELINE_RATING;
  let gamesPlayed = 0;
  let gamesWon = 0;
  let gamesDrawn = 0;
  let gamesLost = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  // Defensive copy: callers must not be able to influence ordering by mutating
  // the array after the snapshot has started.
  const ordered = [...games].sort((a, b) => {
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  for (const game of ordered) {
    // UNKNOWN results and games still in progress never count toward stats.
    if (game.status === GameStatus.IN_PROGRESS) continue;
    if (game.result === GameResult.UNKNOWN) continue;

    gamesPlayed += 1;

    if (game.result === GameResult.WIN) {
      gamesWon += 1;
      rating += RATING_K;
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (game.result === GameResult.LOSS) {
      gamesLost += 1;
      rating -= RATING_K;
      currentStreak = 0;
    } else if (game.result === GameResult.DRAW) {
      gamesDrawn += 1;
      currentStreak = 0;
    } else {
      // Any future enum value is treated as non-counting.
      gamesPlayed -= 1;
      continue;
    }

    rating = Math.max(MIN_RATING, rating);
  }

  return {
    rating,
    gamesPlayed,
    gamesWon,
    gamesDrawn,
    gamesLost,
    currentStreak,
    longestStreak
  };
}

export class PlayerStatsService {
  /**
   * Serialize all stat-mutating transactions for a user by locking their
   * profile row. Call this at the very start of any transaction that creates,
   * updates, or deletes games so two concurrent saves cannot both derive stats
   * from the same pre-commit snapshot and overwrite each other.
   */
  async lockProfileForUser(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "PlayerProfile" WHERE "userId" = ${userId} FOR UPDATE`;
  }

  /**
   * Recalculate profile stats/rating for a user inside the caller's transaction.
   * Users without a profile are left untouched (profiles are created at registration).
   */
  async recalculateForUser(userId: string, tx: Prisma.TransactionClient = prisma): Promise<PlayerStatSnapshot | null> {
    const profile = await tx.playerProfile.findUnique({ where: { userId } });
    if (!profile) return null;

    const games = await tx.game.findMany({
      where: {
        userId,
        status: { not: GameStatus.IN_PROGRESS },
        result: { in: [GameResult.WIN, GameResult.LOSS, GameResult.DRAW] }
      },
      select: { id: true, result: true, status: true, createdAt: true }
    });

    const snapshot = derivePlayerStats(games);

    const isUnchanged =
      profile.rating === snapshot.rating &&
      profile.gamesPlayed === snapshot.gamesPlayed &&
      profile.gamesWon === snapshot.gamesWon &&
      profile.gamesDrawn === snapshot.gamesDrawn &&
      profile.gamesLost === snapshot.gamesLost &&
      profile.currentStreak === snapshot.currentStreak &&
      profile.longestStreak === snapshot.longestStreak;

    if (!isUnchanged) {
      await tx.playerProfile.update({
        where: { id: profile.id },
        data: snapshot
      });
    }

    return snapshot;
  }
}

export const playerStatsService = new PlayerStatsService();
