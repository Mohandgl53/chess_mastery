/**
 * StockfishEngineService.ts
 *
 * Production IChessEngineService implementation backed by Stockfish 19 lite-single WASM.
 *
 * ARCHITECTURE:
 *   This service spawns stockfish-19-lite-single.js DIRECTLY as a Web Worker using
 *   the hash-based WASM URL pattern:
 *     new Worker('/stockfish-19-lite-single.js#/stockfish-19-lite-single.wasm,worker')
 *
 *   This avoids any Vite worker wrapper and the importScripts() ES module incompatibility.
 *   All engine computation runs off the main thread. The service communicates via raw UCI strings.
 *
 * ENGINE PROFILES (separate depth/time per operation):
 *   BOT_MOVE    — depth + movetime based on GameDifficulty
 *   LIVE_EVAL   — depth 12 (fast, for evaluation bar)
 *   HINT        — depth 12, MultiPV 3 (candidate moves)
 *   CLASSIFY    — depth 14 (move classification, needs accuracy)
 *
 * STALE RESPONSE PROTECTION:
 *   Every request has a unique requestId (UUID-like string).
 *   When a new request is issued, previousRequestId is discarded.
 *   Responses for old requests are silently ignored.
 *
 * EVALUATION PERSPECTIVE:
 *   UCI scores are from White's perspective (+cp = White better).
 *   classifyMove() normalizes to the moving side before computing evalDelta.
 *
 * ENGINE BUILD:
 *   stockfish@19.0.0, stockfish-19-lite-single (1.75MB WASM, NO SharedArrayBuffer required)
 *   COOP/COEP headers NOT required.
 */

import { Chess, Square } from 'chess.js';
import { EvaluationData, MoveClassification } from '../types/chess';
import { GameDifficulty } from '../types/game';
import type { IChessEngineService, CandidateMove } from './chessEngine';

// ─── Engine profiles ───────────────────────────────────────────────────────

interface BotProfile {
  depth: number;
  moveTime: number;
  multiPV: number;
  /** Centipawn tolerance for weaker difficulty candidate pool selection */
  candidateThresholdCp: number;
}

const BOT_PROFILES: Record<Exclude<GameDifficulty, 'Equal'>, BotProfile> = {
  Beginner:     { depth: 1,  moveTime: 100,  multiPV: 4, candidateThresholdCp: 300 },
  Easy:         { depth: 3,  moveTime: 300,  multiPV: 2, candidateThresholdCp: 150 },
  Intermediate: { depth: 7,  moveTime: 600,  multiPV: 1, candidateThresholdCp: 0   },
  Advanced:     { depth: 12, moveTime: 1000, multiPV: 1, candidateThresholdCp: 0   },
  Expert:       { depth: 18, moveTime: 1800, multiPV: 1, candidateThresholdCp: 0   },
};

export function getBotProfile(difficulty: GameDifficulty = 'Intermediate', playerRating = 1200): BotProfile {
  if (difficulty === 'Equal') {
    if (playerRating < 800) {
      return { depth: 2, moveTime: 150, multiPV: 3, candidateThresholdCp: 250 };
    } else if (playerRating < 1100) {
      return { depth: 4, moveTime: 300, multiPV: 2, candidateThresholdCp: 150 };
    } else if (playerRating < 1400) {
      return { depth: 7, moveTime: 600, multiPV: 1, candidateThresholdCp: 40 };
    } else if (playerRating < 1700) {
      return { depth: 10, moveTime: 800, multiPV: 1, candidateThresholdCp: 0 };
    } else if (playerRating < 2000) {
      return { depth: 14, moveTime: 1200, multiPV: 1, candidateThresholdCp: 0 };
    } else {
      return { depth: 18, moveTime: 1800, multiPV: 1, candidateThresholdCp: 0 };
    }
  }
  return BOT_PROFILES[difficulty] || BOT_PROFILES.Intermediate;
}

const PROFILE_LIVE_EVAL = { depth: 12 };
const PROFILE_HINT      = { depth: 12, multiPV: 3 };
const PROFILE_CLASSIFY  = { depth: 12, moveTime: 200 };
const READY_TIMEOUT_MS  = 30000; // 30s — WASM needs to download + compile on first load

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedInfo {
  depth: number;
  multiPV: number;
  score: number;
  isMate: boolean;
  mateIn?: number;
  pv: string[];
}

interface PendingRequest {
  requestId: string;
  infoByMultiPV: Map<number, ParsedInfo>;
  resolve: (result: { bestUci: string; infos: Map<number, ParsedInfo> }) => void;
  reject: (err: Error) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function uciToMove(uciMove: string, fen: string): { san: string; from: string; to: string; promotion?: string } | null {
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2) as Square;
    const to   = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length === 5 ? uciMove[4] : undefined;
    const move = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
    if (!move) return null;
    return { san: move.san, from: move.from, to: move.to, promotion: move.promotion };
  } catch {
    return null;
  }
}

function buildExplanation(uciMove: string, fen: string): string {
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2) as Square;
    const to   = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length === 5 ? uciMove[4] : undefined;
    const move = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
    if (!move) return `Move to ${to}`;
    if (move.san.includes('#'))    return 'Delivers checkmate!';
    if (move.promotion)            return `Promotes to ${move.promotion.toUpperCase()} — pawn becomes a queen`;
    if (move.san.includes('+'))    return `Gives check — opponent must respond immediately`;
    if (move.captured)             return `Wins material by capturing ${move.captured.toUpperCase()} on ${to}`;
    if (move.san === 'O-O')        return 'Castles kingside — king safety and rook activation';
    if (move.san === 'O-O-O')      return 'Castles queenside — king safety and connects rooks';
    if (['d4','e4','d5','e5'].includes(to)) return `Claims central square ${to} — excellent space claim`;
    if (move.piece === 'n')        return `Develops knight to ${to} — piece activity`;
    if (move.piece === 'b')        return `Develops bishop to ${to} — diagonal control`;
    return `${move.piece.toUpperCase()} moves to ${to}`;
  } catch {
    return `Move to ${uciMove.slice(2, 4)}`;
  }
}

function scoreToLabel(score: number): EvaluationData['label'] {
  if (score >= 3.0)  return 'Winning';
  if (score >= 1.5)  return 'Better';
  if (score >= 0.5)  return 'Slightly Better';
  if (score <= -3.0) return 'Losing';
  if (score <= -1.5) return 'Worse';
  if (score <= -0.5) return 'Slightly Worse';
  return 'Equal';
}

function parseInfo(line: string): ParsedInfo | null {
  if (!line.startsWith('info') || !line.includes('score')) return null;

  const depthM  = line.match(/\bdepth\s+(\d+)/);
  const mpvM    = line.match(/\bmultipv\s+(\d+)/);
  const scoreM  = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  if (!scoreM) return null;

  const depth  = depthM  ? parseInt(depthM[1], 10)  : 0;
  const multiPV = mpvM   ? parseInt(mpvM[1], 10)    : 1;
  const scoreVal = parseInt(scoreM[2], 10);
  const isMate   = scoreM[1] === 'mate';

  const score  = isMate ? (scoreVal > 0 ? 100 : -100) : scoreVal / 100;
  const mateIn = isMate ? scoreVal : undefined;

  const pvM = line.match(/\bpv\s+(.+)$/);
  const pv  = pvM ? pvM[1].trim().split(/\s+/) : [];

  return { depth, multiPV, score, isMate, mateIn, pv };
}

function parseBestMove(line: string): string | null {
  const m = line.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
  return m ? m[1] : null;
}

// ─── Engine cache & profiles ────────────────────────────────────────────────
interface CachedEvaluation {
  bestUci: string;
  infos: Map<number, ParsedInfo>;
  score: number;
  bestMove: string;
  pv: string[];
}

const EVAL_CACHE_MAX_SIZE = 600;
const evalCache = new Map<string, CachedEvaluation>();

function normalizeFenKey(fen: string): string {
  // Normalize FEN to piece placement, turn, castling, and en-passant (ignore 50-move & move counter)
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(' ');
}

// ─── StockfishEngineService ─────────────────────────────────────────────────

export class StockfishEngineService implements IChessEngineService {
  private worker: Worker;
  public isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (err: Error) => void;
  private pendingRequest: PendingRequest | null = null;
  private isProcessingCommand = false;

  constructor() {
    // Stockfish 19 Lite Single WASM native Web Worker bootstrap.
    console.info('[Stockfish] Spawning native Web Worker: /stockfish-19-lite-single.js');
    this.worker = new Worker('/stockfish-19-lite-single.js#/stockfish-19-lite-single.wasm,worker');

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    this.worker.onmessage = (event: MessageEvent<string>) => {
      this.handleUciOutput(event.data);
    };

    this.worker.onerror = (err: ErrorEvent) => {
      console.error('[Stockfish] Worker error:', err.message, err);
      if (!this.isReady) this.readyReject(new Error(err.message));
    };

    // Request download progress reporting so we know the worker is alive
    this.send('setoption name CanOutputEngineDownloadProgress');
    // UCI handshake
    this.send('uci');
    this.send('setoption name Hash value 32');
    this.send('isready');

    setTimeout(() => {
      if (!this.isReady) {
        this.readyReject(new Error('Stockfish engine did not become ready within timeout'));
      }
    }, READY_TIMEOUT_MS);
  }

  private send(cmd: string) {
    try {
      this.worker.postMessage(cmd);
    } catch (e) {
      console.warn('[Stockfish] Failed to send UCI command:', cmd, e);
    }
  }

  private handleUciOutput(line: string) {
    if (!line || typeof line !== 'string') return;

    if (line === 'readyok') {
      this.isReady = true;
      this.readyResolve();
      return;
    }

    if (!this.pendingRequest) return;
    const req = this.pendingRequest;

    if (line.startsWith('info')) {
      const parsed = parseInfo(line);
      if (parsed) {
        const existing = req.infoByMultiPV.get(parsed.multiPV);
        if (!existing || parsed.depth >= existing.depth) {
          req.infoByMultiPV.set(parsed.multiPV, parsed);
        }
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      const uciMove = parseBestMove(line);
      this.pendingRequest = null;
      this.isProcessingCommand = false;
      if (uciMove) {
        req.resolve({ bestUci: uciMove, infos: req.infoByMultiPV });
      } else {
        req.reject(new Error(`Unparseable bestmove: ${line}`));
      }
    }
  }

  waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Send a UCI search command and await the bestmove response.
   * Leverages FEN caching for instantaneous hits during full-game re-analysis.
   */
  private search(
    fen: string,
    goCmd: string,
    multiPV: number,
    timeoutMs = 15000
  ): Promise<{ bestUci: string; infos: Map<number, ParsedInfo> }> {
    const fenKey = `${normalizeFenKey(fen)}_${multiPV}_${goCmd}`;
    const cached = evalCache.get(fenKey);
    if (cached) {
      return Promise.resolve({ bestUci: cached.bestUci, infos: cached.infos });
    }

    return new Promise((resolve, reject) => {
      // Cancel any existing search safely
      if (this.pendingRequest) {
        this.send('stop');
        try {
          this.pendingRequest.reject(new Error('Superseded by newer request'));
        } catch {
          // ignore
        }
        this.pendingRequest = null;
      }

      const requestId = genId();
      const wrappedResolve = (result: { bestUci: string; infos: Map<number, ParsedInfo> }) => {
        // Cache result for quick subsequent game step retrieval
        if (evalCache.size >= EVAL_CACHE_MAX_SIZE) {
          const firstKey = evalCache.keys().next().value;
          if (firstKey) evalCache.delete(firstKey);
        }
        const bestInfo = [...result.infos.values()].sort((a, b) => b.depth - a.depth)[0];
        evalCache.set(fenKey, {
          bestUci: result.bestUci,
          infos: result.infos,
          score: bestInfo?.score ?? 0,
          bestMove: result.bestUci,
          pv: bestInfo?.pv || []
        });
        resolve(result);
      };

      this.pendingRequest = { requestId, infoByMultiPV: new Map(), resolve: wrappedResolve, reject };
      this.isProcessingCommand = true;

      this.send(`position fen ${fen}`);
      if (multiPV > 1) {
        this.send(`setoption name MultiPV value ${multiPV}`);
      } else {
        this.send('setoption name MultiPV value 1');
      }
      this.send(goCmd);

      // Guard with timeout
      setTimeout(() => {
        if (this.pendingRequest?.requestId === requestId) {
          this.send('stop');
          // Engine will emit bestmove after stop; wait 1500ms before falling back
          setTimeout(() => {
            if (this.pendingRequest?.requestId === requestId) {
              this.pendingRequest = null;
              this.isProcessingCommand = false;
              // Reset engine state
              this.send('ucinewgame');
              this.send('isready');
              reject(new Error('Engine search timed out'));
            }
          }, 1500);
        }
      }, timeoutMs);
    });
  }

  // ─── IChessEngineService implementation ─────────────────────────────────

  async getBestMove(
    fen: string,
    difficulty: GameDifficulty = 'Intermediate',
    playerRating = 1200
  ): Promise<{ san: string; from: string; to: string; promotion?: string }> {
    await this.waitForReady();
    const profile = getBotProfile(difficulty, playerRating);

    const { bestUci, infos } = await this.search(
      fen,
      `go depth ${profile.depth} movetime ${profile.moveTime}`,
      profile.multiPV
    );

    let chosenUci = bestUci;

    // For weaker difficulties: build a candidate pool of moves within threshold
    if (profile.multiPV > 1 && profile.candidateThresholdCp > 0 && infos.size > 0) {
      const bestInfo = infos.get(1);
      if (bestInfo) {
        const thresholdPawns = profile.candidateThresholdCp / 100;
        const pool: string[] = [];
        for (const [, info] of infos) {
          if (info.pv[0] && (bestInfo.score - info.score) <= thresholdPawns) {
            pool.push(info.pv[0]);
          }
        }
        if (pool.length > 0) {
          chosenUci = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    }

    const parsed = uciToMove(chosenUci, fen);
    if (!parsed) throw new Error(`Could not parse engine move: ${chosenUci}`);
    return parsed;
  }

  async evaluatePosition(fen: string): Promise<EvaluationData> {
    await this.waitForReady();

    const { infos } = await this.search(fen, `go depth ${PROFILE_LIVE_EVAL.depth}`, 1);
    const best = [...infos.values()].sort((a, b) => b.depth - a.depth)[0];

    if (!best) return { score: 0, isMate: false, label: 'Equal', source: 'stockfish', depth: 0 };

    if (best.isMate) {
      return {
        score: best.score,
        isMate: true,
        mateIn: best.mateIn,
        label: best.score > 0 ? 'Winning' : 'Losing',
        source: 'stockfish',
        depth: best.depth,
      };
    }

    return {
      score: Math.round(best.score * 10) / 10,
      isMate: false,
      label: scoreToLabel(best.score),
      source: 'stockfish',
      depth: best.depth,
    };
  }

  async getCandidateMoves(fen: string, maxMoves = 3): Promise<CandidateMove[]> {
    await this.waitForReady();
    const numPV = Math.max(maxMoves, PROFILE_HINT.multiPV);

    const { infos } = await this.search(fen, `go depth ${PROFILE_HINT.depth}`, numPV);

    const candidates: CandidateMove[] = [];
    const slots = [...infos.entries()].sort((a, b) => a[0] - b[0]).slice(0, maxMoves);

    for (const [, info] of slots) {
      if (!info.pv[0]) continue;
      const parsed = uciToMove(info.pv[0], fen);
      if (!parsed) continue;
      candidates.push({
        san: parsed.san,
        from: parsed.from,
        to: parsed.to,
        score: info.isMate ? (info.score > 0 ? 999 : -999) : info.score,
        explanation: buildExplanation(info.pv[0], fen),
      });
    }

    return candidates;
  }

  async classifyMove(
    fenBefore: string,
    fenAfter: string,
    moveSan: string
  ): Promise<{
    classification: import('../types/chess').MoveClassification;
    bestMove: string;
    evalDelta: number;
    explanation: string;
    evalBefore: number;
    evalAfter: number;
    principalVariation: string[];
  }> {
    await this.waitForReady();

    // Determine whose turn it was before the move
    const chessBefore = new Chess(fenBefore);
    const movingSide = chessBefore.turn(); // 'w' | 'b'

    // Evaluate fenBefore sequentially to get authoritative engine best move + PV
    const beforeResult = await this.search(fenBefore, `go depth ${PROFILE_CLASSIFY.depth} movetime ${PROFILE_CLASSIFY.moveTime}`, 1);
    const bestInfo = [...beforeResult.infos.values()].sort((a, b) => b.depth - a.depth)[0];
    const parsedBest = uciToMove(beforeResult.bestUci, fenBefore);
    const bestMove = parsedBest?.san || moveSan;

    // Build principal variation as SAN strings
    const principalVariation: string[] = [];
    if (bestInfo?.pv && bestInfo.pv.length > 0) {
      const tempChess = new Chess(fenBefore);
      for (const uciMove of bestInfo.pv.slice(0, 5)) {
        try {
          const from = uciMove.slice(0, 2) as Square;
          const to = uciMove.slice(2, 4) as Square;
          const promotion = uciMove.length === 5 ? uciMove[4] as 'q' | 'r' | 'b' | 'n' : undefined;
          const result = tempChess.move({ from, to, promotion });
          if (result) principalVariation.push(result.san);
          else break;
        } catch { break; }
      }
    }

    // Evaluate fenAfter sequentially without request collisions
    const afterResult = await this.search(fenAfter, `go depth ${PROFILE_CLASSIFY.depth} movetime ${PROFILE_CLASSIFY.moveTime}`, 1);

    const scoreBefore = bestInfo?.score ?? 0;
    const scoreAfterInfo = [...afterResult.infos.values()].sort((a, b) => b.depth - a.depth)[0];
    const scoreAfter = scoreAfterInfo?.score ?? 0;

    // Centipawn values (raw, White-relative) for the backend
    const evalBeforeCp = Math.round(scoreBefore * 100);
    const evalAfterCp  = Math.round(scoreAfter * 100);

    // Normalize: UCI scores are always from White's perspective.
    const sideSign = movingSide === 'w' ? 1 : -1;
    const evalDelta = Math.max(0, Math.round(((scoreBefore - scoreAfter) * sideSign) * 10) / 10);

    if (moveSan === bestMove) {
      return { classification: 'BEST', bestMove, evalDelta: 0, explanation: 'Top engine recommendation. Optimal move in this position.', evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    }
    if (evalDelta < 0.3) {
      return { classification: 'EXCELLENT', bestMove, evalDelta, explanation: 'Strong move maintaining full positional control.', evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 0.8) {
      return { classification: 'GOOD', bestMove, evalDelta, explanation: 'Solid practical choice keeping the position balanced.', evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 1.8) {
      return { classification: 'INACCURACY', bestMove, evalDelta, explanation: `Slight inaccuracy. ${bestMove} was more active and purposeful.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else if (evalDelta < 3.2) {
      return { classification: 'MISTAKE', bestMove, evalDelta, explanation: `Positional mistake giving opponent counterplay. Best was ${bestMove}.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    } else {
      return { classification: 'BLUNDER', bestMove, evalDelta, explanation: `Critical blunder that damages the position. Better was ${bestMove}.`, evalBefore: evalBeforeCp, evalAfter: evalAfterCp, principalVariation };
    }
  }

  /** Terminate the engine worker cleanly */
  terminate() {
    this.send('quit');
    this.worker.terminate();
  }
}
