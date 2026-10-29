import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import { PlayerProfile } from '../types/user';
import { playerApi, PlayerProgressData } from '../services/api/playerApi';
import { learningService } from '../services/learningService';
import { useAuth } from '../auth/AuthProvider';
import { ChessBoard } from '../components/chess/ChessBoard';
import { sounds } from '../utils/soundEffects';
import { PieceType } from '../types/chess';
import {
  Play,
  BookOpen,
  Zap,
  Target,
  ArrowRight,
  CheckCircle2,
  Flame,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  Award,
  Swords,
  Trophy,
  Check,
  Star,
  Lock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface HomePageProps {
  userProfile: PlayerProfile;
  onNavigate: (route: string) => void;
}

// Initial FEN for the Royal Knight Fork tactical demonstration
const HERO_PUZZLE_FEN = 'r1b1kb1r/pp3ppp/2n1pn2/1N1p4/3P4/4PN2/PP3PPP/R1BQKB1R w KQkq - 0 8';

export const HomePage: React.FC<HomePageProps> = ({ userProfile, onNavigate }) => {
  const { user } = useAuth();
  const isApiMode = import.meta.env.VITE_DATA_MODE === 'api';
  const [progressData, setProgressData] = useState<PlayerProgressData | null>(null);

  // Curriculum progress state
  const [lessonProgress, setLessonProgress] = useState<{
    currentTitle: string;
    currentDesc: string;
    completedCount: number;
    totalCount: number;
    percent: number;
    isUnstarted: boolean;
  }>({
    currentTitle: 'Board Geometry & Coordinates',
    currentDesc: 'Lesson 1: Master ranks, files, diagonals, and algebraic notation.',
    completedCount: 0,
    totalCount: 4,
    percent: 0,
    isUnstarted: true
  });
  const [loadingLessons, setLoadingLessons] = useState(true);

  // ---------------------------------------------------------------------------
  // Interactive Master Challenge Arena State
  // ---------------------------------------------------------------------------
  const [demoChess, setDemoChess] = useState<Chess>(() => new Chess(HERO_PUZZLE_FEN));
  const [demoState, setDemoState] = useState<'initial' | 'forked' | 'captured'>('initial');
  const [demoExplanationOpen, setDemoExplanationOpen] = useState(false);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>(['b5', 'c7']);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [showCelebrationBadge, setShowCelebrationBadge] = useState(false);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#FFFFFF', '#D4D4D8', '#10B981', '#F59E0B']
      });
    } catch {
      // fallback
    }
  };

  // Reset interactive stage
  const handleResetDemo = useCallback(() => {
    setDemoChess(new Chess(HERO_PUZZLE_FEN));
    setDemoState('initial');
    setDemoExplanationOpen(false);
    setHighlightedSquares(['b5', 'c7']);
    setLastMove(null);
    setShowCelebrationBadge(false);
  }, []);

  // Handle refutation move (1. Nc7+!)
  const handlePlayFork = useCallback(() => {
    const c = new Chess(HERO_PUZZLE_FEN);
    const m = c.move({ from: 'b5', to: 'c7' });
    if (m) {
      sounds.playMove();
      sounds.playCheck();
      setDemoChess(c);
      setDemoState('forked');
      setLastMove({ from: 'b5', to: 'c7' });
      setHighlightedSquares(['c7', 'e8', 'a8']);
      setShowCelebrationBadge(true);
      triggerConfetti();
    }
  }, []);

  // Handle follow-up capture (1... Kd8 2. Nxa8)
  const handlePlayCapture = useCallback(() => {
    const c = new Chess(HERO_PUZZLE_FEN);
    c.move({ from: 'b5', to: 'c7' });
    c.move('Kd8');
    const m2 = c.move({ from: 'c7', to: 'a8' });
    if (m2) {
      sounds.playCapture();
      sounds.playVictory();
      setDemoChess(c);
      setDemoState('captured');
      setLastMove({ from: 'c7', to: 'a8' });
      setHighlightedSquares(['a8', 'd8']);
      triggerConfetti();
    }
  }, []);

  // Handle board move interaction from user dragging/clicking
  const handleDemoMovePiece = useCallback((move: { from: string; to: string; promotion?: PieceType }) => {
    if (demoState === 'initial' && move.from === 'b5' && move.to === 'c7') {
      handlePlayFork();
      return true;
    }
    if (demoState === 'forked' && move.from === 'c7' && move.to === 'a8') {
      handlePlayCapture();
      return true;
    }
    try {
      const c = new Chess(demoChess.fen());
      const res = c.move({ from: move.from as Square, to: move.to as Square });
      if (res) {
        if (res.captured) sounds.playCapture();
        else sounds.playMove();
        setDemoChess(c);
        setLastMove({ from: move.from, to: move.to });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }, [demoState, demoChess, handlePlayFork, handlePlayCapture]);

  // Load progress and curriculum
  useEffect(() => {
    if (!isApiMode) return;
    playerApi.getProgress().then(setProgressData).catch(() => {/* fallback to mock */});
  }, [isApiMode]);

  useEffect(() => {
    learningService.getCurriculum().then((modules) => {
      const allLessons = modules.flatMap((m) => m.lessons);
      const totalCount = allLessons.length || 4;

      const apiCompleted = (isApiMode && progressData?.profile?.lessonsCompleted !== undefined)
        ? progressData.profile.lessonsCompleted
        : null;

      const localCompleted = allLessons.filter((l) => l.completed).length;
      const completedCount = apiCompleted !== null ? apiCompleted : localCompleted;
      const percent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
      const isUnstarted = completedCount === 0;

      const activeLesson = allLessons.find((l) => !l.completed) || allLessons[0];
      const lessonIndex = activeLesson ? allLessons.indexOf(activeLesson) + 1 : 1;

      setLessonProgress({
        currentTitle: activeLesson ? activeLesson.title : 'Board Geometry & Coordinates',
        currentDesc: activeLesson ? `Lesson ${lessonIndex} of ${totalCount}: ${activeLesson.description}` : 'Begin your chess curriculum foundations.',
        completedCount,
        totalCount,
        percent,
        isUnstarted
      });
      setLoadingLessons(false);
    }).catch(() => {
      setLoadingLessons(false);
    });
  }, [isApiMode, progressData?.profile?.lessonsCompleted]);

  // Quick match difficulty state
  const [selectedDifficulty, setSelectedDifficulty] = useState<'casual' | 'intermediate' | 'master'>('intermediate');
  const [selectedTime, setSelectedTime] = useState<'3+0' | '10+0' | '15+10'>('10+0');

  // Coach memory details
  const topWeaknesses = progressData?.weaknesses?.filter(w => w.status === 'ACTIVE').slice(0, 3)
    ?? userProfile.weaknesses?.slice(0, 3).map(w => ({
        theme: w.type || w.title,
        category: w.type || 'Tactics',
        occurrenceCount: w.occurrences || 2,
        confidence: 0.88,
        status: 'ACTIVE' as const
      })) ?? [];

  const coachTip = userProfile.coachMemory?.lastCoachingTip ?? 'Control the central squares (d4, d5, e4, e5) before launching tactical wing attacks.';

  // Interactive training checklist
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'Complete Daily Tactical Challenge', done: true, route: '/puzzles', xp: '+50 XP' },
    { id: 2, task: 'Play 1 Match with AI Coach Feedback', done: false, route: '/play', xp: '+100 XP' },
    { id: 3, task: 'Study Next Curriculum Lesson', done: false, route: '/learn', xp: '+75 XP' },
    { id: 4, task: 'Review Game Blunders in Analysis', done: false, route: '/analyze', xp: '+40 XP' }
  ]);

  const toggleChecklist = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        const next = !item.done;
        if (next) sounds.playMove();
        return { ...item, done: next };
      }
      return item;
    }));
  };

  const userLevel = Math.max(1, Math.floor(userProfile.rating / 100));
  const eloToNextLevel = (userLevel * 100 + 100) - userProfile.rating;
  const levelProgress = Math.min(100, Math.max(0, 100 - eloToNextLevel));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* --------------------------------------------------------------------- */}
      {/* 1. Daily Mission Hub: Inspiring Welcome Banner & Quick Action Launch   */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-gradient-to-r from-slate-900 via-[#151A26] to-[#1E2536] text-white border border-slate-700/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#81B64C]/20 text-[#81B64C] dark:text-[#9DD362] border border-[#81B64C]/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Daily Training Hub
            </span>
            <span className="text-xs text-zinc-400">
              Today's Session Ready
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Welcome back, {userProfile.name} 👋
          </h1>
          <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
            Ready for your daily chess workout? Complete your tactical missions, sharpen your openings, or challenge an AI bot.
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              Rating: <span className="text-emerald-400 tabular-nums">{userProfile.rating} Elo</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-bold text-amber-300">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              {userProfile.streakDays} Day Streak
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Target className="w-4 h-4 text-blue-400" />
              Rank {userLevel} Tactician
            </span>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative">
          <button
            onClick={() => onNavigate('/play')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Play vs Bot</span>
          </button>
          <button
            onClick={() => onNavigate('/puzzles')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily Puzzle</span>
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 2. Hero: Daily Master Challenge Arena (Vibrant Chess.com Split)        */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Tactical Context */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#81B64C]/15 border border-[#81B64C]/30 text-[#588329] dark:text-[#9DD362] text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#81B64C]" />
              <span>Daily Coach Masterclass</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-tight">
              Spot the blunder. <br />
              <span className="text-[#81B64C] dark:text-[#9DD362]">Calculate the refutation.</span>
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Black just played <strong className="text-rose-600 dark:text-rose-400 font-bold">...d5??</strong> leaving the King and Rook vulnerable to a double attack. Can you execute the refutation?
            </p>

            {/* Coach Voice Box */}
            <div className="bg-slate-50 dark:bg-[#222938] border border-slate-200 dark:border-[#2E374A] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#81B64C] animate-pulse" />
                  Coach Sophia (AI Grandmaster)
                </span>
                <span className="font-black text-[#588329] dark:text-[#9DD362] tabular-nums">
                  {demoState === 'initial' ? '+3.8 White Winning' : demoState === 'forked' ? '+5.2 Material Fork' : '+7.4 Decisive'}
                </span>
              </div>

              {demoState === 'initial' && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  "Notice how Black's pawn push abandoned the <strong className="text-slate-900 dark:text-white font-bold">c7 outpost</strong>. Your Knight on b5 can jump to c7, delivering check and skewering the Rook."
                </p>
              )}

              {demoState === 'forked' && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed font-bold">
                  "Exact move! <strong className="text-emerald-800 dark:text-emerald-200">1. Nc7+!</strong> checks the King while attacking the undefended Rook on a8. Black is forced to forfeit castling rights."
                </p>
              )}

              {demoState === 'captured' && (
                <p className="text-xs text-emerald-700 dark:text-emerald-200 leading-relaxed font-bold">
                  "Decisive follow up: <strong className="text-emerald-800 dark:text-emerald-100">2. Nxa8</strong> won a full Rook. White commands an overwhelming +5 material lead."
                </p>
              )}

              {demoExplanationOpen && (
                <div className="pt-3 border-t border-slate-200 dark:border-[#2E374A] text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">Tactical Principle: Geometric Outpost</div>
                  <p>
                    A vacated square is a permanent structural concession. Knights control non-adjacent opposite-color squares with maximum efficiency.
                  </p>
                </div>
              )}
            </div>

            {/* Tactical Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {demoState === 'initial' && (
                <button
                  onClick={handlePlayFork}
                  className="chess-btn-green px-5 py-2.5 rounded-xl text-xs flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Play Refutation (1. Nc7+!)</span>
                </button>
              )}

              {demoState === 'forked' && (
                <button
                  onClick={handlePlayCapture}
                  className="chess-btn-blue px-5 py-2.5 rounded-xl text-xs flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Follow Up (1... Kd8 2. Nxa8)</span>
                </button>
              )}

              <button
                onClick={() => setDemoExplanationOpen(!demoExplanationOpen)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#252C3B] dark:hover:bg-[#2E374A] text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {demoExplanationOpen ? 'Hide Principle' : 'Tactical Guide'}
              </button>

              <button
                onClick={handleResetDemo}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#252C3B] dark:hover:bg-[#2E374A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Reset puzzle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Authentic Board Container */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {showCelebrationBadge && (
              <div className="mb-2 px-3 py-1 rounded-full bg-[#81B64C] text-white font-black text-xs flex items-center gap-1.5 shadow-md animate-in fade-in">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>+50 XP TACTICAL SOLVED</span>
              </div>
            )}

            <div className="w-full max-w-[420px] aspect-square rounded-2xl p-1.5 bg-[#403D39] shadow-board border-4 border-[#312E2B]">
              <ChessBoard
                chess={demoChess}
                orientation="white"
                isInteractive={true}
                highlightedSquares={highlightedSquares}
                lastMove={lastMove}
                onMovePiece={handleDemoMovePiece}
                className="w-full h-full rounded-xl overflow-hidden"
              />
            </div>

            <div className="flex items-center justify-between w-full max-w-[420px] mt-3 px-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#81B64C]" />
                Tactical Problem · White to move
              </span>
              <button
                onClick={() => onNavigate('/puzzles')}
                className="text-[#81B64C] dark:text-[#9DD362] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Browse All Puzzles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. Vibrant Curriculum Roadmap (Module Cards with Star Metrics)       */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
              Curriculum Path
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display">
              Mastery Modules
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
              Structured step-by-step curriculum from basic geometry to grandmaster calculation
            </p>
          </div>

          <button
            onClick={() => onNavigate('/learn')}
            className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800/80 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>View All Lessons ({lessonProgress.completedCount}/{lessonProgress.totalCount})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Clean Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              moduleNum: '01',
              title: 'Board Geometry & Notation',
              desc: 'Ranks, files, diagonals, and algebraic square notation.',
              status: lessonProgress.completedCount > 0 ? 'completed' : 'current',
              stars: 3
            },
            {
              moduleNum: '02',
              title: 'Forks, Pins & Skewers',
              desc: 'Double attack geometry, outposts, and tactical traps.',
              status: lessonProgress.completedCount >= 2 ? 'completed' : lessonProgress.completedCount === 1 ? 'current' : 'locked',
              stars: 2
            },
            {
              moduleNum: '03',
              title: 'King Safety & Sacrifices',
              desc: 'Shield defenses, Greek Gift bishop sacrifices, and mating nets.',
              status: lessonProgress.completedCount >= 3 ? 'completed' : 'locked',
              stars: 0
            },
            {
              moduleNum: '04',
              title: 'Endgames & Lucena Position',
              desc: 'Opposition, pawn promotion, and rook bridge building.',
              status: lessonProgress.completedCount >= 4 ? 'completed' : 'locked',
              stars: 0
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('/learn')}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                item.status === 'completed'
                  ? 'bg-emerald-50/60 dark:bg-[#16251D] border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500'
                  : item.status === 'current'
                  ? 'bg-white dark:bg-[#1F2736] border-[#81B64C] dark:border-[#81B64C] shadow-md ring-2 ring-[#81B64C]/20'
                  : 'bg-slate-50 dark:bg-[#141822] border-slate-200 dark:border-[#222836] opacity-60 hover:opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    MODULE {item.moduleNum}
                  </span>

                  {item.status === 'completed' ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  ) : item.status === 'current' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#81B64C] text-white font-black text-[9px] uppercase tracking-wider shadow-2xs">
                      Current
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#273042] flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1 text-amber-500">
                  {item.status === 'completed' ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.status === 'current' ? 'In Progress' : 'Locked'}
                    </span>
                  )}
                </div>

                <span className="text-[#81B64C] dark:text-[#9DD362] flex items-center gap-1 text-[11px]">
                  {item.status === 'completed' ? 'Review' : item.status === 'current' ? 'Resume' : 'Preview'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 4. Split Action Section: Play AI Coach + Weakness Radar               */}
      {/* --------------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Play AI Coach (Cols 1-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#81B64C] uppercase tracking-wider block mb-0.5">
                  Live Match Arena
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  Play Against AI Coach
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Real-time move explanation with post-match blunder review
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-black border border-emerald-300 dark:border-emerald-800">
                Stockfish 19 Ready
              </span>
            </div>

            {/* Skill Level Selection */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Opponent Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'casual', label: 'Casual', elo: '~800' },
                  { id: 'intermediate', label: 'Club Player', elo: '~1400' },
                  { id: 'master', label: 'Grandmaster', elo: '~2000' }
                ].map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedDifficulty(tier.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedDifficulty === tier.id
                        ? 'bg-[#81B64C] text-white font-black border-[#588329] shadow-sm'
                        : 'bg-slate-50 dark:bg-[#222938] border-slate-200 dark:border-[#2D3648] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{tier.label}</div>
                    <div className={`text-[10px] mt-0.5 font-semibold ${selectedDifficulty === tier.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {tier.elo} Elo
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Control Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Time Format
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: '3+0', label: '3 min Blitz' },
                  { id: '10+0', label: '10 min Rapid' },
                  { id: '15+10', label: '15 | 10 Classical' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTime(t.id as any)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedTime === t.id
                        ? 'bg-[#81B64C] text-white border-[#588329] shadow-xs'
                        : 'bg-slate-50 dark:bg-[#222938] border-slate-200 dark:border-[#2D3648] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-slate-200 dark:border-[#273042] flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Selected: <strong className="text-slate-900 dark:text-white capitalize">{selectedDifficulty}</strong> ({selectedTime})
            </span>

            <button
              onClick={() => onNavigate('/play')}
              className="chess-btn-green px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-tactile"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Match</span>
            </button>
          </div>
        </div>

        {/* Weakness Radar (Cols 8-12) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">
                  Tactical Diagnostics
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  Weakness Radar
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Detected recurring tactical blunders in your games
                </p>
              </div>

              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                {topWeaknesses.length} Alerts
              </span>
            </div>

            <div className="space-y-2">
              {topWeaknesses.map((w, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate(`/practice?theme=${encodeURIComponent(w.theme)}`)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#222938] hover:bg-slate-100 dark:hover:bg-[#2A3344] border border-slate-200 dark:border-[#2D3648] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {w.theme.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {w.category || 'Calculation Blunder'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {w.occurrenceCount}x spotted
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>

            {/* Coach Habit Card */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-300 block">Coach Recommendation:</span>
              <p className="text-amber-800 dark:text-amber-200 leading-relaxed italic text-[11px]">
                "{coachTip}"
              </p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200 dark:border-[#273042] flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Personalized practice drills
            </span>
            <button
              onClick={() => onNavigate('/practice')}
              className="text-xs font-bold text-[#81B64C] dark:text-[#9DD362] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Train Weaknesses</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 5. Today's Training Protocol (High Energy Interactive Checklist)     */}
      {/* --------------------------------------------------------------------- */}
      <section className="bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
              Today’s Training Protocol
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Daily habit tracker to maintain your {userProfile.streakDays}-day streak
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#81B64C]/15 text-[#588329] dark:text-[#9DD362] text-xs font-black tabular-nums border border-[#81B64C]/30">
            {checklist.filter(c => c.done).length} / {checklist.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => onNavigate(item.route)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                item.done
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-50 dark:bg-[#222938] border-slate-200 dark:border-[#2D3648] hover:border-[#81B64C] text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => toggleChecklist(item.id, e)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    item.done
                      ? 'bg-[#81B64C] text-white font-bold shadow-2xs'
                      : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A1F2B] hover:border-[#81B64C]'
                  }`}
                >
                  {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div>
                  <span className={`text-xs font-bold block ${item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {item.task}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                    {item.xp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold">
                <span>Start</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
