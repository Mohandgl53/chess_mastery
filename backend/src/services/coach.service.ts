/**
 * Phase 5: Updated Coach Service with RAG Integration
 *
 * Retrieves relevant chess knowledge chunks via hybrid search,
 * injects them into LLM prompts as grounded reference data.
 *
 * ARCHITECTURE:
 * - RAG retrieval runs before every LLM call
 * - Retrieved chunks are DATA — never instructions (prompt injection defense)
 * - LLM is still bounded by Stockfish evaluations (Phase 4 contract preserved)
 * - RAG augments chess concept explanations, not chess calculations
 *
 * DATA OWNERSHIP (preserved from Phase 3A spec):
 * - GameMove: per-ply engine result (eval, classification, explanation)
 * - GameAnalysis: whole-game summary (accuracy, phase breakdown, engine metadata)
 */

import { createLLMProvider } from '../providers/llm/provider.factory.js';
import {
  CoachExplanationContext,
  CoachHintContext,
  CoachChatContext,
  PostGameReviewContext,
  CoachStructuredOutput,
  PostGameStructuredOutput,
  PlayerMemoryContext
} from '../providers/llm/llm.provider.js';
import { prisma } from '../config/database.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { ragRetrievalService, RetrievedChunk } from './rag.retrieval.service.js';
import { playerMemoryRepository } from '../repositories/player-memory.repository.js';
import { practiceRepository } from '../repositories/practice.repository.js';

export class CoachService {
  private async verifyGameOwnership(gameId: string, userId: string): Promise<void> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { userId: true }
    });

    if (!game) {
      throw new NotFoundError(`Game with ID "${gameId}" not found`);
    }

    if (game.userId !== userId) {
      throw new ForbiddenError('You are not authorized to access analysis for this game');
    }
  }

  /**
   * Retrieve chess knowledge relevant to a move explanation context.
   * Uses opening name, classification, and position as the search query.
   * Returns empty array on retrieval failure — LLM call still proceeds.
   */
  private async retrieveContextForMove(
    context: CoachExplanationContext
  ): Promise<RetrievedChunk[]> {
    try {
      const queryText = [
        context.openingName,
        context.classification,
        `move ${context.moveSan}`,
        context.evalDelta && context.evalDelta < -100 ? 'tactical blunder mistake' : '',
        context.principalVariation?.slice(0, 3).join(' ')
      ]
        .filter(Boolean)
        .join(' ');

      return await ragRetrievalService.retrieve({
        queryText,
        topK: 3,
        vectorWeight: 0.6
      });
    } catch {
      return [];
    }
  }

  /**
   * Retrieve chess knowledge relevant to a hint request.
   */
  private async retrieveContextForHint(context: CoachHintContext): Promise<RetrievedChunk[]> {
    try {
      const queryText = [
        context.openingName,
        'chess tactics strategy',
        context.hintLevel === 1 ? 'strategic plan positional' : 'tactical motif candidate move',
        context.candidateMoves[0]?.san
      ]
        .filter(Boolean)
        .join(' ');

      return await ragRetrievalService.retrieve({
        queryText,
        topK: 2,
        vectorWeight: 0.5
      });
    } catch {
      return [];
    }
  }

  /**
   * Retrieve chess knowledge relevant to a chat question.
   * IMPORTANT: The user query is used for RAG retrieval only — it is NOT
   * passed raw to the LLM as trusted content. The LLM prompt marks user
   * input as untrusted and the retrieved chunks as data only.
   */
  private async retrieveContextForChat(context: CoachChatContext): Promise<RetrievedChunk[]> {
    try {
      // Build a safe search query from context (not raw user query)
      const queryText = [
        context.openingName,
        // Include sanitized keywords from user query (structural chess terms only)
        context.query
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .slice(0, 100),
        context.moveHistorySan.slice(-3).join(' ')
      ]
        .filter(Boolean)
        .join(' ');

      return await ragRetrievalService.retrieve({
        queryText,
        topK: 4,
        vectorWeight: 0.6
      });
    } catch {
      return [];
    }
  }

  /**
   * Retrieve chess knowledge for a post-game review.
   */
  private async retrieveContextForReview(
    context: PostGameReviewContext
  ): Promise<RetrievedChunk[]> {
    try {
      const blunders = context.moves
        .filter((m) => m.classification === 'BLUNDER' || m.classification === 'MISTAKE')
        .slice(0, 3)
        .map((m) => m.san)
        .join(' ');

      const queryText = [
        context.openingName,
        blunders,
        'game review accuracy improvement',
        context.result === 'WHITE_WINS' || context.result === 'BLACK_WINS'
          ? 'winning technique'
          : 'draw technique'
      ]
        .filter(Boolean)
        .join(' ');

      return await ragRetrievalService.retrieve({
        queryText,
        topK: 3,
        vectorWeight: 0.6
      });
    } catch {
      return [];
    }
  }

  private async getPlayerMemoryContext(userId: string): Promise<PlayerMemoryContext | undefined> {
    try {
      const memory = await playerMemoryRepository.getFullMemoryByUserId(userId);
      if (!memory) return undefined;
      const masteries = await practiceRepository.getAllThemeMasteries(memory.profile.id).catch(() => []);
      return {
        tacticsSkill: memory.profile.tacticsSkill,
        calculationSkill: memory.profile.calculationSkill,
        openingSkill: memory.profile.openingSkill,
        middlegameSkill: memory.profile.middlegameSkill,
        endgameSkill: memory.profile.endgameSkill,
        kingSafetySkill: memory.profile.kingSafetySkill,
        overallTrainingScore: memory.profile.overallTrainingScore,
        gamesAnalyzed: memory.profile.gamesAnalyzed,
        activeWeaknesses: memory.weaknesses.map((w) => ({
          theme: w.theme,
          category: w.category,
          count: w.occurrenceCount,
          confidence: w.confidence
        })),
        strengths: memory.strengths.map((s) => ({
          theme: s.theme,
          category: s.category,
          count: s.occurrenceCount
        })),
        themeMasteries: masteries.map((m) => ({
          theme: m.theme,
          masteryScore: m.masteryScore,
          accuracy: m.accuracy,
          streak: m.streak
        }))
      };
    } catch {
      return undefined;
    }
  }

  async explainMove(
    input: CoachExplanationContext & { gameId?: string },
    userId: string
  ): Promise<CoachStructuredOutput> {
    if (input.gameId) {
      await this.verifyGameOwnership(input.gameId, userId);
    }

    const [provider, ragChunks, playerMemory] = await Promise.all([
      Promise.resolve(createLLMProvider()),
      this.retrieveContextForMove(input),
      this.getPlayerMemoryContext(userId)
    ]);

    input.playerMemory = playerMemory;
    return provider.explainMove(input, ragChunks);
  }

  async getHint(
    input: CoachHintContext & { gameId?: string },
    userId: string
  ): Promise<CoachStructuredOutput> {
    if (input.gameId) {
      await this.verifyGameOwnership(input.gameId, userId);
    }

    const [provider, ragChunks, playerMemory] = await Promise.all([
      Promise.resolve(createLLMProvider()),
      this.retrieveContextForHint(input),
      this.getPlayerMemoryContext(userId)
    ]);

    input.playerMemory = playerMemory;
    return provider.generateHint(input, ragChunks);
  }

  async answerQuestion(
    input: CoachChatContext & { gameId?: string },
    userId: string
  ): Promise<CoachStructuredOutput> {
    if (input.gameId) {
      await this.verifyGameOwnership(input.gameId, userId);
    }

    const [provider, ragChunks, playerMemory] = await Promise.all([
      Promise.resolve(createLLMProvider()),
      this.retrieveContextForChat(input),
      this.getPlayerMemoryContext(userId)
    ]);

    input.playerMemory = playerMemory;
    return provider.answerQuestion(input, ragChunks);
  }

  async generatePostGameReview(
    input: PostGameReviewContext & { gameId?: string },
    userId: string
  ): Promise<PostGameStructuredOutput> {
    if (input.gameId) {
      await this.verifyGameOwnership(input.gameId, userId);
    }

    const [provider, ragChunks, playerMemory] = await Promise.all([
      Promise.resolve(createLLMProvider()),
      this.retrieveContextForReview(input),
      this.getPlayerMemoryContext(userId)
    ]);

    input.playerMemory = playerMemory;
    return provider.generatePostGameReview(input, ragChunks);
  }
}

export const coachService = new CoachService();
