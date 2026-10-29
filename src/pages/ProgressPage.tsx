import React, { useEffect, useState, useMemo } from 'react';
import { PlayerProfile as LocalPlayerProfile } from '../types/user';
import {
  playerApi,
  PlayerProgressData,
  BackendWeakness,
  BackendStrength,
  BackendRecommendation,
  BackendSkillSnapshot
} from '../services/api/playerApi';
import { practiceApi, ThemeMasteryData } from '../services/api/practiceApi';
import { useAuth } from '../auth/AuthProvider';
import { formatDisplayEmail } from '../utils/userDisplay';
import {
  TrendingUp,
  Flame,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Brain,
  Activity,
  RefreshCw,
  Play,
  Check,
  Filter,
  BarChart3,
  BarChart2,
  Clock,
  Share2,
  Trophy,
  Swords
} from 'lucide-react';

interface ProgressPageProps {
  userProfile: LocalPlayerProfile;
  onNavigate: (route: string) => void;
}

type TabType = 'overview' | 'mastery' | 'weaknesses' | 'analysis';
type SkillCategory = 'ALL' | 'TACTICAL' | 'POSITIONAL' | 'PRACTICAL';
type MasteryFilter = 'ALL' | 'DUE' | 'MASTERED' | 'DEVELOPING';

export const ProgressPage: React.FC<ProgressPageProps> = ({ userProfile: localProfile, onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlayerProgressData | null>(null);
  const [masteries, setMasteries] = useState<ThemeMasteryData[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [weaknessFilter, setWeaknessFilter] = useState<'ALL' | 'WEAKNESSES' | 'STRENGTHS'>('ALL');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<SkillCategory>('ALL');
  const [skillSortBy, setSkillSortBy] = useState<'DEFAULT' | 'LOWEST' | 'HIGHEST'>('DEFAULT');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (isManual = false) => {
    try {
      setLoading(true);
      const [res, masteryRes] = await Promise.all([
        playerApi.getProgress(),
        practiceApi.getMastery().catch(() => [] as ThemeMasteryData[])
      ]);
      setData(res);
      const safeMasteries = Array.isArray(masteryRes)
        ? masteryRes
        : (masteryRes as any)?.masteries && Array.isArray((masteryRes as any).masteries)
          ? (masteryRes as any).masteries
          : [];
      setMasteries(safeMasteries);
      if (isManual) {
        showToast('Profile synchronized with latest game analysis and practice results.');
      }
    } catch (err) {
      console.warn('Could not load real player progress, falling back to local state:', err);
      if (isManual) {
        showToast('Using cached player memory.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteRecommendation = async (recId: string) => {
    try {
      setCompletingId(recId);
      await playerApi.completeRecommendation(recId);
      showToast('Recommendation completed! Refreshing plan...');
      await loadData();
    } catch (err) {
      console.error('Failed to complete recommendation:', err);
    } finally {
      setCompletingId(null);
    }
  };

  const handlePracticeWeakness = (theme: string) => {
    onNavigate(`/practice?theme=${encodeURIComponent(theme.toLowerCase())}`);
  };

  // Derive counts and metrics
  const profile = data?.profile;
  const gamesAnalyzed = profile?.gamesAnalyzed ?? 0;
  const isSufficientData = gamesAnalyzed >= 1;

  const totalGames = profile
    ? profile.gamesWon + profile.gamesLost + profile.gamesDrawn
    : localProfile.winCount + localProfile.lossCount + localProfile.drawCount;
  const winRate = totalGames > 0
    ? Math.round(((profile ? profile.gamesWon : localProfile.winCount) / totalGames) * 100)
    : 0;

  const currentRating = profile?.rating ?? localProfile.rating;
  const overallTrainingScore = profile?.overallTrainingScore ?? 50.0;
  const weaknesses: BackendWeakness[] = data?.weaknesses ?? [];
  const strengths: BackendStrength[] = data?.strengths ?? [];
  const recommendations: BackendRecommendation[] = data?.recommendations ?? [];
  const snapshots: BackendSkillSnapshot[] = data?.snapshots ?? [];

  // Determine Player Rank Tier & Next Milestone
  const playerTier = useMemo(() => {
    if (currentRating >= 2000) {
      return {
        title: 'Grandmaster Aspirant',
        badge: '👑 Master Tier',
        color: 'from-amber-400 via-rose-500 to-purple-600',
        textColor: 'text-amber-300',
        nextMilestone: 2200,
        currentBase: 2000,
        nextTitle: 'FIDE Master'
      };
    }
    if (currentRating >= 1600) {
      return {
        title: 'Master Contender',
        badge: '♛ Master Tier',
        color: 'from-amber-500 to-amber-600',
        textColor: 'text-amber-400',
        nextMilestone: 2000,
        currentBase: 1600,
        nextTitle: 'Grandmaster Aspirant'
      };
    }
    if (currentRating >= 1400) {
      return {
        title: 'Tactical Specialist',
        badge: '♜ Class A',
        color: 'from-purple-500 to-indigo-600',
        textColor: 'text-purple-300',
        nextMilestone: 1600,
        currentBase: 1400,
        nextTitle: 'Master Contender'
      };
    }
    if (currentRating >= 1200) {
      return {
        title: 'Club Competitor',
        badge: '♝ Intermediate',
        color: 'from-brand-600 to-brand-700',
        textColor: 'text-brand-300',
        nextMilestone: 1400,
        currentBase: 1200,
        nextTitle: 'Tactical Specialist'
      };
    }
    if (currentRating >= 1000) {
      return {
        title: 'Club Apprentice',
        badge: '♞ Developing',
        color: 'from-emerald-500 to-teal-600',
        textColor: 'text-emerald-300',
        nextMilestone: 1200,
        currentBase: 1000,
        nextTitle: 'Club Competitor'
      };
    }
    return {
      title: 'Novice Tactician',
      badge: '♟️ Rising',
      color: 'from-surface-700 to-surface-800',
      textColor: 'text-surface-300',
      nextMilestone: 1000,
      currentBase: 600,
      nextTitle: 'Club Apprentice'
    };
  }, [currentRating]);

  // ELO Progress percentage towards next milestone
  const milestoneProgress = useMemo(() => {
    const range = playerTier.nextMilestone - playerTier.currentBase;
    const progress = currentRating - playerTier.currentBase;
    return Math.min(100, Math.max(5, Math.round((progress / range) * 100)));
  }, [currentRating, playerTier]);

  const pointsToNextMilestone = Math.max(0, playerTier.nextMilestone - currentRating);

  const displayEmail = useMemo(() => {
    return formatDisplayEmail(
      user?.email || localProfile.username,
      user?.displayName || localProfile.name
    );
  }, [user?.email, user?.displayName, localProfile.username, localProfile.name]);

  // Combined themes for tactical mastery & Leitner Box System
  const allMasteryThemes = useMemo(() => {
    const defaultThemes = [
      { theme: 'PIN', title: 'Absolute & Relative Pins', desc: 'Exploit and defend against pinned pieces.' },
      { theme: 'FORK', title: 'Knight & Pawn Forks', desc: 'Simultaneous attacks against multiple targets.' },
      { theme: 'SKEWER', title: 'Linear Skewers', desc: 'Attack high-value pieces along ranks and diagonals.' },
      { theme: 'HANGING_PIECE', title: 'Hanging Pieces', desc: 'Detect undefended and tactically loose pieces.' },
      { theme: 'BACK_RANK', title: 'Back-Rank Vulnerabilities', desc: 'Exploit corridor weaknesses and king luft.' },
      { theme: 'CENTER_CONTROL', title: 'Classical Center Control', desc: 'Occupy and influence the e4/d4/e5/d5 squares.' },
      { theme: 'OPEN_FILE', title: 'Open File Domination', desc: 'Station rooks on open files for maximum infiltration.' },
      { theme: 'LATE_CASTLING', title: 'Castling & King Safety', desc: 'Secure the king before tactical complications.' }
    ];

    const masteriesList = Array.isArray(masteries)
      ? masteries
      : (masteries as any)?.masteries && Array.isArray((masteries as any).masteries)
        ? (masteries as any).masteries
        : [];

    return defaultThemes.map((dt) => {
      const match = masteriesList.find((m: any) => m?.theme?.toUpperCase() === dt.theme);
      const score = match ? match.masteryScore : 50;
      const streak = match ? match.currentStreak : 0;

      // Leitner box classification
      let leitnerBox = 1;
      let intervalLabel = '1 Day (Daily)';
      if (score >= 85 && streak >= 4) {
        leitnerBox = 5;
        intervalLabel = '30 Days (Mastered)';
      } else if (score >= 70 && streak >= 3) {
        leitnerBox = 4;
        intervalLabel = '14 Days';
      } else if (score >= 60 && streak >= 2) {
        leitnerBox = 3;
        intervalLabel = '7 Days';
      } else if (score >= 50 && streak >= 1) {
        leitnerBox = 2;
        intervalLabel = '3 Days';
      }

      return {
        ...dt,
        mastery: match ?? null,
        leitnerBox,
        intervalLabel,
        isDue: match?.isDueForReview || false,
        score,
        accuracy: match ? match.accuracy : 0,
        attempts: match ? match.attemptCount : 0
      };
    });
  }, [masteries]);

  // Filtered themes for mastery tab
  const filteredThemes = useMemo(() => {
    return allMasteryThemes.filter((t) => {
      if (masteryFilter === 'DUE') return t.isDue;
      if (masteryFilter === 'MASTERED') return t.leitnerBox >= 4;
      if (masteryFilter === 'DEVELOPING') return t.leitnerBox <= 2;
      return true;
    });
  }, [allMasteryThemes, masteryFilter]);

  const dueThemesCount = useMemo(() => allMasteryThemes.filter(t => t.isDue).length, [allMasteryThemes]);
  const masteredThemesCount = useMemo(() => allMasteryThemes.filter(t => t.leitnerBox >= 4).length, [allMasteryThemes]);

  // Skill Dimensions with Category, Color and Direct Action mapping
  const skillDimensions = useMemo(() => {
    if (!profile) return [];
    const list = [
      {
        id: 'tactics',
        name: 'Tactical Awareness',
        score: profile.tacticsSkill,
        category: 'TACTICAL' as SkillCategory,
        categoryLabel: 'Tactical',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        targetTheme: 'PIN',
        description: 'Recognition of pins, forks, skewers and tactical motifs.'
      },
      {
        id: 'calculation',
        name: 'Deep Calculation',
        score: profile.calculationSkill,
        category: 'TACTICAL' as SkillCategory,
        categoryLabel: 'Tactical',
        color: 'bg-indigo-600',
        textColor: 'text-indigo-600',
        targetTheme: 'FORK',
        description: 'Evaluating candidate move sequences and tactical conversions.'
      },
      {
        id: 'blunderPrevention',
        name: 'Blunder Prevention',
        score: profile.blunderPreventionSkill,
        category: 'TACTICAL' as SkillCategory,
        categoryLabel: 'Tactical',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        targetTheme: 'HANGING_PIECE',
        description: 'Vigilance against sudden piece drops and back-rank threats.'
      },
      {
        id: 'opening',
        name: 'Opening Principles',
        score: profile.openingSkill,
        category: 'POSITIONAL' as SkillCategory,
        categoryLabel: 'Positional',
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        targetTheme: 'CENTER_CONTROL',
        description: 'Rapid piece development, central control, and early king safety.'
      },
      {
        id: 'middlegame',
        name: 'Middlegame Strategy',
        score: profile.middlegameSkill,
        category: 'POSITIONAL' as SkillCategory,
        categoryLabel: 'Positional',
        color: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        targetTheme: 'OPEN_FILE',
        description: 'Formulating strategic plans and exploiting opponent weaknesses.'
      },
      {
        id: 'endgame',
        name: 'Endgame Technique',
        score: profile.endgameSkill,
        category: 'POSITIONAL' as SkillCategory,
        categoryLabel: 'Positional',
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        targetTheme: 'PIN',
        description: 'Conversion of material advantages and king activity in endgames.'
      },
      {
        id: 'pieceCoordination',
        name: 'Piece Coordination',
        score: profile.pieceCoordinationSkill,
        category: 'POSITIONAL' as SkillCategory,
        categoryLabel: 'Positional',
        color: 'bg-cyan-600',
        textColor: 'text-cyan-600',
        targetTheme: 'OPEN_FILE',
        description: 'Harmonious piece placement and open file domination.'
      },
      {
        id: 'pawnStructure',
        name: 'Pawn Structure',
        score: profile.pawnStructureSkill,
        category: 'POSITIONAL' as SkillCategory,
        categoryLabel: 'Positional',
        color: 'bg-teal-600',
        textColor: 'text-teal-600',
        targetTheme: 'CENTER_CONTROL',
        description: 'Pawn chains, pawn breaks, and isolated/doubled pawn dynamics.'
      },
      {
        id: 'kingSafety',
        name: 'King Safety & Defense',
        score: profile.kingSafetySkill,
        category: 'PRACTICAL' as SkillCategory,
        categoryLabel: 'Practical',
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
        targetTheme: 'LATE_CASTLING',
        description: 'Timely castling, defensive resourcefulness, and luft management.'
      },
      {
        id: 'timeManagement',
        name: 'Time Management',
        score: profile.timeManagementSkill,
        category: 'PRACTICAL' as SkillCategory,
        categoryLabel: 'Practical',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        targetTheme: 'PIN',
        description: 'Clock discipline and decisive pace in complex tactical spots.'
      }
    ];

    // Filter by category
    let filtered = list;
    if (skillCategoryFilter !== 'ALL') {
      filtered = list.filter(s => s.category === skillCategoryFilter);
    }

    // Sort
    if (skillSortBy === 'LOWEST') {
      filtered = [...filtered].sort((a, b) => a.score - b.score);
    } else if (skillSortBy === 'HIGHEST') {
      filtered = [...filtered].sort((a, b) => b.score - a.score);
    }

    return filtered;
  }, [profile, skillCategoryFilter, skillSortBy]);

  // Copy Profile Card to Clipboard
  const handleShareProfile = () => {
    const text = `🏆 Chess Coach Profile — ${user?.displayName || localProfile.name || 'Player'}
⭐ Rating: ${currentRating} (${playerTier.badge})
🎯 Composite Training Score: ${overallTrainingScore}/100
🔥 Streak: ${profile?.currentStreak ?? localProfile.streakDays} Days
⚔️ Match Record: ${profile ? profile.gamesWon : localProfile.winCount}W / ${profile ? profile.gamesLost : localProfile.lossCount}L / ${profile ? profile.gamesDrawn : localProfile.drawCount}D (${winRate}% Win Rate)
🧩 Puzzles Solved: ${profile?.puzzlesSolved ?? 0}
♟️ Built with authentic Stockfish & AI learning memory.`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Profile summary copied to clipboard!');
    }).catch(() => {
      showToast('Could not copy to clipboard.');
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-surface-900 text-white border border-surface-700 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. DEDICATED SKILL MASTERY & PERFORMANCE HEADER (NO DUPLICATE PROFILE CARD) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                Skill Mastery & Diagnostics
              </span>
              <span className="text-xs text-slate-400">
                Stockfish 19 & Spaced-Repetition Memory
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
              Mastery Diagnostics & Learning Progress
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Diagnostic evaluation of your tactical sharpness, positional strengths, and Leitner spaced-repetition memory.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/practice')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Practice Weaknesses</span>
            </button>

            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Refresh Diagnostics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing…' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FOUR FOCUSED LEARNING & MASTERY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Mastered Themes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {masteredThemesCount} <span className="text-xs text-slate-400 font-normal">/ 8 Themes</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Leitner Level 4+ Mastered</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Due for Practice</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1 tabular-nums">
            {dueThemesCount} <span className="text-xs text-slate-400 font-normal">Themes</span>
          </div>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Spaced repetition queue</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Tactical Accuracy</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {profile && profile.puzzlesAttempted > 0
              ? `${Math.round((profile.puzzlesSolved / profile.puzzlesAttempted) * 100)}%`
              : '75%'}
          </div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Puzzle & drill solve rate</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Training Index</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {isSufficientData ? `${overallTrainingScore}` : '50.0'} <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Composite skill score</span>
        </div>
      </div>

      {/* 3. STREAMLINED TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-[#1E222B] gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Diagnostic Overview', icon: Brain, count: undefined },
          { id: 'mastery', label: 'Tactical Mastery & Spaced Review', icon: Target, count: dueThemesCount > 0 ? `${dueThemesCount} Due` : undefined },
          { id: 'weaknesses', label: 'Weaknesses & Strengths', icon: ShieldAlert, count: (weaknesses.length + strengths.length) || undefined },
          { id: 'analysis', label: 'Game Accuracy & Blunders', icon: BarChart3, count: undefined }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#81B64C] text-[#81B64C] dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#81B64C] text-white'
                    : tab.count.toString().includes('Due')
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-[#1E222B] text-slate-600 dark:text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ONBOARDING ROADMAP CARD (Visible only if low evidence) */}
          {!isSufficientData && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#181C25] text-amber-500 border border-amber-200 dark:border-[#262B36] flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Adaptive Mastery Roadmap</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">How the AI Coach detects your true chess habits without guessing.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('/play')}
                    className="chess-btn-green px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play Live Game</span>
                  </button>
                  <button
                    onClick={() => onNavigate('/practice')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#14171E] dark:hover:bg-[#1E222B] text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-[#1E222B] cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Practice Drills</span>
                  </button>
                </div>
              </div>

              {/* 4 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Step 1</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">1. Play Live Match</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">Play against engine bots at your target rating level.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Step 2</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">2. Stockfish Analysis</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">Every move is evaluated for centipawn loss and tactical themes.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Step 3</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">3. Deterministic Memory</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">Strengths and recurring tactical weaknesses update immediately.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-1">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Step 4</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">4. Spaced Drills</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">Train targeted puzzles until mistakes are eliminated permanently.</p>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE PERSONALIZED TRAINING RECOMMENDATIONS */}
          {recommendations.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold">Personalized Training Recommendations</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-[#14171E] px-2.5 py-0.5 rounded border border-slate-200 dark:border-[#1E222B] uppercase tracking-wider">
                  Adaptive Learning Planner
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] shadow-xs space-y-2 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#161B22] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 uppercase tracking-wider">
                          {rec.category}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          PRIORITY {rec.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{rec.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">{rec.reason}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#1E222B] text-xs">
                      <button
                        onClick={() => handlePracticeWeakness(rec.theme)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Start Targeted Practice</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleCompleteRecommendation(rec.id)}
                        disabled={completingId === rec.id}
                        className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {completingId === rec.id ? 'Saving...' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INTERACTIVE SKILL COMPETENCY PROFILE */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Skill Competency Profile</h3>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Deterministic training scores (0-100 scale, neutral 50)</span>
              </div>

              {/* Filters and Sorters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] rounded-lg p-0.5 text-xs font-semibold">
                  {(['ALL', 'TACTICAL', 'POSITIONAL', 'PRACTICAL'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSkillCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                        skillCategoryFilter === cat
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'ALL' ? 'All (10)' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setSkillSortBy('DEFAULT')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      skillSortBy === 'DEFAULT' ? 'bg-white dark:bg-zinc-200 text-slate-900 dark:text-black shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Default Order"
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setSkillSortBy('LOWEST')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      skillSortBy === 'LOWEST' ? 'bg-white dark:bg-zinc-200 text-slate-900 dark:text-black shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Focus Areas First"
                  >
                    Needs Work
                  </button>
                  <button
                    onClick={() => setSkillSortBy('HIGHEST')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      skillSortBy === 'HIGHEST' ? 'bg-white dark:bg-zinc-200 text-slate-900 dark:text-black shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Top Skills First"
                  >
                    Top
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of Skill Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {skillDimensions.map((skill) => {
                const isUnderperforming = skill.score < 45;
                const isMastered = skill.score >= 65;

                return (
                  <div
                    key={skill.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-2 group shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {skill.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-[#1E222B] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#262B36]">
                          {skill.categoryLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isUnderperforming && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Focus Area
                          </span>
                        )}
                        {isMastered && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Strong
                          </span>
                        )}
                        <span className="text-slate-900 dark:text-white font-mono font-black">{skill.score}/100</span>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#1E222B] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${skill.color}`}
                        style={{ width: `${Math.min(100, Math.max(8, skill.score))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-500 dark:text-zinc-400 text-[10px] line-clamp-1">{skill.description}</span>
                      <button
                        onClick={() => handlePracticeWeakness(skill.targetTheme)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-[10px] shrink-0 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Drill</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TACTICAL MASTERY & LEITNER SPACED REPETITION */}
      {/* ========================================================================= */}
      {activeTab === 'mastery' && (
        <div className="space-y-5">
          {/* Spaced Repetition Summary Header */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#181C25] text-amber-500 border border-amber-200 dark:border-[#262B36] flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">Leitner Spaced-Repetition System</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Clean solves increase review intervals (1d → 3d → 7d → 14d → 30d). Tactical mistakes flag themes for immediate review.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {dueThemesCount > 0 && (
                <button
                  onClick={() => {
                    const firstDue = allMasteryThemes.find(t => t.isDue);
                    if (firstDue) handlePracticeWeakness(firstDue.theme);
                  }}
                  className="chess-btn-amber px-4 py-2 rounded-xl text-black font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 fill-black" />
                  <span>Review {dueThemesCount} Due Theme{dueThemesCount > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter:
              </span>
              {(['ALL', 'DUE', 'MASTERED', 'DEVELOPING'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMasteryFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    masteryFilter === f
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#14171E] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1E222B]'
                  }`}
                >
                  {f === 'ALL'
                    ? `All Themes (${allMasteryThemes.length})`
                    : f === 'DUE'
                      ? `Due for Review (${dueThemesCount})`
                      : f === 'MASTERED'
                        ? `Mastered (${masteredThemesCount})`
                        : `Active Drills (${allMasteryThemes.length - masteredThemesCount})`}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Showing {filteredThemes.length} of {allMasteryThemes.length} tactical themes
            </span>
          </div>

          {/* Grid of Theme Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {filteredThemes.map((item) => {
              const m = item.mastery;
              const isDue = item.isDue;

              return (
                <div
                  key={item.theme}
                  className={`p-4 rounded-xl transition-all flex flex-col justify-between group shadow-xs ${
                    isDue
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-500/60'
                      : 'bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 hover:border-emerald-500 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#181C25] text-slate-700 dark:text-zinc-300 uppercase tracking-wide border border-slate-200 dark:border-[#262B36]">
                        {item.theme}
                      </span>
                      {isDue ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                          <span>Due</span>
                          <span>🔥</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400">
                          {m ? `Streak: ${m.currentStreak}🔥` : 'Unpracticed'}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug mb-3">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#1E222B] space-y-2">
                    {/* Leitner Box Level Indicator */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 font-semibold">Leitner Box {item.leitnerBox}/5</span>
                      <span className="font-bold text-emerald-400">{item.intervalLabel}</span>
                    </div>

                    {/* Leitner Step Pills */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((box) => (
                        <div
                          key={box}
                          className={`flex-1 h-1.5 rounded-full ${
                            box <= item.leitnerBox ? 'bg-emerald-500' : 'bg-[#1E222B]'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 pt-1">
                      <span>Mastery Score</span>
                      <span className="font-bold text-white tabular-nums">{item.score.toFixed(0)}/100</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{item.attempts} attempts</span>
                      <span className="font-bold text-zinc-300">{item.accuracy}% accuracy</span>
                    </div>

                    <button
                      onClick={() => handlePracticeWeakness(item.theme)}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 mt-2 cursor-pointer ${
                        isDue
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-xs font-black'
                          : 'bg-[#181C25] hover:bg-[#1E222B] text-white border border-[#262B36]'
                      }`}
                    >
                      <span>{isDue ? 'Review Due Theme' : `Drill ${item.theme}`}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WEAKNESSES & STRENGTHS */}
      {/* ========================================================================= */}
      {activeTab === 'weaknesses' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            {(['ALL', 'WEAKNESSES', 'STRENGTHS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setWeaknessFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  weaknessFilter === f
                    ? 'bg-white text-black'
                    : 'bg-[#14171E] text-zinc-400 hover:text-white border border-[#1E222B]'
                }`}
              >
                {f === 'ALL' ? 'All Patterns' : f === 'WEAKNESSES' ? `Weaknesses (${weaknesses.length})` : `Strengths (${strengths.length})`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Identified Strengths */}
            {(weaknessFilter === 'ALL' || weaknessFilter === 'STRENGTHS') && (
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-3">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Demonstrated Strengths</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {strengths.length} Confirmed
                  </span>
                </div>

                {strengths.length > 0 ? (
                  <div className="space-y-2.5">
                    {strengths.map((s) => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">{s.title}</span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {Math.round(s.confidence * 100)}% Confidence ({s.occurrenceCount}x observed)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-dashed border-slate-200 dark:border-[#1E222B] text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-slate-400 dark:text-zinc-500" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">No demonstrated strengths confirmed yet</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 max-w-xs mx-auto">
                      Strengths are confirmed after consistently demonstrating tactical precision across multiple games.
                    </p>
                    <button
                      onClick={() => onNavigate('/play')}
                      className="chess-btn-green mt-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Play Match to Detect Strengths
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Identified Weaknesses */}
            {(weaknessFilter === 'ALL' || weaknessFilter === 'WEAKNESSES') && (
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-3">
                <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identified Weaknesses</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                    {weaknesses.length} Active
                  </span>
                </div>

                {weaknesses.length > 0 ? (
                  <div className="space-y-2.5">
                    {weaknesses.map((w) => (
                      <div key={w.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-700 dark:text-rose-300">{w.title}</span>
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                            {w.severity} Severity ({w.occurrenceCount}x detected)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          {w.description}
                        </p>
                        <button
                          onClick={() => handlePracticeWeakness(w.theme)}
                          className="w-full py-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#262B36] hover:border-slate-400 dark:hover:border-zinc-500 text-slate-800 dark:text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>Target this weakness in Practice</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-dashed border-slate-200 dark:border-[#1E222B] text-center space-y-2">
                    <ShieldAlert className="w-6 h-6 mx-auto text-slate-400 dark:text-zinc-500" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">No recurring tactical weaknesses identified</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 max-w-xs mx-auto">
                      After each game review, Stockfish scans your centipawn drops to uncover exact tactical patterns needing improvement.
                    </p>
                    <button
                      onClick={() => onNavigate('/play')}
                      className="chess-btn-green mt-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Play & Analyze Game
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GAME ACCURACY & BLUNDERS */}
      {/* ========================================================================= */}
      {activeTab === 'analysis' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md hover:border-rose-400 dark:hover:border-rose-500/50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Total Blunders</span>
              <div className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-1 tabular-nums">{profile?.totalBlunders ?? 0}</div>
              <span className="text-[10px] font-semibold text-rose-500/80 dark:text-rose-400/80">Game-deciding tactical oversights (&gt;300cp loss)</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md hover:border-amber-400 dark:hover:border-amber-500/50 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Total Mistakes</span>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1 tabular-nums">{profile?.totalMistakes ?? 0}</div>
              <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80">Suboptimal moves (100–300cp loss)</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md hover:border-slate-400 dark:hover:border-zinc-600 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Inaccuracies</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{profile?.totalInaccuracies ?? 0}</div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">Minor positional slips (50–100cp loss)</span>
            </div>
          </div>

          {/* Historical Trend Snapshots */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Historical Skill Progression</h3>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Snapshots captured incrementally after each Stockfish game review</span>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>

            {snapshots.length > 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>Recent Snapshots ({snapshots.length})</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Latest: {snapshots[snapshots.length - 1]?.overall}/100</span>
                </div>

                <div className="flex items-end gap-1.5 h-32 pt-4 px-1">
                  {snapshots.map((s, idx) => {
                    const heightPct = Math.min(100, Math.max(15, s.overall));
                    return (
                      <div
                        key={s.id}
                        className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                      >
                        <div
                          className="w-full rounded-t-md bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-300"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[9px] text-zinc-400">#{idx + 1}</span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center bg-[#0A0B0E] border border-[#1E222B] text-white text-[10px] px-2.5 py-1.5 rounded shadow-xl z-10 whitespace-nowrap">
                          <span className="font-bold">Overall: {s.overall}/100</span>
                          <span className="text-zinc-400">Tactics: {s.tactics}</span>
                          <span className="text-zinc-400">Endgame: {s.endgame}</span>
                          <span className="text-zinc-500 text-[9px] mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[#14171E] border border-dashed border-[#1E222B] text-center space-y-2">
                <BarChart3 className="w-6 h-6 mx-auto text-zinc-500" />
                <p className="text-xs font-semibold text-zinc-300">No progression snapshots recorded yet</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                  Progression snapshots are generated automatically whenever you complete a full Stockfish game review in the Play or Analyze tab.
                </p>
                <button
                  onClick={() => onNavigate('/play')}
                  className="mt-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Start a Game to Track Accuracy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
