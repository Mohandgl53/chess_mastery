import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerProfile } from '../types/user';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../components/chess/ChessBoard';
import { sounds } from '../utils/soundEffects';
import {
  practiceApi,
  PracticeDashboardData,
  PracticePuzzleData,
  PracticeSessionData,
  RecordAttemptResponse,
  CompleteSessionResponse
} from '../services/api/practiceApi';
import {
  Target,
  AlertTriangle,
  Zap,
  BookOpen,
  Award,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Brain,
  ShieldAlert,
  Calendar,
  Layers,
  Flame,
  Check,
  X,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sanitizeInternalReturnUrl } from '../utils/analyzeUtils';
import { ALL_PRACTICE_DRILLS, PracticeDrillDefinition } from '../mock/practiceDrills';

interface PracticePageProps {
  userProfile: PlayerProfile;
  onNavigate: (route: string) => void;
  currentRoute?: string;
}

export const PracticePage: React.FC<PracticePageProps> = ({ userProfile, onNavigate, currentRoute }) => {
  // Dashboard & Planning State
  const [dashboard, setDashboard] = useState<PracticeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Training Session State
  const [activeSession, setActiveSession] = useState<PracticeSessionData | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<PracticePuzzleData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCompletedSummary, setSessionCompletedSummary] = useState<CompleteSessionResponse['summary'] | null>(null);

  // Board State
  const [chess] = useState<Chess>(() => new Chess());
  const [boardFen, setBoardFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [, setRenderTrigger] = useState(0);

  // Attempt Result Feedback
  const [lastAttemptResult, setLastAttemptResult] = useState<RecordAttemptResponse | null>(null);
  const [attemptFeedback, setAttemptFeedback] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Hints
  const [activeHintLevel, setActiveHintLevel] = useState<number>(0);
  const [usedHintInCurrentPuzzle, setUsedHintInCurrentPuzzle] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Extract ?theme= parameter if present in currentRoute
  const extractQueryTheme = useCallback((): string | undefined => {
    if (!currentRoute || !currentRoute.includes('?')) return undefined;
    const queryString = currentRoute.split('?')[1];
    const params = new URLSearchParams(queryString);
    const theme = params.get('theme');
    return theme ? theme.toUpperCase() : undefined;
  }, [currentRoute]);

  // Extract ?returnTo= parameter if present in currentRoute
  const returnToUrl = useMemo((): string | null => {
    if (!currentRoute || !currentRoute.includes('?')) return null;
    const queryString = currentRoute.split('?')[1];
    const params = new URLSearchParams(queryString);
    const returnTo = params.get('returnTo');
    return returnTo ? sanitizeInternalReturnUrl(returnTo) : null;
  }, [currentRoute]);

  // Category & Rating Tier Filter States for Drills
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'OPENINGS' | 'MIDDLEGAME' | 'ENDGAME' | 'TACTICS'>('ALL');
  const [selectedRatingTier, setSelectedRatingTier] = useState<'ALL' | 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER'>('ALL');

  const filteredDrills = useMemo(() => {
    return ALL_PRACTICE_DRILLS.filter((d) => {
      const matchCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      const matchTier = selectedRatingTier === 'ALL' || d.ratingTier === selectedRatingTier;
      return matchCat && matchTier;
    });
  }, [selectedCategory, selectedRatingTier]);

  // Load dashboard overview on mount
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await practiceApi.getDashboard();
      setDashboard(data);

      // Check if user came with explicit theme query param
      // Note: We do NOT auto-resume activeSession from dashboard because
      // the dashboard data has no puzzle — we'd get a blank screen.
      // Instead we show a "Resume Session" card in the dashboard view.
      const queryTheme = extractQueryTheme();
      if (queryTheme) {
        await startNewSession(queryTheme);
      }
    } catch (err: any) {
      console.error('Error loading practice dashboard:', err);
      setError(err?.message || 'Failed to load practice training data');
    } finally {
      setLoading(false);
    }
  }, [extractQueryTheme]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Start or resume a training session
  const startNewSession = async (targetTheme?: string) => {
    try {
      setLoading(true);
      setError(null);
      setSessionCompletedSummary(null);
      setLastAttemptResult(null);
      setIsSolved(false);
      setActiveHintLevel(0);
      setUsedHintInCurrentPuzzle(false);
      setAttemptCount(0);

      let loadedSession: PracticeSessionData | null = null;
      let loadedPuzzle: PracticePuzzleData | null = null;

      try {
        const res = await practiceApi.startSession(targetTheme, 5);
        if (res.session && res.puzzle) {
          loadedSession = res.session;
          loadedPuzzle = res.puzzle;
        }
      } catch (err) {
        console.warn('Backend practiceApi session unavailable, falling back to drill catalog:', err);
      }

      // If backend didn't return a puzzle for the requested theme, use our curated drill catalog
      if (!loadedPuzzle) {
        const matched = ALL_PRACTICE_DRILLS.find((d) => d.theme === targetTheme) || ALL_PRACTICE_DRILLS[0];
        loadedPuzzle = matched.puzzle;
        loadedSession = {
          id: `local-session-${Date.now()}`,
          playerId: userProfile.id,
          sessionType: 'THEME_DRILL',
          targetTheme: matched.theme,
          plannedItemCount: 1,
          completedItemCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          averageDifficulty: matched.rating,
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString()
        };
      }

      setActiveSession(loadedSession);
      setCurrentPuzzle(loadedPuzzle);

      if (loadedPuzzle) {
        chess.load(loadedPuzzle.fen);
        setBoardFen(loadedPuzzle.fen);
        setRenderTrigger((c) => c + 1);
        startTimeRef.current = Date.now();
      }
    } catch (err: any) {
      console.error('Failed to start practice session:', err);
      setError(err?.message || 'Failed to initialize training session');
    } finally {
      setLoading(false);
    }
  };

  // Handle player's piece move on the chessboard
  const handleBoardMove = async ({ from, to }: { from: string; to: string }): Promise<boolean> => {
    if (!activeSession || !currentPuzzle || isSolved || isSubmitting) {
      return false;
    }

    try {
      // Validate move legally via chess.js
      const legalMove = chess.move({
        from: from as Square,
        to: to as Square,
        promotion: 'q'
      });

      if (!legalMove) {
        return false;
      }

      // Update board visually
      setBoardFen(chess.fen());
      setRenderTrigger((c) => c + 1);

      // Check submission against local drill or backend API
      setIsSubmitting(true);
      const timeSpent = Math.max(500, Date.now() - startTimeRef.current);

      if (activeSession.id.startsWith('local-session-')) {
        const drillDef = ALL_PRACTICE_DRILLS.find((d) => d.puzzle.id === currentPuzzle.id) ||
          ALL_PRACTICE_DRILLS.find((d) => d.theme === currentPuzzle.theme);
        const expectedSol = drillDef?.puzzle.solutionMoves[0];
        const isMatch = expectedSol ? (expectedSol.san === legalMove.san || (expectedSol.from === from && expectedSol.to === to)) : true;

        if (isMatch) {
          sounds.playVictory();
          setIsSolved(true);
          const feedbackMsg = currentPuzzle.tacticalExplanation || 'Brilliant move! You found the key solution to this drill.';
          setAttemptFeedback(feedbackMsg);
          confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });

          setActiveSession((prev) =>
            prev ? { ...prev, completedItemCount: 1, correctCount: 1, status: 'COMPLETED' } : null
          );
          setSessionCompletedSummary({
            theme: currentPuzzle.theme,
            completedItems: 1,
            accuracy: 100,
            masteryScore: 85
          });
        } else {
          sounds.playCheck();
          setAttemptCount((c) => c + 1);
          setAttemptFeedback('Not quite the optimal continuation for this drill. Review the hints and try again!');
          setTimeout(() => {
            if (currentPuzzle) {
              chess.load(currentPuzzle.fen);
              setBoardFen(currentPuzzle.fen);
              setRenderTrigger((c) => c + 1);
            }
          }, 900);
        }
        return true;
      }

      const attemptRes = await practiceApi.recordAttempt(activeSession.id, {
        puzzleId: currentPuzzle.id,
        moveSan: legalMove.san,
        from,
        to,
        promotion: legalMove.promotion,
        timeSpentMs: timeSpent,
        usedHint: usedHintInCurrentPuzzle,
        hintCount: activeHintLevel
      });

      setLastAttemptResult(attemptRes);

      if (attemptRes.isCorrect) {
        sounds.playVictory();
        setIsSolved(true);
        setAttemptFeedback(attemptRes.feedback.message);
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });

        // Update active session counters
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                completedItemCount: attemptRes.completedItemCount,
                correctCount: attemptRes.correctCount,
                status: attemptRes.sessionStatus
              }
            : null
        );

        // Check if session completed
        if (attemptRes.sessionStatus === 'COMPLETED' || !attemptRes.nextPuzzle) {
          const comp = await practiceApi.completeSession(activeSession.id);
          setSessionCompletedSummary(comp.summary);
          loadDashboard();
        }
      } else {
        sounds.playCheck();
        setAttemptCount((c) => c + 1);
        setAttemptFeedback(attemptRes.feedback.message || 'Incorrect move. Look for the tactical idea!');
        // Reset board back to puzzle start position so player can retry
        setTimeout(() => {
          if (currentPuzzle) {
            chess.load(currentPuzzle.fen);
            setBoardFen(currentPuzzle.fen);
            setRenderTrigger((c) => c + 1);
          }
        }, 900);
      }

      return true;
    } catch (err: any) {
      console.error('Attempt submission error:', err);
      setAttemptFeedback(err?.message || 'Move verification failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance to next puzzle
  const handleNextPuzzle = () => {
    if (!lastAttemptResult?.nextPuzzle) {
      if (activeSession) {
        practiceApi.completeSession(activeSession.id).then((res) => {
          setSessionCompletedSummary(res.summary);
          loadDashboard();
        });
      }
      return;
    }

    const next = lastAttemptResult.nextPuzzle;
    setCurrentPuzzle(next);
    chess.load(next.fen);
    setBoardFen(next.fen);
    setIsSolved(false);
    setLastAttemptResult(null);
    setAttemptFeedback(null);
    setActiveHintLevel(0);
    setUsedHintInCurrentPuzzle(false);
    setRenderTrigger((c) => c + 1);
    startTimeRef.current = Date.now();
  };

  // Reveal progressive hints (Level 1: Tactical Theme, Level 2: Target piece/squares, Level 3: Solution Move)
  const handleRequestHint = () => {
    if (!currentPuzzle?.hints || currentPuzzle.hints.length === 0) return;
    setUsedHintInCurrentPuzzle(true);
    setActiveHintLevel((lvl) => Math.min(lvl + 1, currentPuzzle.hints.length));
  };

  const plan = dashboard?.todayPlan;
  const masteries = dashboard?.themeMasteries || [];

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="flex flex-col gap-2 pb-3 border-b border-surface-200">
          <div className="h-3 w-48 bg-surface-200 rounded" />
          <div className="h-7 w-80 bg-surface-300 rounded" />
          <div className="h-3 w-96 bg-surface-200 rounded" />
        </div>
        <div className="h-36 rounded-2xl bg-surface-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 rounded-xl bg-surface-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E222B]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Adaptive Practice & Mastery
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
            Personalized Tactical Training
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-2xl">
            Real-time adaptive practice generated directly from your games, weaknesses, and Leitner spaced-repetition schedules.
          </p>
        </div>

        {activeSession && currentPuzzle && (
          <button
            onClick={() => {
              setActiveSession(null);
              setCurrentPuzzle(null);
              loadDashboard();
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-[#262B36] bg-[#14171E] text-zinc-300 hover:text-white hover:bg-[#1A1E27] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Switch Drill</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Return to Game Review Banner if requested */}
      {returnToUrl && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Targeted training drill linked to your game review{extractQueryTheme() ? ` (${extractQueryTheme()})` : ''}.
            </span>
          </div>
          <button
            onClick={() => onNavigate(returnToUrl)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Game Review</span>
          </button>
        </div>
      )}

      {/* ACTIVE TRAINING SESSION VIEW */}
      {activeSession && currentPuzzle && !sessionCompletedSummary ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Training Session Header Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1F2B] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-[#273042]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-[#1A1E27] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#262B36] uppercase tracking-wider">
                    {activeSession.sessionType.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                    Target Theme: <strong className="text-slate-900 dark:text-white">{currentPuzzle.theme}</strong>
                  </span>
                  {activeSession.sessionType === 'WEAKNESS_REVIEW' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30">
                      Spaced Review
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{currentPuzzle.title}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    (Rating: {currentPuzzle.rating} · {currentPuzzle.difficulty})
                  </span>
                </h2>
              </div>

              {/* Progress counter */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#14171E] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E222B]">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block">Session Progress</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {activeSession.completedItemCount} / {activeSession.plannedItemCount} Solved
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#81B64C]/10 border border-[#81B64C]/30 flex items-center justify-center font-black text-xs text-[#81B64C]">
                  {Math.round(((activeSession.completedItemCount) / activeSession.plannedItemCount) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Board & Coach Feedback Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.2fr)_minmax(320px,_1fr)] gap-6 items-start">
            {/* Chess Board Area */}
            <div className="w-full max-w-[460px] mx-auto bg-white dark:bg-[#1A1F2B] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#273042] shadow-sm">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                  <span className={`w-2.5 h-2.5 rounded-full ${currentPuzzle.playerColor === 'w' ? 'bg-white border-2 border-slate-400' : 'bg-slate-900 border border-slate-700'}`} />
                  <span>{currentPuzzle.playerColor === 'w' ? 'White' : 'Black'} to move & win</span>
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-[#1A1E27] px-2 py-0.5 rounded border border-slate-200 dark:border-[#262B36]">
                  Theme: {currentPuzzle.theme}
                </span>
              </div>

              <ChessBoard
                chess={chess}
                orientation={currentPuzzle.playerColor === 'w' ? 'white' : 'black'}
                isInteractive={!isSolved && !isSubmitting}
                onMovePiece={handleBoardMove}
              />
            </div>

            {/* Tactical Feedback, Hints & Progression Panel */}
            <div className="space-y-4">
              {/* Attempt Result / Feedback Banner */}
              {attemptFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 animate-in fade-in zoom-in-95 ${
                    isSolved
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                  }`}
                >
                  {isSolved ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {isSolved ? 'Tactical Breakthrough!' : 'Tactical Mistake'}
                    </p>
                    <p>{attemptFeedback}</p>
                    {isSolved && currentPuzzle.tacticalExplanation && (
                      <p className="text-[11px] text-emerald-400/90 font-medium pt-1 border-t border-emerald-800/50 mt-1.5">
                        {currentPuzzle.tacticalExplanation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Next Puzzle Action Button */}
              {isSolved && (
                <button
                  onClick={handleNextPuzzle}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Next Puzzle</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Progressive Hints Section */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Coach Hints</span>
                  </div>
                  {!isSolved && activeHintLevel < (currentPuzzle.hints?.length || 0) && (
                    <button
                      onClick={handleRequestHint}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Need a hint? (Level {activeHintLevel + 1})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {activeHintLevel === 0 && !isSolved && (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                    Try solving without hints for maximum theme mastery gain (+10 points). Request progressive hints if you are stuck.
                  </p>
                )}

                {/* Display unlocked hints */}
                {currentPuzzle.hints?.slice(0, activeHintLevel).map((h) => (
                  <div key={h.level} className="p-2.5 rounded-lg bg-emerald-50 dark:bg-[#14171E] border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                      <span>Hint {h.level}: {h.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                      {h.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coach Insight */}
              {currentPuzzle.coachInsight && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Grandmaster Principle</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 italic">
                    "{currentPuzzle.coachInsight}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* SESSION COMPLETED MODAL / CARD */}
      {sessionCompletedSummary && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-emerald-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Training Session Completed!
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Your practice results have updated your Player Memory, Theme Mastery, and Leitner Spaced-Repetition intervals.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold block">Theme</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{sessionCompletedSummary.theme}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold block">Accuracy</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{sessionCompletedSummary.accuracy}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold block">Mastery Score</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{sessionCompletedSummary.masteryScore}/100</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {returnToUrl && (
              <button
                onClick={() => onNavigate(returnToUrl)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Return to Game Review
              </button>
            )}
            <button
              onClick={() => onNavigate('/progress')}
              className="px-5 py-2.5 rounded-xl bg-[#161922] hover:bg-[#1E2330] text-zinc-200 border border-[#262B36] text-xs font-bold transition-colors"
            >
              View Updated Progress
            </button>
            <button
              onClick={() => {
                setSessionCompletedSummary(null);
                startNewSession();
              }}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-md"
            >
              Start Next Practice
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD OVERVIEW (When no active session in progress) */}
      {!activeSession && !sessionCompletedSummary && (
        <div className="space-y-6">
          {/* Resume In-Progress Session Banner */}
          {dashboard?.activeSession && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300">Session In Progress</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    You have an unfinished {dashboard.activeSession.sessionType.replace('_', ' ').toLowerCase()} session ({dashboard.activeSession.completedItemCount}/{dashboard.activeSession.plannedItemCount} puzzles done). Resume to continue earning mastery points.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await practiceApi.completeSession(dashboard.activeSession!.id);
                      await loadDashboard();
                    } catch (err: any) {
                      setError(err?.message || 'Failed to close session');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-[#262B36] text-zinc-400 hover:text-white hover:bg-[#1A1E27] text-xs font-semibold transition-colors"
                >
                  Complete Early
                </button>
                <button
                  onClick={() => startNewSession(dashboard.activeSession!.targetTheme)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Resume Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Today's Adaptive Training Recommendation Card */}
          {plan && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1A1F2B] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-[#273042] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-white/10 text-emerald-800 dark:text-white border border-emerald-200 dark:border-white/20 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Today's Adaptive Plan
                  </span>
                  {plan.isSpacedReview && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30">
                      Spaced Review Due
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Primary Focus: <span className="text-[#81B64C] dark:text-emerald-400">{plan.themeTitle}</span>
                </h2>

                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {plan.reason}
                </p>

                <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 dark:text-zinc-400">
                  <span>Target Difficulty: <strong className="text-slate-900 dark:text-white">{plan.initialDifficulty}</strong></span>
                  <span>•</span>
                  <span>Items: <strong className="text-slate-900 dark:text-white">{plan.plannedItemCount} Puzzles</strong></span>
                  <span>•</span>
                  <span>Priority Need: <strong className="text-emerald-600 dark:text-emerald-400">{(plan.priorityScore * 10).toFixed(1)}/10</strong></span>
                </div>
              </div>

              <button
                onClick={() => startNewSession(plan.targetTheme)}
                className="chess-btn-green self-start md:self-center px-6 py-3.5 rounded-xl text-white font-black text-sm shadow-sm transition-all flex items-center gap-2 shrink-0 group cursor-pointer"
              >
                <span>Launch Today's Training</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* Chess Drills Catalog & Category Filter Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#81B64C]" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Chess Practice Drills & Training Modules
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Master all phases: Openings, Middlegames, Technical Endgames, and Combinations.
                </p>
              </div>

              {/* Rating Tier Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mr-1 hidden md:inline">Rating:</span>
                {[
                  { id: 'ALL', label: 'All Ratings' },
                  { id: 'NOVICE', label: 'Novice (400-900)' },
                  { id: 'INTERMEDIATE', label: 'Intermediate (900-1400)' },
                  { id: 'ADVANCED', label: 'Advanced (1400-1800)' },
                  { id: 'MASTER', label: 'Master (1800+)' }
                ].map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedRatingTier(tier.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedRatingTier === tier.id
                        ? 'bg-[#81B64C] text-white shadow-xs'
                        : 'bg-white dark:bg-[#161922] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#262B36] hover:bg-slate-100 dark:hover:bg-[#1E2330]'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'All Practice Drills', count: ALL_PRACTICE_DRILLS.length },
                { id: 'OPENINGS', label: 'Openings Mastery', count: ALL_PRACTICE_DRILLS.filter(d => d.category === 'OPENINGS').length },
                { id: 'MIDDLEGAME', label: 'Middlegame Strategy', count: ALL_PRACTICE_DRILLS.filter(d => d.category === 'MIDDLEGAME').length },
                { id: 'ENDGAME', label: 'Endgame Technique', count: ALL_PRACTICE_DRILLS.filter(d => d.category === 'ENDGAME').length },
                { id: 'TACTICS', label: 'Tactical Combinations', count: ALL_PRACTICE_DRILLS.filter(d => d.category === 'TACTICS').length }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'bg-white dark:bg-[#141822] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#273042] hover:bg-slate-100 dark:hover:bg-[#1C2230]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900 font-black'
                      : 'bg-slate-100 dark:bg-[#202738] text-slate-500 dark:text-zinc-400'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Drill Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredDrills.map((drill) => {
                const mastery = masteries.find((m) => m.theme === drill.theme);
                const score = mastery?.masteryScore ?? 50;
                const accuracy = mastery?.accuracy ?? 0;
                const attempts = mastery?.attemptCount ?? 0;
                const isDue = mastery?.isDueForReview;
                const isUnstarted = attempts === 0;

                const tier = isUnstarted
                  ? { label: 'Not started', badge: 'bg-slate-100 dark:bg-[#161922] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#262B36]', bar: 'bg-slate-300 dark:bg-zinc-700', text: 'text-slate-400 dark:text-zinc-500' }
                  : score >= 70
                  ? { label: 'Proficient', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60', bar: 'bg-[#81B64C]', text: 'text-emerald-600 dark:text-emerald-400' }
                  : score >= 40
                  ? { label: 'Developing', badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
                  : { label: 'Needs Focus', badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };

                return (
                  <div
                    key={drill.theme}
                    onClick={() => startNewSession(drill.theme)}
                    className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 hover:border-[#81B64C] dark:hover:border-zinc-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-[#161922] text-slate-700 dark:text-zinc-300 uppercase border border-slate-200 dark:border-[#262B36]">
                          {drill.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isDue && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              Review Due
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tier.badge}`}>
                            {drill.rating} • {drill.ratingTier}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#81B64C] dark:group-hover:text-emerald-400 transition-colors mb-1">
                        {drill.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug mb-3 line-clamp-2">
                        {drill.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#1E222B]">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                        <span>Mastery</span>
                        <span className={`font-bold ${tier.text}`}>
                          {isUnstarted ? '—' : `${score.toFixed(0)}/100`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#161922] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${tier.bar} rounded-full transition-all duration-300`}
                          style={{ width: `${isUnstarted ? 3 : Math.min(100, Math.max(5, score))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 mt-2">
                        <span>{attempts > 0 ? `${attempts} practiced` : 'Click to launch drill'}</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">{attempts > 0 ? `${accuracy}% acc` : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDrills.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-[#1A1F2B] rounded-2xl border border-slate-200 dark:border-[#273042]">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                  No drills matched the selected category and rating filters.
                </p>
                <button
                  onClick={() => { setSelectedCategory('ALL'); setSelectedRatingTier('ALL'); }}
                  className="mt-2 text-xs font-bold text-[#81B64C] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
