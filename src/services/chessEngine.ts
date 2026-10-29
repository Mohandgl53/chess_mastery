import { Chess, Move } from 'chess.js';
import { EvaluationData, MoveClassification } from '../types/chess';
import { GameDifficulty } from '../types/game';

export interface CandidateMove {
  san: string;
  from: string;
  to: string;
  score: number;
  explanation: string;
}

export interface IChessEngineService {
  getBestMove(fen: string, difficulty?: GameDifficulty, playerRating?: number): Promise<{ san: string; from: string; to: string; promotion?: string }>;
  evaluatePosition(fen: string): Promise<EvaluationData>;
  getCandidateMoves(fen: string, maxMoves?: number): Promise<CandidateMove[]>;
  classifyMove(
    fenBefore: string,
    fenAfter: string,
    moveSan: string
  ): Promise<{
    classification: MoveClassification;
    bestMove: string;
    evalDelta: number;
    explanation: string;
    /** Centipawn evaluation of position BEFORE the move (White-relative, 100cp = 1 pawn) */
    evalBefore: number;
    /** Centipawn evaluation of position AFTER the move (White-relative) */
    evalAfter: number;
    /** Principal variation from position BEFORE the move (engine's best line as SAN strings) */
    principalVariation: string[];
  }>;
  getStatus?(): { isStockfish: boolean; isFallback: boolean; ready: boolean };
}

export class MockChessEngine implements IChessEngineService {
  private pieceValues: Record<string, number> = {
    p: 1.0,
    n: 3.1,
    b: 3.3,
    r: 5.0,
    q: 9.2,
    k: 0.0
  };

  /**
   * Calculates a heuristic position evaluation
   */
  async evaluatePosition(fen: string): Promise<EvaluationData> {
    const chess = new Chess(fen);
    
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'b' : 'w';
      return {
        score: winner === 'w' ? 100 : -100,
        isMate: true,
        mateIn: 1,
        label: winner === 'w' ? 'Winning' : 'Losing'
      };
    }

    if (chess.isDraw() || chess.isStalemate()) {
      return {
        score: 0,
        isMate: false,
        label: 'Equal'
      };
    }

    let materialWhite = 0;
    let materialBlack = 0;
    let positionalWhite = 0;
    let positionalBlack = 0;

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = this.pieceValues[piece.type] || 0;
        let posBonus = 0;

        // Center control bonuses
        if ((r === 3 || r === 4) && (c === 3 || c === 4)) {
          posBonus += 0.25;
        } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
          posBonus += 0.1;
        }

        // Development bonus for minor pieces off the back rank
        if ((piece.type === 'n' || piece.type === 'b')) {
          if (piece.color === 'w' && r < 7) posBonus += 0.15;
          if (piece.color === 'b' && r > 0) posBonus += 0.15;
        }

        if (piece.color === 'w') {
          materialWhite += val;
          positionalWhite += posBonus;
        } else {
          materialBlack += val;
          positionalBlack += posBonus;
        }
      }
    }

    const rawScore = (materialWhite + positionalWhite) - (materialBlack + positionalBlack);
    const score = Math.round(rawScore * 10) / 10;

    let label: EvaluationData['label'] = 'Equal';
    if (score >= 3.0) label = 'Winning';
    else if (score >= 1.5) label = 'Better';
    else if (score >= 0.5) label = 'Slightly Better';
    else if (score <= -3.0) label = 'Losing';
    else if (score <= -1.5) label = 'Worse';
    else if (score <= -0.5) label = 'Slightly Worse';

    return {
      score,
      isMate: false,
      label,
      source: 'heuristic',
      depth: 1
    };
  }

  /**
   * Generates a responsive, legal engine move adjusted by difficulty
   */
  async getBestMove(
    fen: string,
    difficulty: GameDifficulty = 'Intermediate',
    playerRating = 1200
  ): Promise<{ san: string; from: string; to: string; promotion?: string }> {
    const effectiveDifficulty: Exclude<GameDifficulty, 'Equal'> = difficulty === 'Equal'
      ? (playerRating < 1000 ? 'Easy' : playerRating < 1600 ? 'Intermediate' : 'Advanced')
      : difficulty;

    // Simulate thinking latency based on difficulty
    const delayMap: Record<Exclude<GameDifficulty, 'Equal'>, number> = {
      Beginner: 400,
      Easy: 600,
      Intermediate: 800,
      Advanced: 1100,
      Expert: 1400
    };

    await new Promise(resolve => setTimeout(resolve, delayMap[effectiveDifficulty] || 700));

    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true }) as Move[];

    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    // Score all candidate moves
    const scoredMoves = legalMoves.map(move => {
      let moveScore = 0;

      // 1. Captures
      if (move.captured) {
        const victimVal = this.pieceValues[move.captured] || 1;
        const attackerVal = this.pieceValues[move.piece] || 1;
        moveScore += (victimVal * 10) - attackerVal;
      }

      // 2. Checks and promotions
      if (move.san.includes('+')) moveScore += 3;
      if (move.san.includes('#')) moveScore += 500;
      if (move.promotion) moveScore += 15;

      // 3. Center square occupation (d4, e4, d5, e5)
      if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) {
        moveScore += 2.0;
      }

      // 4. Castling bonus
      if (move.san === 'O-O' || move.san === 'O-O-O') {
        moveScore += 3.5;
      }

      // 5. Minor piece development in opening
      if ((move.piece === 'n' || move.piece === 'b') && (move.from.endsWith('1') || move.from.endsWith('8'))) {
        moveScore += 1.8;
      }

      return { move, moveScore };
    });

    scoredMoves.sort((a, b) => b.moveScore - a.moveScore);

    let chosenMove: Move;

    if (effectiveDifficulty === 'Beginner') {
      // 50% random, 50% top 3
      if (Math.random() < 0.5) {
        chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      } else {
        const topSlice = scoredMoves.slice(0, Math.min(4, scoredMoves.length));
        chosenMove = topSlice[Math.floor(Math.random() * topSlice.length)].move;
      }
    } else if (effectiveDifficulty === 'Easy') {
      const topSlice = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
      chosenMove = topSlice[Math.floor(Math.random() * topSlice.length)].move;
    } else if (effectiveDifficulty === 'Intermediate') {
      // 85% pick top move, 15% pick 2nd
      if (Math.random() < 0.85 || scoredMoves.length === 1) {
        chosenMove = scoredMoves[0].move;
      } else {
        chosenMove = scoredMoves[1].move;
      }
    } else {
      // Advanced / Expert pick best heuristic move
      chosenMove = scoredMoves[0].move;
    }

    return {
      san: chosenMove.san,
      from: chosenMove.from,
      to: chosenMove.to,
      promotion: chosenMove.promotion
    };
  }

  /**
   * Returns top candidate moves with human explanation
   */
  async getCandidateMoves(fen: string, maxMoves: number = 3): Promise<CandidateMove[]> {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true }) as Move[];

    const scored = moves.map(m => {
      let score = 0;
      let explanation = `Develops ${m.piece.toUpperCase()} to ${m.to}`;

      if (m.captured) {
        score += 5;
        explanation = `Wins material by capturing ${m.captured.toUpperCase()} on ${m.to}`;
      } else if (m.san.includes('+')) {
        score += 4;
        explanation = `Delivers a direct check to the king`;
      } else if (['d4', 'e4', 'd5', 'e5'].includes(m.to)) {
        score += 3;
        explanation = `Claims key central space on ${m.to}`;
      } else if (m.san === 'O-O' || m.san === 'O-O-O') {
        score += 4;
        explanation = `Tucks king safely into the corner and activates rook`;
      }

      return {
        san: m.san,
        from: m.from,
        to: m.to,
        score,
        explanation
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxMoves);
  }

  /**
   * Classifies move quality against engine standard.
   * Returns enriched context including evalBefore, evalAfter, and principalVariation
   * for Phase 8 personalized coaching.
   */
  async classifyMove(
    fenBefore: string,
    fenAfter: string,
    moveSan: string
  ): Promise<{
    classification: MoveClassification;
    bestMove: string;
    evalDelta: number;
    explanation: string;
    evalBefore: number;
    evalAfter: number;
    principalVariation: string[];
  }> {
    const chessBefore = new Chess(fenBefore);
    const movingSide = chessBefore.turn(); // 'w' | 'b'
    const evalBeforeData = await this.evaluatePosition(fenBefore);
    const evalAfterData = await this.evaluatePosition(fenAfter);
    const candidates = await this.getCandidateMoves(fenBefore, 1);
    const bestMove = candidates[0]?.san || moveSan;

    // Convert pawn scores to centipawns for the backend
    const evalBeforeCp = Math.round(evalBeforeData.score * 100);
    const evalAfterCp = Math.round(evalAfterData.score * 100);

    const sideSign = movingSide === 'w' ? 1 : -1;
    // positive evalDelta = moved side lost advantage (bad move)
    const evalDelta = Math.max(0, Math.round(((evalBeforeData.score - evalAfterData.score) * sideSign) * 10) / 10);

    // Principal variation: best move from before position
    const principalVariation = bestMove ? [bestMove] : [];

    if (moveSan === bestMove) {
      return {
        classification: 'BEST',
        bestMove,
        evalDelta: 0,
        explanation: 'Top engine recommendation. Optimal tactical and positional move.',
        evalBefore: evalBeforeCp,
        evalAfter: evalAfterCp,
        principalVariation
      };
    }

    if (evalDelta < 0.3) {
      return { classification: 'EXCELLENT', bestMove, evalDelta, explanation: 'Strong move maintaining full positional control.', evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 0.8) {
      return { classification: 'GOOD', bestMove, evalDelta, explanation: 'Solid practical choice that keeps the position balanced.', evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 1.8) {
      return { classification: 'INACCURACY', bestMove, evalDelta, explanation: `Slight inaccuracy. ${bestMove} was more active and purposeful.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 3.2) {
      return { classification: 'MISTAKE', bestMove, evalDelta, explanation: `Positional mistake allowing opponent easy counterplay. Best was ${bestMove}.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else {
      return { classification: 'BLUNDER', bestMove, evalDelta, explanation: `Critical blunder that drops material or severely damages your position. Better was ${bestMove}.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    }
  }

  getStatus() {
    return { isStockfish: false, isFallback: true, ready: true };
  }
}


export const mockChessEngine = new MockChessEngine();

/**
 * Default chess engine singleton.
 *
 * Uses StockfishEngineService (Stockfish 19 lite-single WASM, no COOP/COEP required).
 * If the Stockfish worker fails to initialize within 8 seconds, operations fall through
 * to MockChessEngine automatically so the app never breaks.
 *
 * Import path stays the same for all consumers — no PlayPage changes needed.
 */
class FallbackChessEngine implements IChessEngineService {
  private stockfish: import('./StockfishEngineService').StockfishEngineService | null = null;
  private stockfishFailed = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.tryInitStockfish();
  }

  private async tryInitStockfish() {
    try {
      const { StockfishEngineService } = await import('./StockfishEngineService');
      const engine = new StockfishEngineService();
      await engine.waitForReady();
      this.stockfish = engine;
      console.info('[ChessEngine] Stockfish 19 (lite-single) ready ✓');
    } catch (err) {
      this.stockfishFailed = true;
      console.warn('[ChessEngine] Stockfish failed to initialize, falling back to MockChessEngine:', err);
    }
  }

  private async getEngine(): Promise<IChessEngineService> {
    if (this.stockfish) return this.stockfish;
    if (!this.stockfishFailed && this.initPromise) {
      await this.initPromise;
    }
    return this.stockfish ?? mockChessEngine;
  }

  async getBestMove(fen: string, difficulty?: GameDifficulty, playerRating?: number) {
    return (await this.getEngine()).getBestMove(fen, difficulty, playerRating);
  }

  async evaluatePosition(fen: string) {
    return (await this.getEngine()).evaluatePosition(fen);
  }

  async getCandidateMoves(fen: string, maxMoves?: number) {
    return (await this.getEngine()).getCandidateMoves(fen, maxMoves);
  }

  async classifyMove(fenBefore: string, fenAfter: string, moveSan: string) {
    return (await this.getEngine()).classifyMove(fenBefore, fenAfter, moveSan);
  }

  getStatus() {
    return {
      isStockfish: !!this.stockfish,
      isFallback: this.stockfishFailed,
      ready: !!this.stockfish || this.stockfishFailed
    };
  }
}

export const chessEngine: IChessEngineService = new FallbackChessEngine();
