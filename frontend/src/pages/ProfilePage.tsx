import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlayerProfile as LocalPlayerProfile, RatingHistoryEntry } from '../types/user';
import { useAuth } from '../auth/AuthProvider';
import { gameApi, BackendGameDto, mapBackendGameToSavedGame } from '../services/api/gameApi';
import { playerApi, BackendPlayerProfile } from '../services/api/playerApi';
import { SavedGame } from '../types/game';
import { formatDisplayEmail } from '../utils/userDisplay';
import { updatePlayerProfile, loadPlayerProfile } from '../services/playerProfileService';
import {
  Trophy, Award, Flame, Swords, Target, TrendingUp,
  Share2, CheckCircle2, Sparkles, Edit3, Check, X,
  Shield, Zap, Globe, Camera, Upload, BarChart2,
  Clock, BookOpen, Crown, ChevronRight, Play, Eye
} from 'lucide-react';

interface ProfilePageProps {
  userProfile: LocalPlayerProfile;
  onNavigate: (route: string) => void;
}

const PRESET_AVATARS = [
  { id: 'knight', label: 'Knight', icon: '♞', desc: 'Tactical Calculator' },
  { id: 'queen', label: 'Queen', icon: '♛', desc: 'Dominant Attacker' },
  { id: 'king', label: 'King', icon: '♚', desc: 'Grandmaster Strategist' },
  { id: 'rook', label: 'Rook', icon: '♜', desc: 'Endgame Fortress' },
  { id: 'bishop', label: 'Bishop', icon: '♝', desc: 'Diagonal Sniper' },
  { id: 'pawn', label: 'Pawn', icon: '♟️', desc: 'Pawn Stormer' },
  { id: 'wizard', label: 'Wizard', icon: '🧙', desc: 'Deep Thinker' },
  { id: 'lion', label: 'Lion', icon: '🦁', desc: 'Fierce Competitor' },
  { id: 'eagle', label: 'Eagle', icon: '🦅', desc: 'High Vision' },
  { id: 'dragon', label: 'Dragon', icon: '🐉', desc: 'Aggressive Master' },
  { id: 'lightning', label: 'Blitz', icon: '⚡', desc: 'Speed Demon' },
  { id: 'crown', label: 'Champion', icon: '👑', desc: 'Title Hunter' },
];

const FLAIR_OPTIONS = [
  { id: 'flair-trophy', icon: '🏆', label: 'Champion' },
  { id: 'flair-crown', icon: '👑', label: 'Master' },
  { id: 'flair-fire', icon: '🔥', label: 'On Fire' },
  { id: 'flair-lightning', icon: '⚡', label: 'Speed' },
  { id: 'flair-target', icon: '🎯', label: 'Tactician' },
  { id: 'flair-diamond', icon: '💎', label: 'Diamond' },
  { id: 'flair-rocket', icon: '🚀', label: 'Climber' },
  { id: 'flair-pawn', icon: '♟️', label: 'Classic' },
];

const COUNTRY_OPTIONS = [
  'Global 🌐', 'India 🇮🇳', 'United States 🇺🇸', 'United Kingdom 🇬🇧',
  'Norway 🇳🇴', 'Canada 🇨🇦', 'Germany 🇩🇪', 'France 🇫🇷', 'Spain 🇪🇸',
  'Brazil 🇧🇷', 'Japan 🇯🇵', 'Australia 🇦🇺', 'Armenia 🇦🇲', 'Uzbekistan 🇺🇿',
  'Netherlands 🇳🇱', 'Poland 🇵🇱', 'Italy 🇮🇹', 'Ukraine 🇺🇦'
];

const OPENINGS_WHITE = [
  'Italian Game', "Queen's Gambit", 'Ruy Lopez', 'English Opening',
  'London System', 'Vienna Game', "King's Gambit", 'Catalan Opening'
];

const OPENINGS_BLACK = [
  'Sicilian Defense', 'French Defense', 'Caro-Kann Defense',
  "King's Indian Defense", 'Scandinavian Defense', 'Nimzo-Indian Defense',
  'Slav Defense', 'Dutch Defense'
];

// Generates a deterministic distinctive background gradient for users without a custom photo
function getUserGradient(name: string): string {
  const gradients = [
    'from-emerald-600 via-teal-700 to-cyan-900',
    'from-blue-600 via-indigo-700 to-slate-900',
    'from-purple-600 via-indigo-700 to-slate-900',
    'from-amber-600 via-orange-700 to-zinc-900',
    'from-rose-600 via-pink-700 to-zinc-900',
    'from-cyan-600 via-blue-700 to-indigo-950',
    'from-violet-600 via-fuchsia-700 to-zinc-900'
  ];
  let hash = 0;
  for (let i = 0; i < (name || 'Player').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile: initialProfile, onNavigate }) => {
  const { user, profile: authProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive initial values from authenticated user and profile
  const effectiveDisplayName = user?.displayName || initialProfile.name || (user?.email ? user.email.split('@')[0] : 'Player');
  const effectiveUsername = user?.email ? user.email.split('@')[0] : (initialProfile.username || 'player');

  // Load user-scoped persisted profile
  const [profile, setProfile] = useState<LocalPlayerProfile>(() =>
    loadPlayerProfile(user?.id, {
      displayName: effectiveDisplayName,
      email: user?.email,
      rating: authProfile?.rating ?? initialProfile.rating ?? 400
    })
  );

  // Sync profile when user changes
  useEffect(() => {
    setProfile(
      loadPlayerProfile(user?.id, {
        displayName: effectiveDisplayName,
        email: user?.email,
        rating: authProfile?.rating ?? initialProfile.rating ?? 400
      })
    );
  }, [user?.id, effectiveDisplayName, user?.email, authProfile?.rating, initialProfile.rating]);

  // Edit Drawer State
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Form Fields
  const [editName, setEditName] = useState(profile.name || effectiveDisplayName);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl || '♞');
  const [editFlair, setEditFlair] = useState(profile.flair || '♟️');
  const [editBio, setEditBio] = useState(profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.');
  const [editCountry, setEditCountry] = useState(profile.country || 'Global 🌐');
  const [editStyle, setEditStyle] = useState<'Tactical' | 'Positional' | 'Universal'>(profile.preferredStyle || 'Tactical');
  const [editOpeningWhite, setEditOpeningWhite] = useState(profile.favoriteOpening || 'Italian Game');
  const [editOpeningBlack, setEditOpeningBlack] = useState(profile.favoriteOpeningBlack || 'Sicilian Defense');
  const [editStatus, setEditStatus] = useState(profile.statusMessage || 'Ready to play & learn chess');

  // Match history & stats state
  const [recentGames, setRecentGames] = useState<SavedGame[]>([]);
  const [playerStats, setPlayerStats] = useState<BackendPlayerProfile | null>(null);
  const [gameFilter, setGameFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [activeTab, setActiveTab] = useState<'ratings' | 'history' | 'achievements'>('ratings');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync profile when external change event fires
  useEffect(() => {
    const handleProfileChange = (e: Event) => {
      const customEvent = e as CustomEvent<LocalPlayerProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };
    window.addEventListener('chess_mastery_profile_changed', handleProfileChange);
    return () => window.removeEventListener('chess_mastery_profile_changed', handleProfileChange);
  }, []);

  // Fetch match history from backend if available
  useEffect(() => {
    async function fetchGamesAndStats() {
      try {
        const [gamesRes, profileRes] = await Promise.all([
          gameApi.getGames(1, 15).catch(() => ({ data: [] as BackendGameDto[], pagination: { page: 1, limit: 15, total: 0, totalPages: 0 } })),
          playerApi.getProfile().catch(() => null)
        ]);

        if (profileRes) setPlayerStats(profileRes);
        if (gamesRes.data && gamesRes.data.length > 0) {
          const mapped: SavedGame[] = gamesRes.data.map(mapBackendGameToSavedGame);
          setRecentGames(mapped);
        }
      } catch (err) {
        console.warn('Using local games for profile:', err);
      }
    }
    fetchGamesAndStats();
  }, [user?.id]);

  // Authoritative metrics: combine backend profile stats with local state
  const currentRating = authProfile?.rating ?? profile.rating ?? 400;
  const peakRating = Math.max(profile.peakRating || 400, currentRating);
  const winCount = authProfile?.gamesWon ?? profile.winCount ?? 0;
  const lossCount = authProfile?.gamesLost ?? profile.lossCount ?? 0;
  const drawCount = authProfile?.gamesDrawn ?? profile.drawCount ?? 0;
  const streak = authProfile?.currentStreak ?? profile.streakDays ?? 0;
  const longestStreak = authProfile?.longestStreak ?? 0;
  const totalMatches = winCount + lossCount + drawCount;
  const winRate = totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0;
  const drawRate = totalMatches > 0 ? Math.round((drawCount / totalMatches) * 100) : 0;
  const lossRate = totalMatches > 0 ? Math.max(0, 100 - winRate - drawRate) : 0;

  // Rank Tier Badge dynamically driven by rating (Chess.com style divisions)
  const rankTier = useMemo(() => {
    if (currentRating >= 2200) return { title: 'Grandmaster Aspirant', badge: '👑 GM Aspirant', color: 'from-amber-400 via-rose-500 to-purple-600', nextTier: 2400 };
    if (currentRating >= 1800) return { title: 'Master Contender', badge: '♛ Master Tier', color: 'from-purple-500 to-pink-600', nextTier: 2000 };
    if (currentRating >= 1400) return { title: 'Tactical Specialist', badge: '♜ Class A', color: 'from-indigo-500 to-blue-600', nextTier: 1600 };
    if (currentRating >= 1000) return { title: 'Club Competitor', badge: '♝ Intermediate', color: 'from-blue-600 to-cyan-600', nextTier: 1200 };
    if (currentRating >= 600) return { title: 'Rising Star', badge: '♞ Rising Star', color: 'from-emerald-500 to-teal-600', nextTier: 800 };
    return { title: 'Novice Calibrator', badge: '♟️ Novice (400 Tier)', color: 'from-zinc-700 to-zinc-900', nextTier: 600 };
  }, [currentRating]);

  // Next milestone calculation
  const nextMilestone = rankTier.nextTier;
  const prevMilestone = nextMilestone - 200;
  const progressToNext = Math.min(100, Math.max(0, Math.round(((currentRating - prevMilestone) / (nextMilestone - prevMilestone)) * 100)));

  // Handle Photo Upload from device
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (.png, .jpg, .webp).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
        showToast('Photo loaded! Click "Save Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save customized profile
  const handleSaveProfile = () => {
    const updated = updatePlayerProfile({
      name: editName.trim() || effectiveDisplayName,
      avatarUrl: editAvatar,
      flair: editFlair,
      bio: editBio.trim(),
      country: editCountry,
      preferredStyle: editStyle,
      favoriteOpening: editOpeningWhite,
      favoriteOpeningBlack: editOpeningBlack,
      statusMessage: editStatus.trim()
    }, user?.id);

    setProfile(updated);
    setIsEditing(false);
    showToast('Profile and avatar customized successfully!');
  };

  const handleShareProfile = () => {
    const text = `🏆 Chess Mastery Profile — ${profile.name} (@${effectiveUsername})
⭐ Rating: ${currentRating} (${rankTier.badge})
🎯 Peak Rating: ${peakRating}
🔥 Training Streak: ${streak} Days (Best: ${longestStreak})
⚔️ Career Record: ${winCount}W / ${lossCount}L / ${drawCount}D (${winRate}% Win Rate)
♟️ Country: ${profile.country || 'Global 🌐'}
Join and train at: http://localhost:5173`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Chess.com style profile summary copied to clipboard!');
    }).catch(() => {
      showToast('Could not copy to clipboard.');
    });
  };

  const filteredGames = useMemo(() => {
    return recentGames.filter((g) => {
      const isWin = g.result === 'WHITE_WINS' || g.resultString.includes('Win');
      const isLoss = g.result === 'BLACK_WINS' || g.resultString.includes('Loss');
      if (gameFilter === 'WINS') return isWin;
      if (gameFilter === 'LOSSES') return isLoss;
      return true;
    });
  }, [recentGames, gameFilter]);

  // Distinctive avatar background gradient for this specific user
  const avatarGradient = useMemo(() => getUserGradient(profile.name || effectiveDisplayName), [profile.name, effectiveDisplayName]);

  // Chess.com style achievement badges
  const achievements = useMemo(() => [
    {
      id: 'first-step',
      title: 'First Step',
      desc: 'Created your Chess Mastery account',
      icon: '♟️',
      unlocked: true,
      category: 'Milestone'
    },
    {
      id: 'first-win',
      title: 'First Victory',
      desc: 'Won a rated match against an AI Bot',
      icon: '⚔️',
      unlocked: winCount >= 1,
      category: 'Competitive'
    },
    {
      id: 'rating-500',
      title: 'Rising Calibrator',
      desc: 'Climbed above 450 Elo rating',
      icon: '📈',
      unlocked: currentRating >= 450,
      category: 'Rating'
    },
    {
      id: 'hot-streak',
      title: 'On Fire',
      desc: 'Achieved a winning streak of 3+ games',
      icon: '🔥',
      unlocked: streak >= 3 || longestStreak >= 3,
      category: 'Streak'
    },
    {
      id: 'puzzle-solver',
      title: 'Tactical Mind',
      desc: 'Solved daily tactical puzzles',
      icon: '🧩',
      unlocked: (playerStats?.puzzlesSolved || 0) > 0,
      category: 'Tactics'
    },
    {
      id: 'mastery-student',
      title: 'Curriculum Scholar',
      desc: 'Completed an interactive curriculum lesson',
      icon: '🎓',
      unlocked: (playerStats?.lessonsCompleted || 0) > 0,
      category: 'Training'
    },
    {
      id: 'deep-analyzer',
      title: 'Grandmaster Review',
      desc: 'Analyzed games using the engine review board',
      icon: '🧠',
      unlocked: (playerStats?.gamesAnalyzed || 0) > 0 || recentGames.length > 0,
      category: 'Analysis'
    },
  ], [winCount, currentRating, streak, longestStreak, playerStats, recentGames.length]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-700 shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. CHESS.COM HEADER BANNER & IDENTITY CARD ── */}
      <div className="rounded-2xl bg-[#181E29] dark:bg-[#151922] border border-slate-200 dark:border-[#273042] text-white shadow-xl overflow-hidden relative">
        {/* Subtle decorative chessboard motif banner */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-[#1B2230] via-[#20293A] to-[#2B354C] relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#81B64C_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-6 top-4 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[11px] font-bold text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#81B64C] animate-pulse" />
            <span>Online Now</span>
          </div>
          <div className="absolute left-6 bottom-3 flex items-center gap-2 text-xs text-white/60 font-medium">
            <span>{profile.joinedDate || 'Member of Chess Mastery'}</span>
          </div>
        </div>

        {/* Profile Content Strip */}
        <div className="p-6 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-18">
            {/* Avatar & Player Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Avatar Box with Online Dot & Hover Edit */}
              <div className="relative group">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr ${avatarGradient} text-white flex items-center justify-center font-black text-4xl sm:text-5xl shadow-2xl ring-4 ring-[#181E29] dark:ring-[#151922] overflow-hidden`}>
                  {profile.avatarUrl && (profile.avatarUrl.startsWith('http') || profile.avatarUrl.startsWith('data:')) ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : profile.avatarUrl && profile.avatarUrl.length > 0 && profile.avatarUrl !== '♞' ? (
                    <span className="text-4xl sm:text-5xl">{profile.avatarUrl}</span>
                  ) : (
                    <span className="text-4xl sm:text-5xl font-display">{profile.name ? profile.name[0]?.toUpperCase() : 'P'}</span>
                  )}
                </div>

                {/* Online Indicator */}
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#81B64C] border-2 border-[#181E29] dark:border-[#151922]"
                  title="Online now"
                />

                {/* Edit Avatar Overlay Button */}
                <button
                  onClick={() => {
                    setEditName(profile.name || effectiveDisplayName);
                    setEditAvatar(profile.avatarUrl || '♞');
                    setEditFlair(profile.flair || '♟️');
                    setEditBio(profile.bio || '');
                    setEditCountry(profile.country || 'Global 🌐');
                    setEditStyle(profile.preferredStyle || 'Tactical');
                    setEditOpeningWhite(profile.favoriteOpening || 'Italian Game');
                    setEditOpeningBlack(profile.favoriteOpeningBlack || 'Sicilian Defense');
                    setEditStatus(profile.statusMessage || '');
                    setIsEditing(true);
                  }}
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-slate-900/90 hover:bg-[#81B64C] text-white border border-white/20 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                  title="Customize Avatar & Profile"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Player Identity Information */}
              <div className="space-y-1 pb-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
                    {profile.name || effectiveDisplayName}
                  </h1>
                  <span className="text-xl" title="Status Flair">{profile.flair || '♟️'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-[#9DD362] border border-white/15">
                    {rankTier.badge}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {profile.preferredStyle || 'Tactical'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-200 font-semibold">@{effectiveUsername}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    {profile.country || 'Global 🌐'}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    {streak} Day Streak
                  </span>
                </div>

                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed pt-1.5 italic">
                  "{profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.'}"
                </p>
              </div>
            </div>

            {/* Quick Action Buttons (Chess.com Style) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pb-1">
              <button
                onClick={() => {
                  setEditName(profile.name || effectiveDisplayName);
                  setEditAvatar(profile.avatarUrl || '♞');
                  setEditFlair(profile.flair || '♟️');
                  setEditBio(profile.bio || '');
                  setEditCountry(profile.country || 'Global 🌐');
                  setEditStyle(profile.preferredStyle || 'Tactical');
                  setEditOpeningWhite(profile.favoriteOpening || 'Italian Game');
                  setEditOpeningBlack(profile.favoriteOpeningBlack || 'Sicilian Defense');
                  setEditStatus(profile.statusMessage || '');
                  setIsEditing(!isEditing);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>

              <button
                onClick={handleShareProfile}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Share profile to clipboard"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={() => onNavigate('/play')}
                className="px-5 py-2.5 rounded-xl bg-[#81B64C] hover:bg-[#689E39] text-white font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Chess</span>
              </button>
            </div>
          </div>

          {/* ── CUSTOMIZATION DRAWER ── */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5 animate-in fade-in duration-200 bg-black/20 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#9DD362] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Customize Your Chess.com Style Profile
                </span>
                <span className="text-[11px] text-zinc-400">
                  Settings are saved exclusively to your account (@{effectiveUsername})
                </span>
              </div>

              {/* Avatar Selection Strip */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  1. Choose Avatar Icon or Upload Photo
                </label>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.icon)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer border ${
                        editAvatar === av.icon
                          ? 'bg-[#81B64C]/30 border-[#81B64C] ring-2 ring-[#81B64C] scale-105'
                          : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                      }`}
                      title={av.desc}
                    >
                      {av.icon}
                    </button>
                  ))}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#81B64C]" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Status Flair Picker */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  2. Status Flair Icon
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FLAIR_OPTIONS.map((fl) => (
                    <button
                      key={fl.id}
                      type="button"
                      onClick={() => setEditFlair(fl.icon)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        editFlair === fl.icon
                          ? 'bg-[#81B64C]/30 border-[#81B64C] text-white'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <span>{fl.icon}</span>
                      <span className="text-[11px]">{fl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Country / Region
                  </label>
                  <select
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Preferred Playing Style
                  </label>
                  <select
                    value={editStyle}
                    onChange={(e) => setEditStyle(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                  >
                    <option value="Tactical">Tactical (Aggressive Attack)</option>
                    <option value="Positional">Positional (Strategic Structure)</option>
                    <option value="Universal">Universal (All-Round Balance)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Favorite Opening (White)
                  </label>
                  <select
                    value={editOpeningWhite}
                    onChange={(e) => setEditOpeningWhite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                  >
                    {OPENINGS_WHITE.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Favorite Defense (Black)
                  </label>
                  <select
                    value={editOpeningBlack}
                    onChange={(e) => setEditOpeningBlack(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                  >
                    {OPENINGS_BLACK.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Status Message / Mood
                  </label>
                  <input
                    type="text"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                    placeholder="e.g. Grinding tactical puzzles"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Bio / Motto
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                    placeholder="Tell other players about your chess ambitions"
                  />
                </div>
              </div>

              {/* Save Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#81B64C] hover:bg-[#689E39] text-white text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. THE CHESS.COM RATING CARDS GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Official Ratings & Game Types</span>
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            Calibrated via Standard Chess Elo (K=32)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Rapid Rating (Main Elo) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-[#81B64C] transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Rapid
              </span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Primary</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {currentRating}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
              <span>Peak: <strong className="text-slate-700 dark:text-zinc-300">{peakRating}</strong></span>
              <span>{totalMatches} games</span>
            </div>
          </div>

          {/* Blitz Rating */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Blitz
              </span>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Speed</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {profile.blitzRating || currentRating}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
              <span>Peak: <strong className="text-slate-700 dark:text-zinc-300">{Math.max(peakRating, profile.blitzRating || 400)}</strong></span>
              <span>Fast Tactical</span>
            </div>
          </div>

          {/* Tactical Puzzles Rating */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-purple-500 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-purple-500" />
                Puzzles
              </span>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Tactics</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {profile.puzzleRating || (currentRating + 50)}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
              <span>Solved: <strong className="text-slate-700 dark:text-zinc-300">{playerStats?.puzzlesSolved || 0}</strong></span>
              <span>Calculation</span>
            </div>
          </div>

          {/* Lessons / Curriculum Mastery */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                Lessons
              </span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Coach</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {playerStats?.lessonsCompleted || 0}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center justify-between">
              <span>Completed</span>
              <span className="text-blue-500 font-semibold cursor-pointer" onClick={() => onNavigate('/learn')}>View Map →</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. CHESS.COM ICONIC WIN/DRAW/LOSS RATIO BAR ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-blue-500" />
              <span>Career Record & Match Performance</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Total {totalMatches} rated matches played
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-3 h-3 rounded-sm bg-[#81B64C]" />
              <span className="text-slate-700 dark:text-zinc-300">{winCount} Won ({winRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-3 h-3 rounded-sm bg-zinc-400 dark:bg-zinc-600" />
              <span className="text-slate-700 dark:text-zinc-300">{drawCount} Drawn ({drawRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-3 h-3 rounded-sm bg-rose-500" />
              <span className="text-slate-700 dark:text-zinc-300">{lossCount} Lost ({lossRate}%)</span>
            </div>
          </div>
        </div>

        {/* The Visual Segmented Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-zinc-800">
          {totalMatches === 0 ? (
            <div className="w-full h-full bg-zinc-700/40 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase">
              No rated games played yet
            </div>
          ) : (
            <>
              {winCount > 0 && (
                <div
                  style={{ width: `${winRate}%` }}
                  className="h-full bg-[#81B64C] transition-all duration-500"
                  title={`${winCount} Wins (${winRate}%)`}
                />
              )}
              {drawCount > 0 && (
                <div
                  style={{ width: `${drawRate}%` }}
                  className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                  title={`${drawCount} Draws (${drawRate}%)`}
                />
              )}
              {lossCount > 0 && (
                <div
                  style={{ width: `${lossRate}%` }}
                  className="h-full bg-rose-500 transition-all duration-500"
                  title={`${lossCount} Losses (${lossRate}%)`}
                />
              )}
            </>
          )}
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Current Streak</div>
            <div className="text-lg font-black text-amber-500 flex items-center gap-1 mt-0.5">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{streak} Games</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Best Streak</div>
            <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{Math.max(streak, longestStreak)} Games</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Win Ratio</div>
            <div className="text-lg font-black text-emerald-500 mt-0.5">
              {winRate}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Next Milestone</div>
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-1">
              {nextMilestone} Elo ({progressToNext}% to tier)
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. TABS: RATING PROGRESSION, MATCH ARCHIVE & ACHIEVEMENTS ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ratings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ratings'
                  ? 'bg-[#81B64C] text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Rating History</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#81B64C] text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Game Archive ({recentGames.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'achievements'
                  ? 'bg-[#81B64C] text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Trophy Room</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 dark:text-zinc-500 hidden sm:block">
            Updated live after every move
          </div>
        </div>

        {/* Tab 1: Rating Progression Timeline */}
        {activeTab === 'ratings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Official Rating History Log
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Starting rating 400 • Increases on wins (+16), decreases on losses (-16)
              </span>
            </div>

            {profile.ratingHistory && profile.ratingHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                {profile.ratingHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        item.result === 'WIN'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.result === 'LOSS'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {item.result === 'WIN' ? 'W' : item.result === 'LOSS' ? 'L' : 'D'}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          vs {item.opponent}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                          {item.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <span className={`font-black text-sm tabular-nums ${
                        item.delta > 0
                          ? 'text-emerald-500'
                          : item.delta < 0
                          ? 'text-rose-500'
                          : 'text-zinc-400'
                      }`}>
                        {item.delta > 0 ? `+${item.delta}` : item.delta === 0 ? '±0' : item.delta}
                      </span>
                      <div className="min-w-[65px]">
                        <div className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                          {item.rating}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">
                          Elo
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                Play your first rated match to start building your rating progression history!
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recent Match Archive (Chess.com Style) */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {(['ALL', 'WINS', 'LOSSES'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setGameFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      gameFilter === f
                        ? 'bg-slate-900 dark:bg-zinc-700 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onNavigate('/play')}
                className="px-3 py-1.5 rounded-lg bg-[#81B64C] hover:bg-[#689E39] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>New Match</span>
              </button>
            </div>

            {filteredGames.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                {filteredGames.slice(0, 10).map((game) => {
                  const isWin = game.result === 'WHITE_WINS' || game.resultString.includes('Win');
                  const isLoss = game.result === 'BLACK_WINS' || game.resultString.includes('Loss');

                  return (
                    <div key={game.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          isWin
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isLoss
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {isWin ? '1-0' : isLoss ? '0-1' : '½-½'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{game.whitePlayer} vs {game.blackPlayer}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">• {game.opening?.name || 'Standard Game'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {game.date} · Result: {game.resultString}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate(`/analyze?gameId=${game.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-[#81B64C] hover:bg-[#689E39] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Review Game</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                <p>No games found matching your filter.</p>
                <button
                  onClick={() => onNavigate('/play')}
                  className="px-4 py-2 rounded-xl bg-[#81B64C] text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Play Rated Bot Match
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Trophy Room / Achievements (Chess.com Style) */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Player Trophies & Milestones ({achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Unlock badges by playing games and completing drills
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    ach.unlocked
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 opacity-60 text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    ach.unlocked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-zinc-800 border border-zinc-700'
                  }`}>
                    {ach.icon}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold">{ach.title}</div>
                      {ach.unlocked ? (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-black">Unlocked</span>
                      ) : (
                        <span className="text-[9px] font-bold text-zinc-500">Locked</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {ach.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. CHESS PERSONALITY & PREFERENCES CARD ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#81B64C]" />
          <span>Chess Style & Personality</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-1">
              Playing Philosophy
            </span>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {profile.preferredStyle || 'Tactical'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {profile.preferredStyle === 'Tactical'
                ? 'Thrives in sharp, dynamic positions with calculating accuracy.'
                : profile.preferredStyle === 'Positional'
                ? 'Excels in pawn structures, maneuvering, and gradual advantages.'
                : 'Balanced player adaptable to both sharp tactical melee and calm endgames.'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-1">
              Favorite Weapon (White)
            </span>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {profile.favoriteOpening || 'Italian Game'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Primary weapon chosen when holding the first-move advantage.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-1">
              Favorite Shield (Black)
            </span>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {profile.favoriteOpeningBlack || 'Sicilian Defense'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Chosen response against aggressive opening assaults.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
