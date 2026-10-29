import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Puzzle, PuzzleTheme } from '../types/puzzle';
import { puzzleService } from '../services/puzzleService';
import { ChessBoard } from '../components/chess/ChessBoard';
import { sounds } from '../utils/soundEffects';
import {
  Zap,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Target,
  Brain,
  Filter,
  Clock,
  Star,
  BookOpen,
  Swords,
  Timer,
  Heart,
  Globe,
  ExternalLink,
  Layers,
  ChevronRight,
  RotateCcw,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ─── Theme Metadata ──────────────────────────────────────────────────────────

interface ThemeMeta {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const THEME_META: Record<string, ThemeMeta> = {
  All: {
    label: 'All Themes',
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-emerald-500',
    description: 'Master tactician collection across all motifs'
  },
  Fork: {
    label: 'Fork',
    icon: <Swords className="w-3.5 h-3.5" />,
    color: 'text-amber-500',
    description: 'Attack two or more enemy targets simultaneously'
  },
  Pin: {
    label: 'Pin',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    description: 'Immobilize a shielding piece against king or queen'
  },
  Skewer: {
    label: 'Skewer',
    icon: <ArrowRight className="w-3.5 h-3.5" />,
    color: 'text-rose-500',
    description: 'Attack high-value piece in front, win prize behind'
  },
  'Discovered Attack': {
    label: 'Discovered Attack',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-sky-500',
    description: 'Unmask a hidden line of fire by moving a front piece'
  },
  'Back-Rank Mate': {
    label: 'Back-Rank Mate',
    icon: <Trophy className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    description: 'Corridor checkmate when the king is trapped by friendly pawns'
  },
  Deflection: {
    label: 'Deflection',
    icon: <Brain className="w-3.5 h-3.5" />,
    color: 'text-teal-500',
    description: 'Lure a crucial defender away from its key square'
  },
  'Removing Defender': {
    label: 'Remove Defender',
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-orange-500',
    description: 'Eliminate the guardian piece so the prize falls'
  },
  'Smothered Mate': {
    label: 'Smothered Mate',
    icon: <Star className="w-3.5 h-3.5" />,
    color: 'text-indigo-500',
    description: 'Knight checkmate where the king is suffocated by friendly pieces'
  },
  'Pawn Endgame': {
    label: 'Pawn Endgame',
    icon: <Layers className="w-3.5 h-3.5" />,
    color: 'text-emerald-500',
    description: 'Opposition, pawn breakthrough, and king escort technique'
  },
  'Hanging Piece': {
    label: 'Hanging Piece',
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-emerald-500',
    description: 'Spot and punish completely undefended enemy pieces'
  },
  'Greek Gift': {
    label: 'Greek Gift',
    icon: <Flame className="w-3.5 h-3.5" />,
    color: 'text-amber-500',
    description: 'Classical Bxh7+ sacrifice shattering the king shelter'
  },
  'Queen Sacrifice': {
    label: 'Queen Sacrifice',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    description: 'Sacrifice the Queen to force an inescapable mating net'
  },
  Tactics: {
    label: 'Tactics',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'text-blue-500',
    description: 'Combinative tactical strikes from master games'
  }
};

const DIFFICULTY_BADGES: Record<string, string> = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
};

export type ActivePuzzleTab = 'rated' | 'rush' | 'themes' | 'portal';
export type RushFormat = '3min' | '5min' | 'survival';

export interface PuzzlesPageProps {
  onNavigate?: (route: string) => void;
}

export const PuzzlesPage: React.FC<PuzzlesPageProps> = ({ onNavigate }) => {
  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<ActivePuzzleTab>('rated');
  const [selectedTheme, setSelectedTheme] = useState<string>('All');

  // Main puzzle state
  const [allPuzzles, setAllPuzzles] = useState<Puzzle[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [chess] = useState<Chess>(() => new Chess());
  const [, setRenderTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  // Solve state
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Rating & Session Tracker
  const [tacticalRating, setTacticalRating] = useState<number>(() => puzzleService.getTacticalRating());
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [session, setSession] = useState({
    solved: 0,
    attempted: 0,
    streak: 0,
    bestStreak: 0,
    totalTimeMs: 0
  });
  const puzzleStartTime = useRef<number>(Date.now());

  // ─── Puzzle Rush State ──────────────────────────────────────────────────────
  const [rushFormat, setRushFormat] = useState<RushFormat>('3min');
  const [isRushActive, setIsRushActive] = useState(false);
  const [isRushOver, setIsRushOver] = useState(false);
  const [rushScore, setRushScore] = useState(0);
  const [rushStrikes, setRushStrikes] = useState(0);
  const [rushSecondsLeft, setRushSecondsLeft] = useState(180);
  const [rushHighScore, setRushHighScore] = useState<number>(() => puzzleService.getPuzzleRushHighScore());
  const [rushQueue, setRushQueue] = useState<Puzzle[]>([]);
  const [rushIndex, setRushIndex] = useState(0);

  // ─── Initial Load ───────────────────────────────────────────────────────────
  useEffect(() => {
    puzzleService.getPuzzles().then((puzzles) => {
      setAllPuzzles(puzzles);
      if (puzzles.length > 0) {
        loadPuzzle(puzzles[0]);
      }
      setLoading(false);
    });
  }, []);

  // Update board re-render
  const updateBoard = useCallback(() => {
    setRenderTrigger((p) => p + 1);
  }, []);

  // Load a puzzle onto board
  const loadPuzzle = useCallback(
    (puzzle: Puzzle) => {
      try {
        chess.load(puzzle.fen);
      } catch {
        chess.reset();
      }
      setCurrentPuzzle(puzzle);
      setCurrentMoveIndex(0);
      setIsSolved(false);
      setIsFailed(false);
      setHintLevel(0);
      setHighlightedSquares([]);
      setLastMove(null);
      setFeedback(null);
      setRatingDelta(null);
      puzzleStartTime.current = Date.now();
      updateBoard();
    },
    [chess, updateBoard]
  );

  // ─── Filtered Puzzles List ──────────────────────────────────────────────────
  const filteredPuzzles = selectedTheme === 'All'
    ? allPuzzles
    : allPuzzles.filter((p) => p.theme === selectedTheme);

  // Theme switch effect
  useEffect(() => {
    if (allPuzzles.length === 0 || isRushActive) return;
    if (selectedTheme !== 'All' && currentPuzzle && currentPuzzle.theme !== selectedTheme) {
      const match = allPuzzles.find((p) => p.theme === selectedTheme);
      if (match) loadPuzzle(match);
    }
  }, [selectedTheme, allPuzzles, currentPuzzle, isRushActive, loadPuzzle]);

  // ─── Next Puzzle Handler ───────────────────────────────────────────────────
  const handleNextPuzzle = () => {
    if (isRushActive) {
      advanceRush(rushIndex + 1);
      return;
    }
    const pool = filteredPuzzles.length > 0 ? filteredPuzzles : allPuzzles;
    if (pool.length === 0) return;
    const idx = pool.findIndex((p) => p.id === currentPuzzle?.id);
    const next = pool[(idx + 1) % pool.length];
    loadPuzzle(next);
  };

  const handleRetry = () => {
    if (!currentPuzzle) return;
    try {
      chess.load(currentPuzzle.fen);
    } catch {
      chess.reset();
    }
    setCurrentMoveIndex(0);
    setIsSolved(false);
    setIsFailed(false);
    setHighlightedSquares([]);
    setLastMove(null);
    setFeedback(null);
    puzzleStartTime.current = Date.now();
    updateBoard();
  };

  // ─── Live Online Fetchers (Chess.com & Lichess) ─────────────────────────────
  const handleFetchChessCom = async () => {
    setIsFetchingLive(true);
    setFeedback('Connecting to Chess.com Daily API...');
    try {
      const live = await puzzleService.fetchChessComRandom();
      if (live) {
        setAllPuzzles((prev) => [live, ...prev.filter((p) => p.id !== live.id)]);
        loadPuzzle(live);
        setFeedback(`Loaded live from Chess.com: "${live.title}"`);
      } else {
        setFeedback('Could not fetch from Chess.com. Loaded verified masterclass tactic.');
        handleNextPuzzle();
      }
    } catch {
      setFeedback('Chess.com API network timeout. Switched to offline master tactics.');
      handleNextPuzzle();
    } finally {
      setIsFetchingLive(false);
    }
  };

  const handleFetchLichess = async () => {
    setIsFetchingLive(true);
    setFeedback('Connecting to Lichess 4M+ Open Database...');
    try {
      const live = await puzzleService.fetchLichessDaily();
      if (live) {
        setAllPuzzles((prev) => [live, ...prev.filter((p) => p.id !== live.id)]);
        loadPuzzle(live);
        setFeedback(`Loaded live from Lichess Open Database: "${live.title}"`);
      } else {
        setFeedback('Could not reach Lichess. Switched to offline master archive.');
        handleNextPuzzle();
      }
    } catch {
      setFeedback('Lichess timeout. Switched to offline master archive.');
      handleNextPuzzle();
    } finally {
      setIsFetchingLive(false);
    }
  };

  // ─── Hints & Reveal ────────────────────────────────────────────────────────
  const handleRequestHint = () => {
    if (!currentPuzzle || isSolved) return;
    const nextLevel = Math.min(3, hintLevel + 1);
    setHintLevel(nextLevel);
    const hint = currentPuzzle.hints.find((h) => h.level === nextLevel);
    if (hint?.highlightSquares) {
      setHighlightedSquares(hint.highlightSquares);
    }
  };

  const handleShowSolution = () => {
    if (!currentPuzzle) return;
    const move = currentPuzzle.solutionMoves[0];
    if (move) {
      try {
        chess.load(currentPuzzle.fen);
        chess.move({ from: move.from as Square, to: move.to as Square });
        setLastMove({ from: move.from, to: move.to });
        setIsFailed(true);
        setFeedback(`Solution: ${move.san}. ${currentPuzzle.tacticalExplanation}`);

        // Rating penalty for reveal in rated mode
        if (activeTab === 'rated') {
          const newRating = Math.max(400, tacticalRating - 12);
          setTacticalRating(newRating);
          puzzleService.saveTacticalRating(newRating);
          setRatingDelta(-12);
        }

        setSession((prev) => ({
          ...prev,
          attempted: prev.attempted + 1,
          streak: 0
        }));
        updateBoard();
      } catch {
        // ignore
      }
    }
  };

  // ─── Player Move Handler ───────────────────────────────────────────────────
  const handlePlayerMove = ({ from, to }: { from: string; to: string }) => {
    if (!currentPuzzle || isSolved) return false;
    const expectedMove = currentPuzzle.solutionMoves[currentMoveIndex];
    if (!expectedMove) return false;

    try {
      const move = chess.move({ from: from as Square, to: to as Square });
      if (!move) return false;

      setLastMove({ from, to });
      updateBoard();

      if (from === expectedMove.from && to === expectedMove.to) {
        // Check if there is an opponent response move
        if (expectedMove.response) {
          setTimeout(() => {
            try {
              chess.move({
                from: expectedMove.response!.from as Square,
                to: expectedMove.response!.to as Square
              });
              setLastMove({
                from: expectedMove.response!.from,
                to: expectedMove.response!.to
              });
              setCurrentMoveIndex((prev) => prev + 1);
              updateBoard();
            } catch {
              // ignore
            }
          }, 400);
        } else {
          // Fully solved!
          sounds.playVictory();
          setIsSolved(true);
          setIsFailed(false);
          setFeedback(`Brilliant! ${currentPuzzle.tacticalExplanation}`);
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

          const elapsed = Date.now() - puzzleStartTime.current;
          const ratingGain = Math.max(8, Math.round(18 - elapsed / 6000));

          if (activeTab === 'rated') {
            const newRating = tacticalRating + ratingGain;
            setTacticalRating(newRating);
            puzzleService.saveTacticalRating(newRating);
            setRatingDelta(ratingGain);
          }

          setSession((prev) => {
            const newStreak = prev.streak + 1;
            return {
              ...prev,
              solved: prev.solved + 1,
              attempted: prev.attempted + 1,
              streak: newStreak,
              bestStreak: Math.max(prev.bestStreak, newStreak),
              totalTimeMs: prev.totalTimeMs + elapsed
            };
          });

          // If Puzzle Rush is active, advance score and queue
          if (isRushActive) {
            setRushScore((s) => s + 1);
            setTimeout(() => {
              advanceRush(rushIndex + 1);
            }, 500);
          }
        }
      } else {
        // Wrong move
        sounds.playCheck();
        setIsFailed(true);
        setFeedback(`You played ${move.san}. That is not the winning tactic.`);

        if (activeTab === 'rated') {
          const newRating = Math.max(400, tacticalRating - 10);
          setTacticalRating(newRating);
          puzzleService.saveTacticalRating(newRating);
          setRatingDelta(-10);
        }

        setSession((prev) => ({
          ...prev,
          attempted: prev.attempted + 1,
          streak: 0
        }));

        if (isRushActive) {
          const newStrikes = rushStrikes + 1;
          setRushStrikes(newStrikes);
          if (newStrikes >= 3) {
            endPuzzleRush();
          } else {
            setTimeout(() => {
              advanceRush(rushIndex + 1);
            }, 600);
          }
        } else {
          // Reset board back to puzzle start after 700ms
          setTimeout(() => {
            try {
              chess.load(currentPuzzle.fen);
              updateBoard();
            } catch {
              // ignore
            }
          }, 700);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // ─── Puzzle Rush Engine ─────────────────────────────────────────────────────
  const startPuzzleRush = async (fmt: RushFormat) => {
    setRushFormat(fmt);
    setIsRushActive(true);
    setIsRushOver(false);
    setRushScore(0);
    setRushStrikes(0);

    const seconds = fmt === '3min' ? 180 : fmt === '5min' ? 300 : 99999;
    setRushSecondsLeft(seconds);

    const queue = await puzzleService.getPuzzleRushQueue(40);
    setRushQueue(queue);
    setRushIndex(0);
    if (queue.length > 0) {
      loadPuzzle(queue[0]);
    }
  };

  const advanceRush = (nextIdx: number) => {
    if (nextIdx >= rushQueue.length) {
      endPuzzleRush();
      return;
    }
    setRushIndex(nextIdx);
    loadPuzzle(rushQueue[nextIdx]);
  };

  const endPuzzleRush = () => {
    setIsRushActive(false);
    setIsRushOver(true);
    if (rushScore > rushHighScore) {
      setRushHighScore(rushScore);
      puzzleService.savePuzzleRushHighScore(rushScore);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
    }
  };

  // Timer countdown for Puzzle Rush
  useEffect(() => {
    if (!isRushActive || rushFormat === 'survival') return;
    const interval = setInterval(() => {
      setRushSecondsLeft((sec) => {
        if (sec <= 1) {
          clearInterval(interval);
          endPuzzleRush();
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRushActive, rushFormat]);

  // Derived values
  const activeHint = currentPuzzle?.hints.find((h) => h.level === hintLevel);
  const sessionAccuracy = session.attempted > 0 ? Math.round((session.solved / session.attempted) * 100) : 0;
  const themeMeta = currentPuzzle ? (THEME_META[currentPuzzle.theme] ?? THEME_META['All']) : THEME_META['All'];
  const allThemesList = Object.keys(THEME_META);

  // ─── Skeleton Loader ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-[#181D26] rounded-xl w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-[#181D26] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.35fr)_minmax(320px,_1fr)] gap-6">
          <div className="aspect-square bg-slate-200 dark:bg-[#181D26] rounded-2xl" />
          <div className="space-y-4">
            <div className="h-28 bg-slate-200 dark:bg-[#181D26] rounded-xl" />
            <div className="h-36 bg-slate-200 dark:bg-[#181D26] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentPuzzle) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <Brain className="w-12 h-12 text-slate-400" />
        <p className="font-bold text-slate-800 dark:text-white">No puzzles found.</p>
        <button
          onClick={() => setSelectedTheme('All')}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer"
        >
          Reset to All Themes
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* ─── 1. TOP HEADER & QUICK ONLINE LAUNCH BAR ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="relative space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Tactical Vision Trainer
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Chess.com & Lichess Open Databases
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Tactical Puzzles & Puzzle Rush
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Train tactical pattern recognition across curated masterclass puzzles, live Chess.com archives, and world databases.
          </p>
        </div>

        {/* Quick Live API Fetch Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={handleFetchChessCom}
            disabled={isFetchingLive || isRushActive}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Fetch an authentic daily tactic directly from Chess.com"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chess.com Live</span>
          </button>

          <button
            onClick={handleFetchLichess}
            disabled={isFetchingLive || isRushActive}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Fetch an open-source puzzle from Lichess's 4,000,000+ database"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Lichess 4M+</span>
          </button>

          <button
            onClick={handleNextPuzzle}
            disabled={isRushActive}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 2. MODE NAVIGATION TABS ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-[#262F3E] gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'rated', label: 'Rated Tactics', icon: Target, desc: 'Dynamic Elo Trainer' },
          { id: 'rush', label: 'Puzzle Rush', icon: Flame, desc: 'Speed & Strikes' },
          { id: 'themes', label: 'Themed Practice', icon: Filter, desc: '14 Motifs' },
          { id: 'portal', label: "World's 4M+ Puzzles", icon: Globe, desc: 'Open Databases' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isRushActive) return;
                setActiveTab(tab.id as ActivePuzzleTab);
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#81B64C] text-[#81B64C] dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="text-[10px] hidden md:inline px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1E2533] text-slate-600 dark:text-zinc-400">
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. METRIC CARDS / RUSH STATUS BAR ──────────────────────────────── */}
      {!isRushActive ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Tactical Rating */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tactical Rating</span>
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {tacticalRating}
              </span>
              {ratingDelta !== null && (
                <span className={`text-xs font-bold ${ratingDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Live Elo rating</p>
          </div>

          {/* Solved Today */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Solved Today</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {session.solved} <span className="text-xs text-slate-400 font-normal">/ {session.attempted}</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">{sessionAccuracy}% accuracy</p>
          </div>

          {/* Current Streak */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Current Streak</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {session.streak} 🔥
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Best: {session.bestStreak}</p>
          </div>

          {/* Rush High Score */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Rush Record</span>
              <Timer className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
              {rushHighScore}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">All-time best score</p>
          </div>
        </div>
      ) : (
        /* Puzzle Rush Active Status Bar */
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/30">
              {rushScore}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Puzzle Rush Score</p>
              <p className="text-sm font-black text-white">Puzzle #{rushIndex + 1} ({currentPuzzle.rating} Elo)</p>
            </div>
          </div>

          {/* Strikes (3 Lives) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold mr-1">Strikes:</span>
            {[0, 1, 2].map((strikeIdx) => (
              <span key={strikeIdx} className="text-lg">
                {strikeIdx < rushStrikes ? '❌' : '❤️'}
              </span>
            ))}
          </div>

          {/* Time Remaining */}
          {rushFormat !== 'survival' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black font-mono">
                {Math.floor(rushSecondsLeft / 60)}:{(rushSecondsLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          <button
            onClick={endPuzzleRush}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            End Run
          </button>
        </div>
      )}

      {/* ─── 4. TAB-SPECIFIC CONTROLS ────────────────────────────────────────── */}

      {/* RUSH MODE SELECTION */}
      {activeTab === 'rush' && !isRushActive && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">Chess.com Puzzle Rush Challenge</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Solve as many tactics as possible! Puzzles get progressively harder. 3 strikes and you're out.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: '3min', label: '3-Minute Rush', desc: 'Fast calculation sprint', icon: Timer },
              { id: '5min', label: '5-Minute Rush', desc: 'Standard competitive format', icon: Clock },
              { id: 'survival', label: 'Survival Mode', desc: 'No timer. Play until 3 strikes.', icon: Heart }
            ].map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => startPuzzleRush(f.id as RushFormat)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-[#262F3E] hover:border-[#81B64C] dark:hover:border-emerald-500 bg-slate-50 dark:bg-[#12151B] text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-500">
                      {f.label}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* THEMES FILTER SELECTOR */}
      {activeTab === 'themes' && !isRushActive && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filter by Tactical Motif (14 Categories)
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            {allThemesList.map((themeKey) => {
              const meta = THEME_META[themeKey] ?? THEME_META['All'];
              const isActive = selectedTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => setSelectedTheme(themeKey)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-[#81B64C] text-white border-[#81B64C]'
                      : 'bg-white dark:bg-[#181D26] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-[#262F3E] hover:bg-slate-100 dark:hover:bg-[#202735]'
                  }`}
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* WORLD'S 4M+ PUZZLES PORTAL */}
      {activeTab === 'portal' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] space-y-5 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                World's Open Chess Puzzle Ecosystem
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-2xl">
              There are millions of tactical puzzles in the chess universe! Chess Mastery connects you directly with both
              Chess.com and the Lichess Open Tactical Database (4,000,000+ positions evaluated by Stockfish NNUE).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chess.com Portal Card */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-slate-200 dark:border-[#262F3E] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">
                    ♟️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chess.com Puzzles</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">500,000+ tactics & Puzzle Battle</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">Official</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300">
                Chess.com features Daily Puzzles, Puzzle Rush (3m, 5m, Survival), and real-time multiplayer Puzzle Battle.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleFetchChessCom}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Fetch Next Tactic</span>
                </button>
                <a
                  href="https://www.chess.com/puzzles"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-[#202735] text-slate-700 dark:text-zinc-300 text-xs font-bold hover:text-white flex items-center gap-1"
                >
                  <span>Open Chess.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Lichess 4M+ Open Database Portal Card */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-slate-200 dark:border-[#262F3E] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                    🌐
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lichess Open Database</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">4,000,000+ open-source puzzles</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">Free / CC0</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300">
                The world's largest public chess puzzle dataset generated from actual games evaluated by Stockfish NNUE.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleFetchLichess}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Fetch Lichess Daily</span>
                </button>
                <a
                  href="https://database.lichess.org/#puzzles"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-[#202735] text-slate-700 dark:text-zinc-300 text-xs font-bold hover:text-white flex items-center gap-1"
                >
                  <span>Download 4M Database</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. MAIN CHESSBOARD + CHALLENGE CARD LAYOUT ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.35fr)_minmax(320px,_1fr)] gap-6 items-start">

        {/* Left: Interactive Board */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-[540px]">
            <ChessBoard
              chess={chess}
              orientation={currentPuzzle.playerColor === 'w' ? 'white' : 'black'}
              isInteractive={!isSolved && !isFailed}
              highlightedSquares={highlightedSquares}
              lastMove={lastMove}
              onMovePiece={handlePlayerMove}
            />
          </div>

          {/* Side to move & Metadata bar */}
          <div className="w-full max-w-[540px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] flex items-center justify-between text-xs font-semibold shadow-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full shadow-xs ${
                  currentPuzzle.playerColor === 'w'
                    ? 'bg-white border-2 border-slate-400'
                    : 'bg-slate-900 border border-slate-700'
                }`}
              />
              <span className="text-slate-800 dark:text-zinc-200 font-bold">
                {currentPuzzle.playerColor === 'w' ? 'White' : 'Black'} to move
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${DIFFICULTY_BADGES[currentPuzzle.difficulty] ?? DIFFICULTY_BADGES['Medium']}`}>
                {currentPuzzle.difficulty}
              </span>
              <span className="font-bold text-slate-800 dark:text-zinc-300">
                Rating {currentPuzzle.rating}
              </span>
              {currentPuzzle.source && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-[#202735] text-slate-500 dark:text-zinc-400 font-bold">
                  {currentPuzzle.source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Challenge Panel */}
        <div className="bg-white dark:bg-[#181D26] rounded-2xl border border-slate-200 dark:border-[#262F3E] shadow-md overflow-hidden">

          {/* Puzzle Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-[#262F3E] bg-slate-50/80 dark:bg-[#12151B]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-white dark:bg-[#181D26] border border-slate-200 dark:border-[#262F3E] text-slate-800 dark:text-white shadow-xs">
                  {themeMeta.icon}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block">
                    {currentPuzzle.theme}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate block max-w-[200px]">
                    {themeMeta.description}
                  </span>
                </div>
              </div>

              {currentPuzzle.externalUrl && (
                <a
                  href={currentPuzzle.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                  title="View original on web"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {currentPuzzle.title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {currentPuzzle.themeDescription}
            </p>
          </div>

          {/* Panel Body */}
          <div className="p-5 space-y-4">

            {/* Move Feedback */}
            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  isSolved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-300'
                }`}
              >
                {isSolved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed font-semibold">{feedback}</div>
              </div>
            )}

            {/* Progressive Hints */}
            {activeHint && !isSolved && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{activeHint.title}</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-zinc-200 leading-relaxed">
                  {activeHint.description}
                </p>
              </div>
            )}

            {/* Coach Insight */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-slate-200 dark:border-[#262F3E] text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-zinc-200 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Grandmaster Principle</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed italic">
                "{currentPuzzle.coachInsight}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-[#262F3E]">
              {!isSolved ? (
                <>
                  <button
                    onClick={handleRequestHint}
                    disabled={hintLevel >= 3 || isRushActive}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-500/30 transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{hintLevel === 0 ? 'Get Hint' : `Hint (${hintLevel}/3)`}</span>
                  </button>

                  <button
                    onClick={handleShowSolution}
                    disabled={isRushActive}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#12151B] dark:hover:bg-[#202735] text-slate-700 dark:text-zinc-300 text-xs font-bold border border-slate-200 dark:border-[#262F3E] transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal</span>
                  </button>

                  <button
                    onClick={handleRetry}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#12151B] dark:hover:bg-[#202735] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#262F3E] transition-colors cursor-pointer shadow-xs"
                    title="Retry Position"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleNextPuzzle}
                  className="chess-btn-green w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  <span>Continue to Next Puzzle</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Solved Banner */}
            {isSolved && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-1 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Puzzle Solved!</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                  Current Streak: <strong className="text-slate-900 dark:text-white">{session.streak}</strong> ·
                  Accuracy: <strong className="text-slate-900 dark:text-white">{sessionAccuracy}%</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 6. PUZZLE RUSH GAME OVER MODAL ──────────────────────────────────── */}
      {isRushOver && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-[#181D26] rounded-2xl border border-slate-200 dark:border-[#262F3E] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Puzzle Rush Finished!</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {rushFormat === 'survival' ? 'Survival run ended after 3 strikes.' : `Time expired for ${rushFormat}.`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-slate-200 dark:border-[#262F3E] grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Your Score</p>
                <p className="text-2xl font-black text-emerald-500 tabular-nums">{rushScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">High Score</p>
                <p className="text-2xl font-black text-purple-500 tabular-nums">{rushHighScore}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => startPuzzleRush(rushFormat)}
                className="chess-btn-green flex-1 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
              <button
                onClick={() => setIsRushOver(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#202735] dark:hover:bg-[#283245] text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
