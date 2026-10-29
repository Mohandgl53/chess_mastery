/**
 * Phase 6: Player Memory & Skill Profiling Service
 *
 * Responsibilities:
 * 1. Process completed game analysis into concrete LearningEvidence events
 * 2. Deterministically aggregate evidence into Weakness and Strength models
 * 3. Calculate normalized skill competencies (0-100 training scores)
 * 4. Generate SkillSnapshot time-series records for trend tracking
 * 5. Guarantee idempotent processing (never process the same game twice)
 *
 * ARCHITECTURAL BOUNDARY:
 * - Stockfish & chess.js remain the source of truth for moves, eval, and classifications.
 * - This service derives structured memory records from that trusted data.
 * - No LLM is used to fabricate or guess player scores.
 */

import { prisma } from '../config/database.js';
import { playerMemoryRepository, FullPlayerMemoryData } from '../repositories/player-memory.repository.js';
import { trainingRecommendationService } from './training-recommendation.service.js';
import {
  KnowledgeCategory,
  EvidenceType,
  EvidenceSeverity,
  MoveClassification,
  GameMove,
  GameAnalysis
} from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { chessThemeDetector } from '../utils/chess-theme-detector.js';
import { Chess } from 'chess.js';

export interface ExtractedEvidence {
  category: KnowledgeCategory;
  theme: string;
  evidenceType: EvidenceType;
  severity: EvidenceSeverity;
  engineEvaluationDelta?: number;
  classification?: MoveClassification;
  phase?: string;
  opening?: string;
  moveSan?: string;
  metadata?: Record<string, any>;
}

export interface SkillComputationResult {
  tacticsSkill: number;
  calculationSkill: number;
  openingSkill: number;
  middlegameSkill: number;
  endgameSkill: number;
  positionalSkill: number;
  kingSafetySkill: number;
  pieceCoordinationSkill: number;
  pawnStructureSkill: number;
  timeManagementSkill: number;
  blunderPreventionSkill: number;
  overallTrainingScore: number;
}

export class PlayerMemoryService {
  /**
   * Process a completed game into learning evidence, update player memory,
   * recompute skill scores, and generate training recommendations.
   * IDEMPOTENT: If the game has already been processed, it returns existing state.
   */
  async processCompletedGame(userId: string, gameId: string): Promise<{
    processed: boolean;
    evidenceCreated: number;
    profile: any;
  }> {
    const profile = await playerMemoryRepository.getOrCreateProfile(userId);

    // 1. Fetch game with moves and analysis
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        moves: { orderBy: { ply: 'asc' } },
        analysis: true
      }
    });

    if (!game) {
      throw new NotFoundError(`Game ${gameId} not found`);
    }

    if (game.userId !== userId) {
      throw new ForbiddenError(`You do not have permission to process learning for game ${gameId}`);
    }

    // 2. IDEMPOTENCY GUARD: Check if already processed
    if (game.learningProcessedAt) {
      return {
        processed: false,
        evidenceCreated: 0,
        profile
      };
    }

    // 3. Extract LearningEvidence items from game moves
    const playerColor = game.playerColor === 'WHITE' ? 'w' : 'b';
    const playerMoves = game.moves.filter((m) => m.color === playerColor);
    const extractedList = this.extractEvidenceFromGame(playerMoves, game.analysis, game.openingName, game.moves);

    // 4. Transactionally save evidence, aggregate weaknesses/strengths, and update skills
    const updatedProfile = await prisma.$transaction(async (tx) => {
      // A. Create LearningEvidence records
      if (extractedList.length > 0) {
        await tx.learningEvidence.createMany({
          data: extractedList.map((e) => ({
            playerId: profile.id,
            gameId: game.id,
            category: e.category,
            theme: e.theme,
            evidenceType: e.evidenceType,
            severity: e.severity,
            engineEvaluationDelta: e.engineEvaluationDelta,
            classification: e.classification,
            phase: e.phase,
            opening: e.opening,
            moveSan: e.moveSan,
            metadata: e.metadata ?? PrismaJsonNull()
          }))
        });
      }

      // B. Update blunders, mistakes, inaccuracies count
      const blunders = playerMoves.filter((m) => m.classification === 'BLUNDER').length;
      const mistakes = playerMoves.filter((m) => m.classification === 'MISTAKE').length;
      const inaccuracies = playerMoves.filter((m) => m.classification === 'INACCURACY').length;

      // C. Update aggregate Weaknesses and Strengths
      await this.aggregateWeaknessesInTx(tx, profile.id, extractedList);
      await this.aggregateStrengthsInTx(tx, profile.id, extractedList);

      // D. Recompute deterministic skill scores
      const allEvidence = await tx.learningEvidence.findMany({
        where: { playerId: profile.id }
      });
      const newGamesAnalyzed = profile.gamesAnalyzed + (game.analysis ? 1 : 0);
      const playerAccuracy =
        playerColor === 'w' ? game.analysis?.accuracyWhite : game.analysis?.accuracyBlack;

      const skills = this.calculateSkillScores(
        allEvidence,
        newGamesAnalyzed,
        profile.totalBlunders + blunders,
        profile.totalMistakes + mistakes,
        playerAccuracy ?? 75
      );

      // E. Update PlayerProfile
      const savedProfile = await tx.playerProfile.update({
        where: { id: profile.id },
        data: {
          ...skills,
          gamesAnalyzed: newGamesAnalyzed,
          totalBlunders: profile.totalBlunders + blunders,
          totalMistakes: profile.totalMistakes + mistakes,
          totalInaccuracies: profile.totalInaccuracies + inaccuracies,
          lastAnalyzedAt: new Date()
        }
      });

      // F. Create historical SkillSnapshot
      await tx.skillSnapshot.create({
        data: {
          playerId: profile.id,
          overall: skills.overallTrainingScore,
          tactics: skills.tacticsSkill,
          calculation: skills.calculationSkill,
          opening: skills.openingSkill,
          middlegame: skills.middlegameSkill,
          endgame: skills.endgameSkill,
          positional: skills.positionalSkill,
          kingSafety: skills.kingSafetySkill,
          pieceCoordination: skills.pieceCoordinationSkill,
          pawnStructure: skills.pawnStructureSkill,
          timeManagement: skills.timeManagementSkill,
          blunderPrevention: skills.blunderPreventionSkill,
          gamesAnalyzed: newGamesAnalyzed
        }
      });

      // G. Mark game as processed (idempotency token)
      await tx.game.update({
        where: { id: game.id },
        data: { learningProcessedAt: new Date() }
      });

      return savedProfile;
    });

    // 5. Generate fresh training recommendations
    await trainingRecommendationService.generateRecommendationsForPlayer(profile.id);

    return {
      processed: true,
      evidenceCreated: extractedList.length,
      profile: updatedProfile
    };
  }

  /**
   * Deterministically extract chess learning evidence from a list of player moves.
   */
  extractEvidenceFromGame(
    playerMoves: GameMove[],
    analysis: GameAnalysis | null,
    openingName: string | null,
    allGameMoves?: GameMove[]
  ): ExtractedEvidence[] {
    const evidence: ExtractedEvidence[] = [];
    let hasCastled = false;

    // Build fen map by replaying moves from game start
    const movesToReplay = allGameMoves && allGameMoves.length > 0 ? allGameMoves : playerMoves;
    const sortedMoves = [...movesToReplay].sort((a, b) => a.ply - b.ply);
    const fenBeforeMap = new Map<number, string>();
    const fenAfterMap = new Map<number, string>();

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const replayChess = new Chess();
    for (let i = 0; i < sortedMoves.length; i++) {
      const m = sortedMoves[i];
      const prevFen = i === 0 ? startFen : (sortedMoves[i - 1].fen || replayChess.fen());
      fenBeforeMap.set(m.ply, prevFen);

      try {
        if (m.fen) {
          replayChess.load(m.fen);
        } else {
          replayChess.move(m.san);
        }
      } catch {
        // fallback
      }
      fenAfterMap.set(m.ply, m.fen || replayChess.fen());
    }

    for (const move of playerMoves) {
      const isBlunder = move.classification === 'BLUNDER';
      const isMistake = move.classification === 'MISTAKE';
      const evalDelta = move.evaluation ? Math.abs(move.evaluation) : 0;
      const phase = move.moveNumber <= 10 ? 'OPENING' : move.moveNumber <= 30 ? 'MIDDLEGAME' : 'ENDGAME';

      if (move.san === 'O-O' || move.san === 'O-O-O') {
        hasCastled = true;
      }

      const fenBefore =
        fenBeforeMap.get(move.ply) ||
        (move.ply === 1 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : '');
      const fenAfter = fenAfterMap.get(move.ply) || move.fen;

      let bestMoveSan: string | undefined = undefined;
      if (move.explanation) {
        const match =
          move.explanation.match(/(?:best(?: move)?(?:\s+was)?:\s*|instead of\s+)([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[\+#]?)/i) ||
          move.explanation.match(/([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[\+#]?)\s+(?:was|is)\s+best/i);
        if (match) {
          bestMoveSan = match[1];
        }
      }

      // 1. Authoritative Chess-Aware Geometry Theme Detection (chess.js)
      const detectedGeometryThemes = chessThemeDetector.detectThemes({
        fenBefore,
        fenAfter,
        moveSan: move.san,
        moveUci: move.uci ?? undefined,
        moveNumber: move.moveNumber,
        playerColor: move.color as 'w' | 'b',
        classification: move.classification ?? undefined,
        bestMoveSan,
        evalDelta,
        hasCastled
      });

      const addedThemesForMove = new Set<string>();

      for (const dt of detectedGeometryThemes) {
        evidence.push({
          category: dt.category,
          theme: dt.theme,
          evidenceType: dt.evidenceType,
          severity: dt.severity,
          engineEvaluationDelta: evalDelta,
          classification: move.classification ?? undefined,
          phase,
          opening: openingName ?? undefined,
          moveSan: move.san,
          metadata: dt.metadata
        });
        addedThemesForMove.add(dt.theme);
      }

      // 2. Castling & King Safety (Positive)
      if (
        (move.san === 'O-O' || move.san === 'O-O-O') &&
        move.moveNumber <= 10 &&
        !addedThemesForMove.has('CASTLING')
      ) {
        evidence.push({
          category: 'KING_SAFETY',
          theme: 'CASTLING',
          evidenceType: 'POSITIVE',
          severity: 'LOW',
          phase: 'OPENING',
          opening: openingName ?? undefined,
          moveSan: move.san,
          metadata: { moveNumber: move.moveNumber }
        });
        addedThemesForMove.add('CASTLING');
      }

      // 3. Fallback text explanation matching (for engine explanations or test fixtures)
      if (isBlunder || isMistake) {
        const expLower = (move.explanation || '').toLowerCase();
        let fallbackTheme: string | null = null;
        let fallbackCategory: KnowledgeCategory = 'TACTICS';

        if (
          (expLower.includes('fork') || expLower.includes('knight')) &&
          !addedThemesForMove.has('FORK')
        ) {
          fallbackTheme = 'FORK';
          fallbackCategory = 'TACTICS';
        } else if (expLower.includes('pin') && !addedThemesForMove.has('PIN')) {
          fallbackTheme = 'PIN';
          fallbackCategory = 'TACTICS';
        } else if (expLower.includes('skewer') && !addedThemesForMove.has('SKEWER')) {
          fallbackTheme = 'SKEWER';
          fallbackCategory = 'TACTICS';
        } else if (
          (expLower.includes('back-rank') || expLower.includes('back rank')) &&
          !addedThemesForMove.has('BACK_RANK')
        ) {
          fallbackTheme = 'BACK_RANK';
          fallbackCategory = 'TACTICS';
        } else if (
          (expLower.includes('hanging') ||
            expLower.includes('undefended') ||
            expLower.includes('loose piece')) &&
          !addedThemesForMove.has('HANGING_PIECE')
        ) {
          fallbackTheme = 'HANGING_PIECE';
          fallbackCategory = 'BLUNDER_PREVENTION';
        }

        if (fallbackTheme) {
          evidence.push({
            category: fallbackCategory,
            theme: fallbackTheme,
            evidenceType: 'NEGATIVE',
            severity: isBlunder ? 'HIGH' : 'MEDIUM',
            engineEvaluationDelta: evalDelta,
            classification: move.classification ?? undefined,
            phase,
            opening: openingName ?? undefined,
            moveSan: move.san,
            metadata: { explanation: move.explanation }
          });
          addedThemesForMove.add(fallbackTheme);
        }

        // Time pressure indicator
        if (
          move.timeSpentSeconds !== null &&
          move.timeSpentSeconds !== undefined &&
          move.timeSpentSeconds < 2
        ) {
          evidence.push({
            category: 'TIME_MANAGEMENT',
            theme: 'HASTY_MOVE',
            evidenceType: 'NEGATIVE',
            severity: 'MEDIUM',
            engineEvaluationDelta: evalDelta,
            classification: move.classification ?? undefined,
            moveSan: move.san,
            phase
          });
        }
      }
    }

    // 4. Check for Late Castling (delayed king safety)
    const lastMoveNum = playerMoves[playerMoves.length - 1]?.moveNumber || 0;
    if (!hasCastled && lastMoveNum > 10) {
      const lastFen = movesToReplay[movesToReplay.length - 1]?.fen || replayChess.fen();
      try {
        const endChess = new Chess(lastFen);
        const lateCastlingTheme = chessThemeDetector.detectLateCastling(endChess, {
          fenBefore: lastFen,
          fenAfter: lastFen,
          moveSan: '',
          moveNumber: lastMoveNum,
          playerColor: (playerMoves[0]?.color as 'w' | 'b') || 'w',
          hasCastled
        });
        if (lateCastlingTheme) {
          evidence.push({
            category: lateCastlingTheme.category,
            theme: lateCastlingTheme.theme,
            evidenceType: lateCastlingTheme.evidenceType,
            severity: lateCastlingTheme.severity,
            engineEvaluationDelta: 0,
            phase: 'OPENING',
            opening: openingName ?? undefined,
            metadata: lateCastlingTheme.metadata
          });
        }
      } catch {}
    }

    return evidence;
  }

  /**
   * Deterministically aggregate negative evidence into active Weakness records.
   */
  private async aggregateWeaknessesInTx(
    tx: any,
    playerId: string,
    extracted: ExtractedEvidence[]
  ): Promise<void> {
    const negativeItems = extracted.filter((e) => e.evidenceType === 'NEGATIVE');
    const themeGroups = new Map<string, ExtractedEvidence[]>();

    for (const item of negativeItems) {
      const list = themeGroups.get(item.theme) || [];
      list.push(item);
      themeGroups.set(item.theme, list);
    }

    for (const [theme, items] of themeGroups.entries()) {
      const existing = await tx.weakness.findUnique({
        where: { playerId_theme: { playerId, theme } }
      });

      const newOccurrences = (existing?.occurrenceCount ?? 0) + items.length;
      const newEvidenceCount = (existing?.evidenceCount ?? 0) + items.length;

      // Recency & Confidence calculation:
      // confidence increases with repeated occurrences: 1x = 0.35, 2x = 0.50, 3x = 0.65, 4x = 0.80, max 0.95
      const confidence = Math.min(0.95, 0.2 + newOccurrences * 0.15);

      const severity: EvidenceSeverity = items.some((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
        ? 'HIGH'
        : 'MEDIUM';

      const title = this.formatWeaknessTitle(theme);
      const description = this.formatWeaknessDescription(theme, newOccurrences);

      await tx.weakness.upsert({
        where: { playerId_theme: { playerId, theme } },
        create: {
          playerId,
          category: items[0].category,
          theme,
          title,
          description,
          severity,
          confidence,
          evidenceCount: newEvidenceCount,
          occurrenceCount: newOccurrences,
          status: 'ACTIVE',
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date()
        },
        update: {
          confidence,
          occurrenceCount: newOccurrences,
          evidenceCount: newEvidenceCount,
          severity,
          lastDetectedAt: new Date(),
          status: 'ACTIVE'
        }
      });
    }

    // Handle positive reinforcement on existing active weaknesses (decay / improvement)
    const positiveItems = extracted.filter((e) => e.evidenceType === 'POSITIVE');
    for (const item of positiveItems) {
      const existing = await tx.weakness.findUnique({
        where: { playerId_theme: { playerId, theme: item.theme } }
      });
      if (existing) {
        const newConf = Math.max(0.15, Math.round((existing.confidence - 0.1) * 100) / 100);
        const newStatus = newConf <= 0.25 ? 'RESOLVED' : 'IMPROVING';
        await tx.weakness.update({
          where: { id: existing.id },
          data: {
            confidence: newConf,
            status: newStatus,
            resolvedAt: newStatus === 'RESOLVED' ? new Date() : existing.resolvedAt
          }
        });
      }
    }
  }

  /**
   * Deterministically aggregate positive evidence into Strength records.
   */
  private async aggregateStrengthsInTx(
    tx: any,
    playerId: string,
    extracted: ExtractedEvidence[]
  ): Promise<void> {
    const positiveItems = extracted.filter((e) => e.evidenceType === 'POSITIVE');
    const themeGroups = new Map<string, ExtractedEvidence[]>();

    for (const item of positiveItems) {
      const list = themeGroups.get(item.theme) || [];
      list.push(item);
      themeGroups.set(item.theme, list);
    }

    for (const [theme, items] of themeGroups.entries()) {
      const existing = await tx.strength.findUnique({
        where: { playerId_theme: { playerId, theme } }
      });

      const newOccurrences = (existing?.occurrenceCount ?? 0) + items.length;
      const newEvidenceCount = (existing?.evidenceCount ?? 0) + items.length;

      // Strengths require repeated evidence (confidence builds gradually)
      const confidence = Math.min(0.95, 0.3 + newOccurrences * 0.1);
      const title = this.formatStrengthTitle(theme);
      const description = `Consistently demonstrated ${title.toLowerCase()} across ${newOccurrences} analyzed positions.`;

      await tx.strength.upsert({
        where: { playerId_theme: { playerId, theme } },
        create: {
          playerId,
          category: items[0].category,
          theme,
          title,
          description,
          confidence,
          evidenceCount: newEvidenceCount,
          occurrenceCount: newOccurrences,
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date()
        },
        update: {
          confidence,
          occurrenceCount: newOccurrences,
          evidenceCount: newEvidenceCount,
          lastDetectedAt: new Date()
        }
      });
    }
  }

  /**
   * Pure, deterministic skill calculation function.
   * Input state always produces the exact same output.
   */
  calculateSkillScores(
    evidence: { category: KnowledgeCategory; evidenceType: EvidenceType; theme?: string }[],
    gamesAnalyzed: number,
    totalBlunders: number,
    totalMistakes: number,
    recentAccuracy: number
  ): SkillComputationResult {
    // If no games analyzed, return baseline 50.0 neutral scores
    if (gamesAnalyzed === 0) {
      return {
        tacticsSkill: 50.0,
        calculationSkill: 50.0,
        openingSkill: 50.0,
        middlegameSkill: 50.0,
        endgameSkill: 50.0,
        positionalSkill: 50.0,
        kingSafetySkill: 50.0,
        pieceCoordinationSkill: 50.0,
        pawnStructureSkill: 50.0,
        timeManagementSkill: 50.0,
        blunderPreventionSkill: 50.0,
        overallTrainingScore: 50.0
      };
    }

    // Helper to score a specific category
    const scoreCategory = (cat: KnowledgeCategory, base = 50.0): number => {
      const pos = evidence.filter((e) => e.category === cat && e.evidenceType === 'POSITIVE').length;
      const neg = evidence.filter((e) => e.category === cat && e.evidenceType === 'NEGATIVE').length;
      // Formula: base + (pos * 3) - (neg * 4) + accuracyAdjustment
      const accAdj = (recentAccuracy - 70) * 0.2;
      const raw = base + pos * 3 - neg * 4 + accAdj;
      return Math.round(Math.min(99, Math.max(15, raw)) * 10) / 10;
    };

    const tacticsSkill = scoreCategory('TACTICS');
    const calculationSkill = scoreCategory('CALCULATION');
    const openingSkill = scoreCategory('OPENING');
    const middlegameSkill = scoreCategory('MIDDLEGAME');
    const endgameSkill = scoreCategory('ENDGAME');
    const positionalSkill = scoreCategory('STRATEGY');
    const kingSafetySkill = scoreCategory('KING_SAFETY');
    const pieceCoordinationSkill = scoreCategory('PIECE_COORDINATION');
    const pawnStructureSkill = scoreCategory('PAWN_STRUCTURE');

    // Time Management & Blunder Prevention
    const blundersPerGame = totalBlunders / Math.max(1, gamesAnalyzed);
    const blunderPreventionSkill = Math.round(
      Math.min(99, Math.max(15, 80 - blundersPerGame * 15)) * 10
    ) / 10;

    const timeNeg = evidence.filter((e) => e.category === 'PSYCHOLOGY' || e.theme?.includes('TIME') || e.theme?.includes('HASTY')).length;
    const timeManagementSkill = Math.round(
      Math.min(99, Math.max(20, 70 - timeNeg * 6)) * 10
    ) / 10;

    // Overall weighted composite
    const overall = Math.round(
      (tacticsSkill * 0.2 +
        calculationSkill * 0.1 +
        openingSkill * 0.15 +
        middlegameSkill * 0.15 +
        endgameSkill * 0.1 +
        kingSafetySkill * 0.1 +
        blunderPreventionSkill * 0.2) * 10
    ) / 10;

    return {
      tacticsSkill,
      calculationSkill,
      openingSkill,
      middlegameSkill,
      endgameSkill,
      positionalSkill,
      kingSafetySkill,
      pieceCoordinationSkill,
      pawnStructureSkill,
      timeManagementSkill,
      blunderPreventionSkill,
      overallTrainingScore: overall
    };
  }

  private formatWeaknessTitle(theme: string): string {
    const map: Record<string, string> = {
      FORK: 'Knight Fork Vulnerability',
      PIN: 'Pin Exploitation Defense',
      SKEWER: 'Skewer Vulnerability',
      BACK_RANK: 'Back-Rank Weakness',
      HANGING_PIECE: 'Unprotected Pieces Left Hanging',
      MISSED_TACTIC: 'Overlooked Tactical Opportunities',
      LATE_CASTLING: 'Delayed King Safety & Castling',
      CASTLING: 'King Safety Inconsistencies',
      OPENING_DEVELOPMENT: 'Opening Piece Development',
      ENDGAME_TECHNIQUE: 'Endgame Conversion Weakness',
      HASTY_MOVE: 'Rushing Moves Under Pressure'
    };
    return map[theme] || `${theme.replace(/_/g, ' ')} Weakness`;
  }

  private formatWeaknessDescription(theme: string, count: number): string {
    return `Detected ${count} instance${count > 1 ? 's' : ''} in recent games. Working on this area will directly improve overall tactical resilience.`;
  }

  private formatStrengthTitle(theme: string): string {
    const map: Record<string, string> = {
      CENTER_CONTROL: 'Opening Center Control',
      CASTLING: 'Proactive King Safety',
      OPEN_FILE: 'Rook Open File Utilization',
      PASSED_PAWN: 'Passed Pawn Execution'
    };
    return map[theme] || `${theme.replace(/_/g, ' ')} Mastery`;
  }
}

function PrismaJsonNull() {
  return undefined;
}

export const playerMemoryService = new PlayerMemoryService();
