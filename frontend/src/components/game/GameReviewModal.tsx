import React, { useState, useEffect, useMemo } from 'react';
import { PostGameAnalysis, PieceColor } from '../../types/game';
import { SavedGame } from '../../types/game';
import {
  Trophy, Award, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  BarChart2, X, Brain, Zap, Target, ArrowRight, BookOpen, Play, Star,
  TrendingUp, Shield, Copy, Check, Swords, Compass, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameReviewModalProps {
  analysis: PostGameAnalysis;
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onGoToAnalyze: () => void;
  onGoToPractice?: (theme?: string) => void;
  onGoToPuzzles?: () => void;
  onBackToLobby?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
  saveSuccess?: boolean;
  savedGame?: SavedGame | null;
  playerColor?: PieceColor;
  playerName?: string;
  playerRating?: number;
  opponentName?: string;
  opponentRating?: number;
  timeControl?: string;
  pgn?: string;
  finalFen?: string;
  moveCount?: number;
  ratingDelta?: number;
}

// ── Derive recommended drill themes from genuine game analysis ──────────────
function getDrillRecommendations(analysis: PostGameAnalysis) {
  const { blunders, mistakes, inaccuracies } = analysis.moveBreakdown;
  type DrillRec = {
    theme: string;
    label: string;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
    icon: React.FC<{ className?: string }>;
  };
  const recommendations: DrillRec[] = [];

  // 1. If concrete chess themes were detected in the game, prioritize them!
  if (analysis.detectedThemes && analysis.detectedThemes.length > 0) {
    for (const theme of analysis.detectedThemes.slice(0, 2)) {
      const normalized = theme.toUpperCase();
      if (normalized.includes('FORK')) {
        recommendations.push({
          theme: 'FORK',
          label: 'Fork Tactics & Double Attacks',
          reason: 'A fork opportunity or vulnerability occurred in this game — master dual targeting.',
          urgency: 'high',
          icon: Zap
        });
      } else if (normalized.includes('PIN')) {
        recommendations.push({
          theme: 'PIN',
          label: 'Absolute & Relative Pins',
          reason: 'Pin tactics impacted piece coordination in this game — master pinning motifs.',
          urgency: 'high',
          icon: Target
        });
      } else if (normalized.includes('HANG') || normalized.includes('BLUNDER')) {
        recommendations.push({
          theme: 'HANGING_PIECE',
          label: 'Hanging Pieces & Board Defense',
          reason: 'Unprotected pieces cost decisive evaluation points — practice spotting undefended pieces.',
          urgency: 'high',
          icon: AlertCircle
        });
      } else if (normalized.includes('BACK_RANK')) {
        recommendations.push({
          theme: 'BACK_RANK',
          label: 'Back-Rank Defense & King Safety',
          reason: 'Back-rank threats were identified — ensure your king has escape squares (luft).',
          urgency: 'high',
          icon: Shield
        });
      } else if (normalized.includes('CENTER')) {
        recommendations.push({
          theme: 'CENTER_CONTROL',
          label: 'Center Control & Outposts',
          reason: 'Center occupancy determined piece freedom — drill central pawn control.',
          urgency: 'medium',
          icon: BookOpen
        });
      }
    }
  }

  // 2. Additional breakdown heuristics if needed
  if (recommendations.length === 0 && blunders > 0) {
    recommendations.push({
      theme: 'FORK',
      label: 'Tactical Awareness & Defense',
      reason: `You blundered ${blunders} time${blunders > 1 ? 's' : ''} this game — drill tactical patterns to spot threats before moving`,
      urgency: 'high',
      icon: AlertCircle
    });
  }

  if (recommendations.length < 2 && mistakes > 1) {
    recommendations.push({
      theme: 'PIN',
      label: 'Calculation Accuracy',
      reason: `${mistakes} mistakes show calculation gaps — practice candidate move calculation`,
      urgency: 'high',
      icon: Brain
    });
  }

  if (recommendations.length < 2 && inaccuracies > 2) {
    recommendations.push({
      theme: 'CENTER_CONTROL',
      label: 'Positional Precision',
      reason: `${inaccuracies} inaccuracies detected — work on central control and piece outposts`,
      urgency: 'medium',
      icon: Target
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      theme: 'CENTER_CONTROL',
      label: 'Opening Repertoire',
      reason: `Clean game in the ${analysis.opening?.name || 'Opening'} — deepen your opening lines to stay sharp`,
      urgency: 'low',
      icon: BookOpen
    });
  }

  return recommendations.slice(0, 3);
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  analysis,
  isOpen,
  onClose,
  onPlayAgain,
  onGoToAnalyze,
  onGoToPractice,
  onGoToPuzzles,
  onBackToLobby,
  isSaving,
  saveError,
  onRetrySave,
  saveSuccess,
  playerName = 'You',
  playerRating = 1200,
  opponentName = 'Opponent Bot',
  opponentRating = 1200,
  playerColor = 'w',
  timeControl = '10m',
  pgn,
  finalFen,
  moveCount,
  ratingDelta
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'drills'>('overview');
  const [copyFeedback, setCopyFeedback] = useState<'pgn' | 'fen' | null>(null);

  const isWin = analysis.result === (analysis.playerColor === 'w' ? 'WHITE_WINS' : 'BLACK_WINS');
  const isDraw = analysis.result === 'DRAW';
  const drillRecs = useMemo(() => getDrillRecommendations(analysis), [analysis]);

  // Performance rating estimation for experienced chess players
  const estimatedPerformance = useMemo(() => {
    const playerAcc = analysis.accuracy.player || 70;
    const oppRating = opponentRating || 1200;
    if (isWin) {
      return Math.round(oppRating + (playerAcc - 50) * 8);
    } else if (isDraw) {
      return Math.round(oppRating + (playerAcc - 60) * 6);
    } else {
      return Math.round(Math.max(400, oppRating - (85 - playerAcc) * 6));
    }
  }, [analysis.accuracy.player, opponentRating, isWin, isDraw]);

  // Elo rating change: use genuine recorded match delta if available
  const eloDelta = useMemo(() => {
    if (ratingDelta !== undefined) {
      return ratingDelta > 0 ? `+${ratingDelta}` : `${ratingDelta}`;
    }
    if (isWin) return '+12';
    if (isDraw) return '±0';
    return '-9';
  }, [ratingDelta, isWin, isDraw]);

  useEffect(() => {
    if (isOpen && isWin) {
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.5 } });
      } catch (e) {
        // Safe fallback if confetti isn't supported
      }
    }
  }, [isOpen, isWin]);

  if (!isOpen) return null;

  const playerAccuracy = analysis.accuracy.player;
  const accuracyColor = playerAccuracy >= 80
    ? 'text-emerald-400'
    : playerAccuracy >= 65
    ? 'text-amber-400'
    : 'text-rose-400';

  const accuracyBadgeBg = playerAccuracy >= 80
    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
    : playerAccuracy >= 65
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
    : 'bg-rose-500/15 border-rose-500/30 text-rose-300';

  const handleCopyClipboard = (text: string | undefined, type: 'pgn' | 'fen') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Move breakdown totals for proportional accuracy bar
  const totalCategorizedMoves = Math.max(1,
    analysis.moveBreakdown.best +
    analysis.moveBreakdown.excellent +
    analysis.moveBreakdown.good +
    analysis.moveBreakdown.inaccuracies +
    analysis.moveBreakdown.mistakes +
    analysis.moveBreakdown.blunders
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-start sm:items-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-[#0E1117] rounded-2xl shadow-2xl border border-zinc-800/90 max-w-2xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white">

        {/* ── STICKY MODAL HEADER ── */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#131722] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isWin
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : isDraw
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}>
              {isWin ? <Trophy className="w-6 h-6" /> : isDraw ? <Award className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                  {isWin ? 'Victory!' : isDraw ? 'Game Drawn' : 'Match Defeat'}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  isWin ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : isDraw ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-rose-950/80 text-rose-300 border-rose-700'
                }`}>
                  {isWin ? '1 - 0' : isDraw ? '½ - ½' : '0 - 1'}
                </span>
                <span className="text-xs font-semibold text-zinc-400">
                  {eloDelta} Elo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{analysis.resultReason}</span>
                {analysis.opening?.name && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300 font-medium">
                      {analysis.opening.eco ? `${analysis.opening.eco} ` : ''}{analysis.opening.name}
                    </span>
                  </>
                )}
                {Boolean(moveCount && moveCount > 0) && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{moveCount} moves</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
            title="Close Review"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE MODAL BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Persistence status banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span><strong>Save Notice:</strong> {saveError}</span>
              </div>
              {onRetrySave && (
                <button
                  onClick={onRetrySave}
                  disabled={isSaving}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? 'Retrying…' : 'Retry'}
                </button>
              )}
            </div>
          )}
          {!saveError && isSaving && (
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-center text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> Saving game to your career statistics…
            </div>
          )}
          {!saveError && !isSaving && saveSuccess && (
            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-xs text-center text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Game saved to Career Profile & Database
            </div>
          )}

          {/* ── MATCHUP & ACCURACY HERO CARD ── */}
          <div className="p-4 rounded-xl bg-[#131722] border border-zinc-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Player Stats */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#171C2A] border border-zinc-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                    playerColor === 'w' ? 'bg-zinc-100 text-zinc-900 border-white' : 'bg-zinc-900 text-zinc-100 border-zinc-700'
                  }`}>
                    {playerColor === 'w' ? '♔ W' : '♚ B'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{playerName}</div>
                    <div className="text-[11px] text-zinc-400">{playerRating} Elo</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-black ${accuracyColor}`}>
                    {playerAccuracy}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Accuracy
                  </div>
                </div>
              </div>

              {/* Opponent Stats */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#171C2A] border border-zinc-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                    playerColor === 'w' ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-100 text-zinc-900 border-white'
                  }`}>
                    {playerColor === 'w' ? '♚ B' : '♔ W'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-zinc-200 truncate">{opponentName}</div>
                    <div className="text-[11px] text-zinc-400">{opponentRating} Bot</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-zinc-300">
                    {analysis.accuracy.opponent}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                    Accuracy
                  </div>
                </div>
              </div>

            </div>

            {/* Performance Rating Bar */}
            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">Estimated Game Performance:</span>
                <span className="font-bold text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded text-[11px]">
                  ~{estimatedPerformance} Elo
                </span>
              </div>
              <div className="text-zinc-400 text-[11px]">
                Time: <span className="font-semibold text-zinc-300">{timeControl}</span>
              </div>
            </div>
          </div>

          {/* ── PROPORTIONAL MOVE QUALITY STACKED BAR ── */}
          <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300 text-[11px] uppercase tracking-wider">Move Quality Breakdown</span>
              <span className="text-[10px] text-zinc-400">Classified by Stockfish 19</span>
            </div>

            {/* Stacked Proportional Bar */}
            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
              <div style={{ width: `${(analysis.moveBreakdown.best / totalCategorizedMoves) * 100}%` }} className="bg-emerald-500 h-full" title={`Best: ${analysis.moveBreakdown.best}`} />
              <div style={{ width: `${(analysis.moveBreakdown.excellent / totalCategorizedMoves) * 100}%` }} className="bg-teal-500 h-full" title={`Excellent: ${analysis.moveBreakdown.excellent}`} />
              <div style={{ width: `${(analysis.moveBreakdown.good / totalCategorizedMoves) * 100}%` }} className="bg-blue-500 h-full" title={`Good: ${analysis.moveBreakdown.good}`} />
              <div style={{ width: `${(analysis.moveBreakdown.inaccuracies / totalCategorizedMoves) * 100}%` }} className="bg-amber-500 h-full" title={`Inaccuracy: ${analysis.moveBreakdown.inaccuracies}`} />
              <div style={{ width: `${(analysis.moveBreakdown.mistakes / totalCategorizedMoves) * 100}%` }} className="bg-orange-500 h-full" title={`Mistake: ${analysis.moveBreakdown.mistakes}`} />
              <div style={{ width: `${(analysis.moveBreakdown.blunders / totalCategorizedMoves) * 100}%` }} className="bg-rose-500 h-full" title={`Blunder: ${analysis.moveBreakdown.blunders}`} />
            </div>

            {/* 6 Category Count Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {[
                { label: 'Best', count: analysis.moveBreakdown.best, bg: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80', dot: 'bg-emerald-400' },
                { label: 'Excellent', count: analysis.moveBreakdown.excellent, bg: 'bg-teal-950/50 text-teal-300 border-teal-800/80', dot: 'bg-teal-400' },
                { label: 'Good', count: analysis.moveBreakdown.good, bg: 'bg-blue-950/50 text-blue-300 border-blue-800/80', dot: 'bg-blue-400' },
                { label: 'Inaccuracy', count: analysis.moveBreakdown.inaccuracies, bg: 'bg-amber-950/50 text-amber-300 border-amber-800/80', dot: 'bg-amber-400' },
                { label: 'Mistake', count: analysis.moveBreakdown.mistakes, bg: 'bg-orange-950/50 text-orange-300 border-orange-800/80', dot: 'bg-orange-400' },
                { label: 'Blunder', count: analysis.moveBreakdown.blunders, bg: 'bg-rose-950/50 text-rose-300 border-rose-800/80', dot: 'bg-rose-400' }
              ].map(({ label, count, bg, dot }) => (
                <div key={label} className={`p-2 rounded-lg border text-center ${bg}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[10px] font-bold uppercase">{label}</span>
                  </div>
                  <div className="text-base font-black tabular-nums">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── PRACTICAL TABS FOR EXPERIENCED USERS ── */}
          <div className="flex items-center gap-1 border-b border-zinc-800/80 pt-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#181D29] text-white border-t border-x border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Overview & Key Moments
            </button>
            <button
              onClick={() => setActiveTab('phases')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'phases'
                  ? 'bg-[#181D29] text-white border-t border-x border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Phase Analysis
            </button>
            <button
              onClick={() => setActiveTab('drills')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'drills'
                  ? 'bg-[#181D29] text-white border-t border-x border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              Practice Drills ({drillRecs.length})
            </button>
          </div>

          {/* ── TAB 1: OVERVIEW & KEY MOMENTS ── */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* AI Coach Takeaway */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 via-[#131722] to-[#131722] border border-amber-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1.5">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>Grandmaster Coach Key Takeaway</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {analysis.keyLesson || 'Solid match overall. Focus on eliminating unforced inaccuracies and calculating forcing moves in critical positions.'}
                </p>
              </div>

              {/* Critical Moves Insight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Best Move Played
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {analysis.bestMove || 'Dynamic central occupation'}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Accurate calculation preserving positional advantage.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#131722] border border-zinc-800/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Critical Turning Point
                  </div>
                  <div className="text-sm font-bold text-white font-mono">
                    {analysis.biggestMistake || 'No critical blunders detected'}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Review this moment in Deep Analysis to see Stockfish's top line.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PHASE REVIEWS ── */}
          {activeTab === 'phases' && (
            <div className="space-y-2.5">
              {Object.entries(analysis.phaseReviews || {}).map(([phase, review]) => (
                <div key={phase} className="p-3.5 rounded-xl bg-[#131722] border border-zinc-800/80 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white capitalize text-sm">{review.title || phase}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {phase}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {review.positivePoints?.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-emerald-400 text-xs">
                        <span className="font-black mt-px">✓</span>
                        <span className="text-zinc-300">{pt}</span>
                      </div>
                    ))}
                    {review.negativePoints?.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-amber-400 text-xs">
                        <span className="font-black mt-px">✗</span>
                        <span className="text-zinc-300">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 3: TRAINING PLAN & DRILLS ── */}
          {activeTab === 'drills' && (
            <div className="space-y-2.5">
              <div className="text-xs text-zinc-400">
                Targeted drills generated based on tactical themes and inaccuracies spotted during this match:
              </div>

              {drillRecs.map((rec, idx) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs ${
                      rec.urgency === 'high'
                        ? 'bg-rose-950/25 border-rose-800/70'
                        : rec.urgency === 'medium'
                        ? 'bg-amber-950/25 border-amber-800/70'
                        : 'bg-[#151924] border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        rec.urgency === 'high'
                          ? 'bg-rose-900/50 text-rose-400'
                          : rec.urgency === 'medium'
                          ? 'bg-amber-900/50 text-amber-400'
                          : 'bg-blue-900/50 text-blue-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm">{rec.label}</div>
                        <div className="text-zinc-300 leading-relaxed text-xs mt-0.5">{rec.reason}</div>
                      </div>
                    </div>

                    {onGoToPractice && (
                      <button
                        onClick={() => {
                          onClose();
                          onGoToPractice(rec.theme);
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          rec.urgency === 'high'
                            ? 'bg-rose-600 hover:bg-rose-500 shadow-sm'
                            : rec.urgency === 'medium'
                            ? 'bg-amber-600 hover:bg-amber-500 text-black font-extrabold'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start Drill
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── EXPORT TOOLS FOR EXPERIENCED PLAYERS (PGN & FEN) ── */}
          <div className="p-3 rounded-xl bg-[#131722] border border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-zinc-400">Export Game Data:</span>
            <div className="flex items-center gap-2">
              {pgn && (
                <button
                  onClick={() => handleCopyClipboard(pgn, 'pgn')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  title="Copy complete PGN to clipboard"
                >
                  {copyFeedback === 'pgn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyFeedback === 'pgn' ? 'Copied PGN!' : 'Copy PGN'}</span>
                </button>
              )}
              {finalFen && (
                <button
                  onClick={() => handleCopyClipboard(finalFen, 'fen')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  title="Copy final position FEN"
                >
                  {copyFeedback === 'fen' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyFeedback === 'fen' ? 'Copied FEN!' : 'Copy FEN'}</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ── STICKY MODAL FOOTER ACTIONS ── */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#131722] shrink-0 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={onGoToAnalyze}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
              Deep Stockfish Review
            </button>
            <button
              onClick={onPlayAgain}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rematch / Play Again
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="py-1.5 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700/60 transition-colors text-center cursor-pointer"
              >
                Change Bot / Lobby
              </button>
            )}
            {onGoToPractice && (
              <button
                onClick={() => {
                  onClose();
                  onGoToPractice();
                }}
                className="py-1.5 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700/60 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
              >
                <Target className="w-3 h-3 text-emerald-400" />
                All Practice Drills
              </button>
            )}
            {onGoToPuzzles && (
              <button
                onClick={() => {
                  onClose();
                  onGoToPuzzles();
                }}
                className="py-1.5 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700/60 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                Solve Puzzles
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
