import { prisma } from '../config/database.js';
import {
  Game,
  GameMove,
  GameAnalysis,
  GameStatus,
  GameResult,
  CreateGameInput,
  UpdateGameInput
} from '../types/index.js';

export interface GameFilterParams {
  status?: GameStatus;
  result?: GameResult;
}

export type FullGameWithDetails = Game & {
  moves: GameMove[];
  analysis: GameAnalysis | null;
};

export type GameListItem = Game & {
  analysis: GameAnalysis | null;
  moves: GameMove[];
  _count: { moves: number };
};

export class GameRepository {
  async findManyByUserId(
    userId: string,
    skip: number,
    take: number,
    filters?: GameFilterParams
  ): Promise<GameListItem[]> {
    return prisma.game.findMany({
      where: {
        userId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.result ? { result: filters.result } : {})
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: true,
        moves: {
          orderBy: { ply: 'asc' }
        },
        _count: {
          select: { moves: true }
        }
      }
    });
  }

  async countByUserId(userId: string, filters?: GameFilterParams): Promise<number> {
    return prisma.game.count({
      where: {
        userId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.result ? { result: filters.result } : {})
      }
    });
  }

  async findByIdAndUserId(gameId: string, userId: string): Promise<FullGameWithDetails | null> {
    return prisma.game.findFirst({
      where: {
        id: gameId,
        userId
      },
      include: {
        moves: {
          orderBy: { ply: 'asc' }
        },
        analysis: true
      }
    });
  }

  async createTransactional(
    userId: string,
    input: CreateGameInput,
    verifiedFinalFen: string,
    verifiedPgn?: string
  ): Promise<FullGameWithDetails> {
    return prisma.$transaction(async (tx) => {
      // 1. Create Game record
      const game = await tx.game.create({
        data: {
          userId,
          opponentName: input.opponentName,
          opponentType: input.opponentType,
          playerColor: input.playerColor,
          result: input.result,
          status: input.status,
          openingName: input.openingName,
          openingEco: input.openingEco,
          startedAt: input.startedAt ?? new Date(),
          endedAt: input.endedAt,
          finalFen: verifiedFinalFen,
          pgn: verifiedPgn ?? input.pgn
        }
      });

      // 2. Create GameMove records in batch
      if (input.moves && input.moves.length > 0) {
        await tx.gameMove.createMany({
          data: input.moves.map((m) => ({
            gameId: game.id,
            ply: m.ply,
            moveNumber: m.moveNumber,
            color: m.color,
            san: m.san,
            uci: m.uci,
            fen: m.fen,
            evaluation: m.evaluation,
            isMate: m.isMate ?? false,
            mateIn: m.mateIn,
            classification: m.classification,
            explanation: m.explanation,
            timeSpentSeconds: m.timeSpentSeconds
          }))
        });
      }

      // 3. Create optional GameAnalysis
      let analysis: GameAnalysis | null = null;
      if (input.analysis) {
        analysis = await tx.gameAnalysis.create({
          data: {
            gameId: game.id,
            engineName: input.analysis.engineName || 'Stockfish',
            engineVersion: input.analysis.engineVersion,
            accuracyWhite: input.analysis.accuracyWhite,
            accuracyBlack: input.analysis.accuracyBlack,
            summary: input.analysis.summary,
            details: input.analysis.details as any,
            analysisVersion: input.analysis.analysisVersion ?? 1
          }
        });
      }

      // Fetch created moves ordered by ply
      const moves = await tx.gameMove.findMany({
        where: { gameId: game.id },
        orderBy: { ply: 'asc' }
      });

      return {
        ...game,
        moves,
        analysis
      };
    });
  }

  async update(gameId: string, input: UpdateGameInput): Promise<Game> {
    return prisma.game.update({
      where: { id: gameId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.result ? { result: input.result } : {}),
        ...(input.finalFen ? { finalFen: input.finalFen } : {}),
        ...(input.pgn ? { pgn: input.pgn } : {}),
        ...(input.endedAt ? { endedAt: input.endedAt } : {})
      }
    });
  }

  async delete(gameId: string): Promise<Game> {
    return prisma.game.delete({
      where: { id: gameId }
    });
  }
}

export const gameRepository = new GameRepository();
