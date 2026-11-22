import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import {
  gameRepository,
  FullGameWithDetails,
  GameListItem,
  GameFilterParams
} from '../repositories/game.repository.js';
import { CreateGameInput, UpdateGameInput, PaginatedResult } from '../types/index.js';
import { validateChessMoves } from '../utils/chessValidation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

import { playerMemoryService } from './player-memory.service.js';

export class GameService {
  async listUserGames(
    userId: string,
    page: number,
    limit: number,
    filters?: GameFilterParams
  ): Promise<PaginatedResult<GameListItem>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      gameRepository.findManyByUserId(userId, skip, limit, filters),
      gameRepository.countByUserId(userId, filters)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async getGameById(gameId: string, userId: string): Promise<FullGameWithDetails> {
    const existing = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!existing) {
      throw new NotFoundError('Game not found', 'GAME_NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this game', 'FORBIDDEN');
    }

    const game = await gameRepository.findByIdAndUserId(gameId, userId);
    if (!game) {
      throw new NotFoundError('Game not found', 'GAME_NOT_FOUND');
    }

    return game;
  }

  async createGame(userId: string, input: CreateGameInput): Promise<FullGameWithDetails> {
    // 1. Resolve the idempotency key. The client normally sends SavedGame.id so
    //    a retry of the same save reuses the exact same key.
    const idempotencyKey = input.idempotencyKey?.trim() || crypto.randomUUID();

    // 2. Authoritative chess move validation with chess.js
    const replay = validateChessMoves(input.moves, input.finalFen, input.pgn);

    // 3. Fast path: an already-saved retry returns the original game without
    //    touching stats/rating or player-memory learning.
    const existing = await gameRepository.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) {
      return existing;
    }

    // 4. Transactionally save game, moves, and optional analysis metadata.
    //    Stats/rating are recalculated from game rows inside that transaction.
    let createdGame: FullGameWithDetails;
    try {
      createdGame = await gameRepository.createTransactional(
        userId,
        { ...input, idempotencyKey },
        replay.calculatedFinalFen,
        replay.verifiedPgn
      );
    } catch (err) {
      // Concurrent duplicate: the unique (userId, idempotencyKey) index makes
      // exactly one writer win. The loser's transaction is rolled back, so no
      // stats/rating mutation survives; return the winner's row instead.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await gameRepository.findByIdempotencyKey(userId, idempotencyKey);
        if (winner) {
          return winner;
        }
      }
      throw err;
    }

    // 5. Incrementally update player memory if analysis or classified moves are present
    if (createdGame.analysis || createdGame.moves.some((m) => m.classification)) {
      try {
        await playerMemoryService.processCompletedGame(userId, createdGame.id);
      } catch (err) {
        console.warn(`[PlayerMemory] Non-blocking learning update failed for game ${createdGame.id}:`, err);
      }
    }

    return createdGame;
  }

  async updateGame(gameId: string, userId: string, input: UpdateGameInput): Promise<FullGameWithDetails> {
    const existing = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!existing) {
      throw new NotFoundError('Game not found', 'GAME_NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this game', 'FORBIDDEN');
    }

    await gameRepository.update(gameId, input);

    const updated = await gameRepository.findByIdAndUserId(gameId, userId);
    if (!updated) {
      throw new NotFoundError('Game not found after update', 'GAME_NOT_FOUND');
    }

    return updated;
  }

  async deleteGame(gameId: string, userId: string): Promise<void> {
    const existing = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!existing) {
      throw new NotFoundError('Game not found', 'GAME_NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this game', 'FORBIDDEN');
    }

    await gameRepository.delete(gameId);
  }
}

export const gameService = new GameService();
