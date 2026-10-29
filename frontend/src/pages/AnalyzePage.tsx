import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { SavedGame } from '../types/game';
import { gameService } from '../services/gameService';
import { ChessBoard } from '../components/chess/ChessBoard';
import { MoveHistory } from '../components/game/MoveHistory';
import { EvaluationBar } from '../components/chess/EvaluationBar';
import { MoveRecord, MoveClassification, EvaluationData } from '../types/chess';
import { sounds } from '../utils/soundEffects';
import { chessEngine, mockChessEngine } from '../services/chessEngine';
import {
  extractInstructiveMoments,
  buildEngineVariationReplay,
  ReplayStep,
  detectChessTheme,
  sanitizeInternalReturnUrl
} from '../utils/analyzeUtils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Zap,
  Target,
  BookOpen,
  Play,
  Flame
} from 'lucide-react';

interface AnalyzePageProps {
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ onNavigate, currentRoute }) => {
  const [availableGames, setAvailableGames] = useState<SavedGame[]>([]);
  const [game, setGame] = useState<SavedGame | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAnalyzingGame, setIsAnalyzingGame] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number } | null>(null);

  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [chess] = useState<Chess>(() => new Chess());
  const [, setRenderTrigger] = useState(0);

  // Active navigation filter tab: 'all' | 'moments'
  const [viewTab, setViewTab] = useState<'all' | 'moments'>('all');

  // Board presentation mode: 'after' | 'before' | 'engine_replay'
  const [boardDisplayMode, setBoardDisplayMode] = useState<'after' | 'before' | 'engine_replay'>('after');
  const [engineReplaySteps, setEngineReplaySteps] = useState<ReplayStep[]>([]);
  const [engineReplayIndex, setEngineReplayIndex] = useState<number>(0);

  // Sandbox retry mode
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [sandboxFeedback, setSandboxFeedback] = useState<string | null>(null);

  const updateBoard = useCallback(() => {
    setRenderTrigger((p) => p + 1);
  }, []);

  // Parse URL query parameters for gameId and move on route load
  const routeParams = useMemo(() => {
    try {
      const urlString = currentRoute || (typeof window !== 'undefined' ? window.location.hash || window.location.search : '');
      const queryIdx = urlString.indexOf('?');
      if (queryIdx >= 0) {
        const search = urlString.slice(queryIdx);
        const params = new URLSearchParams(search);
        return {
          gameId: params.get('gameId'),
          move: params.get('move') !== null ? parseInt(params.get('move')!, 10) : null
        };
      }
    } catch {
      // ignore
    }
    return { gameId: null, move: null };
  }, [currentRoute]);

  // Load available games from gameService
  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const recent = await gameService.getRecentGames();
      if (recent && recent.length > 0) {
        setAvailableGames(recent);
        // If route specified gameId, pick that one; otherwise recent[0]
        const matched = routeParams.gameId ? recent.find((g) => g.id === routeParams.gameId) : null;
        setGame(matched || recent[0]);
      } else {
        setAvailableGames([]);
        setGame(null);
      }
    } catch (err: any) {
      console.error('[AnalyzePage] Failed to load games:', err);
      setLoadError(err.message || 'Unable to connect to game persistence server.');
    } finally {
      setIsLoading(false);
    }
  }, [routeParams.gameId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Jump to specific move index in regular game flow
  const goToMove = useCallback((targetIndex: number, mode: 'after' | 'before' = 'after') => {
    if (!game || targetIndex < 0 || targetIndex >= game.moves.length) return;

    // Reset chess board and replay moves
    chess.reset();
    const limit = mode === 'before' ? targetIndex : targetIndex + 1;
    for (let i = 0; i < limit; i++) {
      const m = game.moves[i];
      chess.move({ from: m.from as Square, to: m.to as Square, promotion: m.promotion });
    }

    setCurrentMoveIndex(targetIndex);
    setBoardDisplayMode(mode);
    setIsSandboxMode(false);
    setSandboxFeedback(null);
    setEngineReplaySteps([]);
    setEngineReplayIndex(0);
    updateBoard();
  }, [chess, game, updateBoard]);

  // Hydrate initial move from URL parameter or default to 0
  useEffect(() => {
    if (game && game.moves.length > 0) {
      if (routeParams.move !== null && routeParams.move >= 0 && routeParams.move < game.moves.length) {
        goToMove(routeParams.move);
      } else {
        goToMove(0);
      }
    }
  }, [game, routeParams.move, goToMove]);

  // Derived instructive moments
  const instructiveMoments = useMemo(() => {
    return game ? extractInstructiveMoments(game) : [];
  }, [game]);

  const activeMove: MoveRecord | undefined = game?.moves[currentMoveIndex];

  // Derive fenBefore for active move
  const activeFenBefore = useMemo(() => {
    if (!game || currentMoveIndex < 0) return '';
    const tempChess = new Chess();
    for (let i = 0; i < currentMoveIndex; i++) {
      const m = game.moves[i];
      try {
        tempChess.move({ from: m.from as Square, to: m.to as Square, promotion: m.promotion });
      } catch {
        break;
      }
    }
    return tempChess.fen();
  }, [game, currentMoveIndex]);

  // Active moment corresponding to currentMoveIndex, if any
  const currentInstructiveMoment = useMemo(() => {
    return instructiveMoments.find((m) => m.moveIndex === currentMoveIndex);
  }, [instructiveMoments, currentMoveIndex]);

  // Step controls
  const handleFirst = () => goToMove(0);
  const handlePrev = () => goToMove(Math.max(0, currentMoveIndex - 1));
  const handleNext = () => {
    if (!game) return;
    goToMove(Math.min(game.moves.length - 1, currentMoveIndex + 1));
  };
  const handleLast = () => {
    if (!game) return;
    goToMove(game.moves.length - 1);
  };

  // Launch Engine Line Replay from the exact position before the move
  const startEngineReplay = () => {
    if (!activeMove || !activeFenBefore) return;

    const steps = buildEngineVariationReplay(
      activeFenBefore,
      activeMove.principalVariation,
      activeMove.bestMove
    );

    if (steps.length === 0) return;

    setEngineReplaySteps(steps);
    setEngineReplayIndex(0);
    setBoardDisplayMode('engine_replay');
    setIsSandboxMode(false);
    setSandboxFeedback(null);

    // Load initial engine step or position before move
    chess.load(steps[0].fen);
    sounds.playMove();
    updateBoard();
  };

  // Step forward or backward through engine continuation
  const handleEngineReplayStep = (direction: 'next' | 'prev') => {
    if (engineReplaySteps.length === 0) return;

    if (direction === 'next') {
      const nextIdx = Math.min(engineReplaySteps.length - 1, engineReplayIndex + 1);
      setEngineReplayIndex(nextIdx);
      chess.load(engineReplaySteps[nextIdx].fen);
      sounds.playMove();
      updateBoard();
    } else {
      if (engineReplayIndex === 0) {
        // Reset to position before move
        chess.load(activeFenBefore);
        sounds.playMove();
        updateBoard();
      } else {
        const prevIdx = engineReplayIndex - 1;
        setEngineReplayIndex(prevIdx);
        chess.load(engineReplaySteps[prevIdx].fen);
        sounds.playMove();
        updateBoard();
      }
    }
  };

  const exitEngineReplay = () => {
    goToMove(currentMoveIndex, 'after');
  };

  // Handle sandbox move
  const handleSandboxMove = ({ from, to }: { from: string; to: string }) => {
    try {
      const move = chess.move({ from: from as Square, to: to as Square });
      if (!move) return false;

      sounds.playMove();
      setIsSandboxMode(true);
      setBoardDisplayMode('after');
      setSandboxFeedback(`You tested ${move.san} in the sandbox. Exploring tactical response...`);
      updateBoard();
      return true;
    } catch {
      return false;
    }
  };

  const getClassificationBadge = (cls?: MoveClassification) => {
    switch (cls) {
      case 'BEST':
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">BEST MOVE</span>;
      case 'GOOD':
      case 'BOOK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">GOOD</span>;
      case 'INACCURACY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">INACCURACY</span>;
      case 'MISTAKE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">MISTAKE</span>;
      case 'BLUNDER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-900 border border-red-300">BLUNDER</span>;
      case 'MISSED_WIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">MISSED WIN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600 border border-surface-200">UNRATED</span>;
    }
  };

  // Run full Stockfish engine evaluation across all moves with genuine delta & PV calculations
  const analyzeCurrentGame = async () => {
    if (!game || isAnalyzingGame || game.moves.length === 0) return;
    setIsAnalyzingGame(true);
    setAnalysisProgress({ current: 0, total: game.moves.length });
    try {
      const replayChess = new Chess();
      const updatedMoves: MoveRecord[] = [];

      for (let i = 0; i < game.moves.length; i++) {
        const m = game.moves[i];
        setAnalysisProgress({ current: i + 1, total: game.moves.length });

        const fenBefore = replayChess.fen();
        let fenAfter = m.fenAfter;
        let classification: MoveClassification = m.classification || 'GOOD';
        let bestMove: string = m.bestMove || m.san;
        let explanation: string = m.explanation || '';
        let evaluation: number | undefined = m.evaluation;
        let evalBefore: number | undefined = m.evalBefore;
        let evalDelta: number | undefined = m.evalDelta;
        let principalVariation: string[] | undefined = m.principalVariation;

        // Synchronize board position for move replay
        try {
          const moveRes = replayChess.move({
            from: m.from as Square,
            to: m.to as Square,
            promotion: m.promotion
          });
          if (moveRes) {
            fenAfter = replayChess.fen();
          } else if (m.fenAfter) {
            replayChess.load(m.fenAfter);
            fenAfter = m.fenAfter;
          }
        } catch {
          // If chess.js encounters 50-move rule, draw, or desync past move 75,
          // load m.fenAfter directly so analysis reliably continues for all moves!
          if (m.fenAfter) {
            try { replayChess.load(m.fenAfter); } catch {}
            fenAfter = m.fenAfter;
          }
        }

        // Run engine classification with safe try/catch per move
        try {
          const classRes = await chessEngine.classifyMove(fenBefore, fenAfter, m.san);
          classification = classRes.classification;
          bestMove = classRes.bestMove;
          explanation = classRes.explanation;
          evalBefore = classRes.evalBefore;
          evalDelta = classRes.evalDelta;
          principalVariation = classRes.principalVariation;
          // Use classRes.evalAfter directly — eliminates the redundant 3rd engine search!
          evaluation = Math.round((classRes.evalAfter / 100) * 10) / 10;
        } catch (engineErr) {
          console.warn(`[AnalyzePage] Move ${i + 1} engine evaluation fallback:`, engineErr);
          // If individual move engine search times out or errors, use heuristic evaluation fallback
          try {
            const fallbackEval = await mockChessEngine.evaluatePosition(fenAfter);
            evaluation = fallbackEval.score;
            if (evalBefore !== undefined) {
              const movingSide = replayChess.turn() === 'w' ? 'b' : 'w';
              const sideSign = movingSide === 'w' ? 1 : -1;
              evalDelta = Math.max(0, Math.round(((evalBefore - (fallbackEval.score * 100)) * sideSign) / 10) / 10);
              if (evalDelta < 0.5) classification = 'EXCELLENT';
              else if (evalDelta < 1.0) classification = 'GOOD';
              else if (evalDelta < 2.0) classification = 'INACCURACY';
              else if (evalDelta < 3.5) classification = 'MISTAKE';
              else classification = 'BLUNDER';
            }
          } catch {
            // Heuristic fallback safe
          }
        }

        const theme = m.theme || detectChessTheme(fenBefore, fenAfter, m);

        updatedMoves.push({
          ...m,
          fenAfter,
          classification,
          bestMove,
          explanation,
          evaluation,
          evalBefore,
          evalDelta,
          principalVariation,
          theme
        });
      }

      // Recompute accuracies
      const whiteMoves = updatedMoves.filter((m) => m.color === 'w');
      const blackMoves = updatedMoves.filter((m) => m.color === 'b');
      const whiteAcc = whiteMoves.length > 0
        ? Math.round((whiteMoves.filter((m) => m.classification === 'BEST' || m.classification === 'EXCELLENT').length / whiteMoves.length) * 100)
        : 80;
      const blackAcc = blackMoves.length > 0
        ? Math.round((blackMoves.filter((m) => m.classification === 'BEST' || m.classification === 'EXCELLENT').length / blackMoves.length) * 100)
        : 80;

      const analyzedGame: SavedGame = {
        ...game,
        moves: updatedMoves,
        accuracy: {
          white: whiteAcc,
          black: blackAcc
        }
      };

      setGame(analyzedGame);
      setAvailableGames((prev) => prev.map((g) => (g.id === game.id ? analyzedGame : g)));
      goToMove(currentMoveIndex);
    } catch (err) {
      console.error('[AnalyzePage] Failed to analyze game with engine:', err);
    } finally {
      setIsAnalyzingGame(false);
      setAnalysisProgress(null);
    }
  };

  // Build genuine EvaluationData object with truthful labeling
  const currentEval: EvaluationData = useMemo(() => {
    if (activeMove?.evaluation !== undefined && activeMove.evaluation !== null) {
      return {
        score: activeMove.evaluation,
        isMate: false,
        label: activeMove.evaluation > 1.5 ? 'Better' : activeMove.evaluation < -1.5 ? 'Worse' : 'Equal',
        source: chessEngine.getStatus?.()?.isStockfish ? 'stockfish' : 'heuristic'
      };
    }
    return {
      score: 0.0,
      isMate: false,
      label: 'Equal',
      source: 'heuristic'
    };
  }, [activeMove]);

  // Safe navigation handler
  const handleActionNavigate = (targetPath: string) => {
    if (onNavigate) {
      onNavigate(targetPath);
    } else if (typeof window !== 'undefined') {
      window.location.hash = targetPath;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-surface-900">Loading Game Analysis</h3>
          <p className="text-xs text-surface-500 mt-1">Fetching persistent game records from server...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-surface-900">Unable to Connect to Persistence Server</h2>
          <p className="text-xs text-rose-700 mt-1 font-medium">{loadError}</p>
          <p className="text-[11px] text-surface-500 mt-2">
            Target API: <code className="bg-surface-100 px-1.5 py-0.5 rounded text-surface-800">{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</code>
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={loadGames}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl chess-btn-green text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white dark:bg-[#1A1F2B] rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-md text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#14171E] text-slate-700 dark:text-zinc-300 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Saved Games Found</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Play a match against the AI Coach to review every move with Stockfish analysis.</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/play')}
              className="chess-btn-green inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Match Now</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadGames}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1E2330] hover:bg-slate-200 dark:hover:bg-[#252C3D] text-slate-700 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-slate-700/60 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    );
  }

  // Build safe return URL to this exact game review position
  const returnUrlParam = encodeURIComponent(
    sanitizeInternalReturnUrl(`/analyze?gameId=${game.id}&move=${currentMoveIndex}`)
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Post-Game Analysis & Quality Review
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
              {game.date}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
            {game.whitePlayer} ({game.whiteRating}) vs {game.blackPlayer} ({game.blackRating})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Game Selector Dropdown */}
          <label className="sr-only" htmlFor="game-select">Select Game to Analyze</label>
          <select
            id="game-select"
            value={game.id}
            onChange={(e) => {
              const selected = availableGames.find((g) => g.id === e.target.value);
              if (selected) {
                setGame(selected);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] text-xs font-semibold text-slate-800 dark:text-zinc-200 shadow-xs cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {availableGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.whitePlayer} vs {g.blackPlayer} ({g.moves.length} moves) • {g.date}
              </option>
            ))}
          </select>

          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] text-xs font-bold text-slate-600 dark:text-zinc-300 shadow-xs">
            Result: <span className="text-slate-900 dark:text-white font-black">{game.resultString}</span>
          </div>

          <button
            onClick={analyzeCurrentGame}
            disabled={isAnalyzingGame}
            className="chess-btn-green inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
            title="Run full Stockfish engine evaluation across all moves"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingGame ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingGame ? 'Analyzing...' : 'Run Stockfish Review'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Stockfish Analysis Progress Banner */}
      {isAnalyzingGame && analysisProgress && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-[#81B64C]/50 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#81B64C] animate-spin" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Evaluating with Stockfish 19 Engine...
              </span>
            </div>
            <span className="text-xs font-bold text-[#81B64C]">
              Move {analysisProgress.current} of {analysisProgress.total} ({Math.round((analysisProgress.current / analysisProgress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2 bg-emerald-200/50 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#81B64C] transition-all duration-200 rounded-full"
              style={{ width: `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Accuracy & Opening Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm">
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">White Accuracy</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">{game.accuracy.white}%</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Black Accuracy</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">{game.accuracy.black}%</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Opening Identified</span>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">{game.opening.name}</div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Instructive Moments</span>
          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
            {instructiveMoments.length} key {instructiveMoments.length === 1 ? 'moment' : 'moments'} detected
          </div>
        </div>
      </div>

      {/* View Switcher: All Moves vs Instructive Moments */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1E222B] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewTab === 'all'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-[#14171E] text-zinc-400 hover:text-white border border-[#1E222B]'
            }`}
          >
            All Moves ({game.moves.length})
          </button>
          <button
            onClick={() => {
              setViewTab('moments');
              if (instructiveMoments.length > 0) {
                goToMove(instructiveMoments[0].moveIndex);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              viewTab === 'moments'
                ? 'bg-amber-500 text-zinc-950 font-black'
                : 'bg-amber-950/30 text-amber-300 border border-amber-800/40 hover:bg-amber-900/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Instructive Moments ({instructiveMoments.length})</span>
          </button>
        </div>

        {/* Instructive Moments Carousel / Quick Jump */}
        {viewTab === 'moments' && instructiveMoments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {instructiveMoments.map((mom) => (
              <button
                key={mom.moveIndex}
                onClick={() => goToMove(mom.moveIndex)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition-all ${
                  currentMoveIndex === mom.moveIndex
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-xs ring-2 ring-amber-400'
                    : mom.classification === 'BLUNDER'
                    ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/70 border border-rose-800/60'
                    : mom.classification === 'MISTAKE'
                    ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border border-amber-800/60'
                    : 'bg-[#14171E] text-zinc-300 hover:bg-[#1A1E27] border border-[#222733]'
                }`}
              >
                #{mom.moveNumber} {mom.san} ({mom.classification})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.35fr)_minmax(340px,_1fr)] gap-6 items-start">
        {/* Left Column: Board & Stepper Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Engine Replay Banner */}
          {boardDisplayMode === 'engine_replay' && (
            <div className="w-full max-w-[540px] p-3 rounded-xl bg-emerald-50 border border-emerald-300 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Engine Continuation: Move {engineReplayIndex + 1} of {engineReplaySteps.length} ({engineReplaySteps[engineReplayIndex]?.san})
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Showing optimal engine continuation from position before {activeMove?.san}
                  </div>
                </div>
              </div>
              <button
                onClick={exitEngineReplay}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                Back to Move
              </button>
            </div>
          )}

          {/* Board & Evaluation Bar */}
          <div className="flex items-center gap-3 w-full justify-center">
            <EvaluationBar evaluation={currentEval} className="hidden sm:flex" />
            <div className="w-full max-w-[540px]">
              <ChessBoard
                chess={chess}
                isInteractive={true}
                lastMove={
                  boardDisplayMode === 'engine_replay' && engineReplaySteps[engineReplayIndex]
                    ? { from: engineReplaySteps[engineReplayIndex].from, to: engineReplaySteps[engineReplayIndex].to }
                    : activeMove && boardDisplayMode === 'after'
                    ? { from: activeMove.from, to: activeMove.to }
                    : null
                }
                onMovePiece={handleSandboxMove}
              />
            </div>
          </div>

          {/* Stepper Toolbar */}
          <div className="flex items-center justify-between p-1.5 bg-white dark:bg-[#1A1F2B] rounded-xl border border-slate-200 dark:border-[#273042] shadow-sm w-full max-w-[540px]">
            {boardDisplayMode === 'engine_replay' ? (
              <div className="flex items-center justify-between w-full px-2">
                <button
                  onClick={() => handleEngineReplayStep('prev')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#161922] border border-slate-200 dark:border-[#262B36] text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-[#1E2330] cursor-pointer"
                >
                  ◀ Previous Engine Step
                </button>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  Step {engineReplayIndex + 1} / {engineReplaySteps.length}
                </span>
                <button
                  onClick={() => handleEngineReplayStep('next')}
                  disabled={engineReplayIndex === engineReplaySteps.length - 1}
                  className="chess-btn-green px-3.5 py-1.5 rounded-lg text-white disabled:opacity-30 text-xs font-bold cursor-pointer"
                >
                  Next Engine Step ▶
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleFirst}
                    disabled={currentMoveIndex === 0}
                    className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1E27] disabled:opacity-30 transition-colors cursor-pointer"
                    title="First Move"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePrev}
                    disabled={currentMoveIndex === 0}
                    className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1E27] disabled:opacity-30 transition-colors cursor-pointer"
                    title="Previous Move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 text-xs font-bold font-mono text-slate-900 dark:text-zinc-200">
                    Move {currentMoveIndex + 1} of {game.moves.length}
                  </span>
                  {/* Position Toggle: Before vs After */}
                  <button
                    onClick={() => goToMove(currentMoveIndex, boardDisplayMode === 'after' ? 'before' : 'after')}
                    className="px-2.5 py-1 rounded text-[10px] font-bold border border-slate-200 dark:border-[#262B36] bg-slate-100 dark:bg-[#161922] hover:bg-slate-200 dark:hover:bg-[#202533] text-slate-800 dark:text-zinc-200 cursor-pointer"
                    title="Toggle board position before or after the move"
                  >
                    {boardDisplayMode === 'after' ? 'Show Before' : 'Show After'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNext}
                    disabled={currentMoveIndex === game.moves.length - 1}
                    className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1E27] disabled:opacity-30 transition-colors cursor-pointer"
                    title="Next Move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLast}
                    disabled={currentMoveIndex === game.moves.length - 1}
                    className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1E27] disabled:opacity-30 transition-colors cursor-pointer"
                    title="Last Move"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Grounded Coaching Commentary & Training Actions */}
        <div className="bg-white dark:bg-[#1A1F2B] p-5 rounded-2xl border border-slate-200 dark:border-[#273042] shadow-sm space-y-4">
          {activeMove && (
            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E222B] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                    Move {activeMove.moveNumber} ({activeMove.color === 'w' ? 'White' : 'Black'})
                  </span>
                  {boardDisplayMode === 'before' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                      Before Move
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Class:</span>
                  {getClassificationBadge(activeMove.classification)}
                </div>
              </div>

              {/* Move Comparison: Played vs Engine Best vs Grounded Evaluation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-[#1E222B] shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Played</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{activeMove.san}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-[#1E222B] shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Engine Best</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {activeMove.bestMove
                      ? activeMove.bestMove
                      : activeMove.classification === 'BEST' || activeMove.classification === 'BOOK'
                      ? activeMove.san
                      : isAnalyzingGame
                      ? 'Calculating...'
                      : <span className="text-slate-400 dark:text-zinc-500 text-xs font-normal">Not evaluated</span>}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-[#0E1015] border border-slate-200 dark:border-[#1E222B] col-span-2 sm:col-span-1 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Evaluation</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                    {activeMove.evaluation !== undefined && activeMove.evaluation !== null ? (
                      <>
                        {activeMove.evaluation > 0 ? `+${activeMove.evaluation.toFixed(1)}` : activeMove.evaluation.toFixed(1)}
                        <span className="text-[9px] font-normal text-zinc-400 block">
                          White-relative
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500 text-xs font-normal">Not evaluated</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Evaluation Delta & Perspective Details (truthful only when evaluated) */}
              {activeMove.evalDelta !== undefined && activeMove.evalDelta > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
                  <span className="font-semibold">Evaluation Damage:</span>
                  <span className="font-mono font-bold">
                    -{activeMove.evalDelta.toFixed(1)} pawns dropped by {activeMove.color === 'w' ? 'White' : 'Black'}
                  </span>
                </div>
              )}

              {/* Detected Tactical / Positional Theme Badge */}
              {currentInstructiveMoment?.theme && (
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                        Detected Motif
                      </span>
                      <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                        {currentInstructiveMoment.themeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grounded Move Explanation */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Instructive Coaching Explanation
                </span>
                <p className="text-xs text-slate-800 dark:text-zinc-300 leading-relaxed bg-white dark:bg-[#0E1015] p-3 rounded-xl border border-slate-200 dark:border-[#1E222B] shadow-xs">
                  {activeMove.explanation || (
                    activeMove.classification === 'BEST'
                      ? 'Top engine recommendation. Optimal tactical and positional move.'
                      : activeMove.classification === 'BOOK'
                      ? 'Established opening theory move.'
                      : activeMove.classification === 'BLUNDER'
                      ? `Severe blunder that drastically swung evaluation. Better was ${activeMove.bestMove || 'a defensive alternative'}.`
                      : activeMove.classification === 'MISTAKE'
                      ? `Suboptimal move granting counterplay. Preferred continuation was ${activeMove.bestMove || 'engine line'}.`
                      : activeMove.classification === 'INACCURACY'
                      ? `Minor inaccuracy. ${activeMove.bestMove || 'An alternate line'} held slightly firmer control.`
                      : 'Practical move keeping positional balance.'
                  )}
                </p>
              </div>

              {/* Interactive Engine Line Replay Trigger */}
              {(activeMove.bestMove || activeMove.principalVariation) && (
                <div className="pt-1">
                  <button
                    onClick={startEngineReplay}
                    className="chess-btn-green w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Replay Engine Line ({activeMove.bestMove || activeMove.principalVariation?.[0]})</span>
                  </button>
                </div>
              )}

              {/* Stage 2 Training Actions: Connect Mistake to Practice or Lesson */}
              {currentInstructiveMoment && (currentInstructiveMoment.classification === 'BLUNDER' || currentInstructiveMoment.classification === 'MISTAKE' || currentInstructiveMoment.theme) && (
                <div className="pt-2 border-t border-slate-200 dark:border-[#1E222B] space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Train This Weakness
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        handleActionNavigate(
                           `/practice?theme=${currentInstructiveMoment.theme || 'FORK'}&returnTo=${returnUrlParam}`
                        )
                      }
                      className="chess-btn-amber inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Practice {currentInstructiveMoment.themeLabel || 'Tactics'}</span>
                    </button>

                    {currentInstructiveMoment.lessonId ? (
                      <button
                        onClick={() =>
                          handleActionNavigate(
                            `/learn/${currentInstructiveMoment.lessonId}?returnTo=${returnUrlParam}`
                          )
                        }
                        className="chess-btn-blue inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Study Lesson</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActionNavigate(`/learn?returnTo=${returnUrlParam}`)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>View Curriculum</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sandbox feedback */}
              {isSandboxMode && sandboxFeedback && (
                <div className="mt-2 pt-2 border-t border-brand-200 text-xs text-brand-800 bg-brand-50 p-2.5 rounded-lg border border-brand-200">
                  <span className="font-bold block mb-0.5">Sandbox Exploration:</span>
                  {sandboxFeedback}
                  <button
                    onClick={() => goToMove(currentMoveIndex)}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 underline mt-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to original move</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Coach Game Takeaway */}
          <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200/70 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-brand-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Coach Takeaway for this Game</span>
            </div>
            <p className="text-[11px] text-brand-950 leading-relaxed">
              {game.analysis.keyLesson || 'Keep active piece play and verify king safety before launching counter-attacks.'}
            </p>
          </div>

          {/* Move History Component */}
          <div>
            <span className="text-xs font-bold text-surface-800 block mb-2">
              Move List ({game.moves.length} moves)
            </span>
            <div className="border border-surface-200 rounded-xl p-2 bg-surface-50/50 max-h-72 overflow-y-auto">
              <MoveHistory
                moves={game.moves}
                activeMoveIndex={currentMoveIndex}
                onSelectMove={goToMove}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
