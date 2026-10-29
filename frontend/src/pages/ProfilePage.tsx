import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlayerProfile as LocalPlayerProfile, RatingHistoryEntry } from '../types/user';
import { useAuth } from '../auth/AuthProvider';
import { gameApi, BackendGameDto, mapBackendGameToSavedGame } from '../services/api/gameApi';
import { playerApi, BackendPlayerProfile } from '../services/api/playerApi';
import { SavedGame } from '../types/game';
import { formatDisplayEmail } from '../utils/userDisplay';
import { updatePlayerProfile, loadPlayerProfile } from '../services/playerProfileService';
import {
  User, Trophy, Award, Flame, Swords, Target, Brain, TrendingUp,
  Share2, CheckCircle2, Sparkles, Edit3, Check, X, ArrowRight,
  Shield, Zap, Globe, Camera, Upload, RotateCcw, BarChart2
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
  { id: 'wizard', label: 'Wizard', icon: '🧙', desc: 'Deep Thinker' },
  { id: 'lion', label: 'Lion', icon: '🦁', desc: 'Fierce Competitor' },
  { id: 'eagle', label: 'Eagle', icon: '🦅', desc: 'High Vision' },
  { id: 'lightning', label: 'Blitz', icon: '⚡', desc: 'Speed Demon' },
  { id: 'crown', label: 'Champion', icon: '👑', desc: 'Title Hunter' },
  { id: 'pawn', label: 'Pioneer', icon: '♟️', desc: 'Pawn Stormer' }
];

const COUNTRY_OPTIONS = [
  'Global 🌐', 'India 🇮🇳', 'United States 🇺🇸', 'United Kingdom 🇬🇧',
  'Norway 🇳🇴', 'Canada 🇨🇦', 'Germany 🇩🇪', 'France 🇫🇷', 'Spain 🇪🇸',
  'Brazil 🇧🇷', 'Japan 🇯🇵', 'Australia 🇦🇺', 'Armenia 🇦🇲', 'Uzbekistan 🇺🇿'
];

const OPENING_OPTIONS = [
  'Sicilian Defense', 'French Defense', 'Italian Game', 'Ruy Lopez',
  "Queen's Gambit", 'Caro-Kann Defense', "King's Indian Defense",
  'English Opening', 'Scandinavian Defense', 'London System'
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile: initialProfile, onNavigate }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live persisted profile
  const [profile, setProfile] = useState<LocalPlayerProfile>(() => loadPlayerProfile());

  // Edit Drawer State
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Form Fields
  const [editName, setEditName] = useState(profile.name || 'Mohan');
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl || '♞');
  const [editBio, setEditBio] = useState(profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.');
  const [editCountry, setEditCountry] = useState(profile.country || 'Global 🌐');
  const [editStyle, setEditStyle] = useState<'Tactical' | 'Positional' | 'Universal'>(profile.preferredStyle || 'Tactical');
  const [editOpening, setEditOpening] = useState(profile.favoriteOpening || 'Sicilian Defense');
  const [editRating, setEditRating] = useState<number>(profile.rating || 400);

  // Match history & stats state
  const [recentGames, setRecentGames] = useState<SavedGame[]>([]);
  const [playerStats, setPlayerStats] = useState<BackendPlayerProfile | null>(null);
  const [gameFilter, setGameFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [activeTab, setActiveTab] = useState<'career' | 'history' | 'achievements'>('career');

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
          gameApi.getGames(1, 10).catch(() => ({ data: [] as BackendGameDto[], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
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
  }, []);

  const rating = profile.rating || 400;
  const peakRating = Math.max(profile.peakRating || 400, rating);
  const winCount = profile.winCount || 0;
  const lossCount = profile.lossCount || 0;
  const drawCount = profile.drawCount || 0;
  const streak = profile.streakDays || 1;
  const totalMatches = winCount + lossCount + drawCount;
  const winRate = totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0;

  const displayEmail = useMemo(() => {
    return formatDisplayEmail(user?.email || profile.username, profile.name);
  }, [user?.email, profile.username, profile.name]);

  // Rank Tier Badge dynamically driven by rating
  const rankTier = useMemo(() => {
    if (rating >= 2000) return { title: 'Grandmaster Aspirant', badge: '👑 Master Tier', color: 'from-amber-400 via-rose-500 to-purple-600' };
    if (rating >= 1600) return { title: 'Master Contender', badge: '♛ Master Tier', color: 'from-amber-500 to-amber-600' };
    if (rating >= 1400) return { title: 'Tactical Specialist', badge: '♜ Class A', color: 'from-purple-500 to-indigo-600' };
    if (rating >= 1000) return { title: 'Club Competitor', badge: '♝ Intermediate', color: 'from-blue-600 to-indigo-700' };
    if (rating >= 600) return { title: 'Developing Strategist', badge: '♞ Rising Star', color: 'from-emerald-500 to-teal-600' };
    return { title: 'Novice Apprentice', badge: '♟️ Novice (400 Tier)', color: 'from-zinc-600 to-zinc-800' };
  }, [rating]);

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
      name: editName.trim() || 'Mohan',
      avatarUrl: editAvatar,
      bio: editBio.trim(),
      country: editCountry,
      preferredStyle: editStyle,
      favoriteOpening: editOpening,
      rating: Math.max(100, editRating)
    });

    setProfile(updated);
    setIsEditing(false);
    showToast('Profile and avatar customized successfully!');
  };

  const handleShareProfile = () => {
    const text = `🏆 Chess Mastery Profile — ${profile.name}
⭐ Rating: ${rating} (${rankTier.badge})
🎯 Peak Rating: ${peakRating}
🔥 Training Streak: ${streak} Days
⚔️ Record: ${winCount}W / ${lossCount}L / ${drawCount}D (${winRate}% Win Rate)
♟️ Country: ${profile.country || 'Global 🌐'}
Join and train at: http://localhost:5173`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Profile summary copied to clipboard!');
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 text-white border border-zinc-700 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. HERO IDENTITY CARD ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#11141C] via-[#161B26] to-[#1E2536] text-white shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Avatar & Player Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr ${rankTier.color} text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-xl shadow-black/40 font-display ring-4 ring-white/10 overflow-hidden`}>
                {profile.avatarUrl ? (
                  profile.avatarUrl.startsWith('http') || profile.avatarUrl.startsWith('data:') ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl">{profile.avatarUrl}</span>
                  )
                ) : (
                  profile.name[0]?.toUpperCase()
                )}
              </div>
              <button
                onClick={() => {
                  setEditName(profile.name);
                  setEditAvatar(profile.avatarUrl || '♞');
                  setEditBio(profile.bio || '');
                  setEditCountry(profile.country || 'Global 🌐');
                  setEditStyle(profile.preferredStyle || 'Tactical');
                  setEditOpening(profile.favoriteOpening || 'Sicilian Defense');
                  setEditRating(profile.rating || 400);
                  setIsEditing(true);
                }}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center shadow transition-transform hover:scale-110 cursor-pointer"
                title="Change Avatar & Profile"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
                  {profile.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/15 uppercase tracking-wider">
                  {rankTier.badge}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {profile.preferredStyle || 'Tactical'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
                <span className="text-zinc-200 font-semibold">{rankTier.title}</span>
                <span>•</span>
                <span>{displayEmail}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <Globe className="w-3.5 h-3.5" />
                  {profile.country || 'Global 🌐'}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  Fav: {profile.favoriteOpening || 'Sicilian Defense'}
                </span>
              </div>

              <p className="text-xs text-zinc-300 max-w-lg leading-relaxed pt-1">
                "{profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.'}"
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setEditName(profile.name);
                setEditAvatar(profile.avatarUrl || '♞');
                setEditBio(profile.bio || '');
                setEditCountry(profile.country || 'Global 🌐');
                setEditStyle(profile.preferredStyle || 'Tactical');
                setEditOpening(profile.favoriteOpening || 'Sicilian Defense');
                setEditRating(profile.rating || 400);
                setIsEditing(!isEditing);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Customize Profile'}</span>
            </button>

            <button
              onClick={handleShareProfile}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={() => onNavigate('/play')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Play Rated Bot</span>
            </button>
          </div>
        </div>

        {/* ── INLINE PROFILE CUSTOMIZATION DRAWER ── */}
        {isEditing && (
          <div className="mt-6 pt-5 border-t border-zinc-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Customize Avatar & Identity
              </span>
              <span className="text-[11px] text-zinc-400">
                Changes apply instantly across your account
              </span>
            </div>

            {/* Avatar Selection Strip */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                1. Select Chess Avatar or Upload Your Own Photo
              </label>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setEditAvatar(av.icon)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer border ${
                      editAvatar === av.icon
                        ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                        : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300'
                    }`}
                    title={av.desc}
                  >
                    {av.icon}
                  </button>
                ))}

                {/* Custom Photo Upload Button */}
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
                  className="h-11 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Country / Region
                </label>
                <select
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Preferred Chess Style
                </label>
                <select
                  value={editStyle}
                  onChange={(e) => setEditStyle(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Tactical">Tactical (Calculation & Attack)</option>
                  <option value="Positional">Positional (Structure & Strategy)</option>
                  <option value="Universal">Universal (Adaptable Play)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Favorite Opening
                </label>
                <select
                  value={editOpening}
                  onChange={(e) => setEditOpening(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {OPENING_OPTIONS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Base Elo Rating (Starts at 400)
                </label>
                <input
                  type="number"
                  min="100"
                  max="2800"
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Player Bio / Motto
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. CAREER METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Rating */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Current Rating</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {rating} <span className="text-xs font-bold text-emerald-500">Elo</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Peak: <span className="font-semibold text-slate-700 dark:text-zinc-300">{peakRating} Elo</span>
          </div>
        </div>

        {/* Win / Loss / Draw Record */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Career Record</span>
            <Swords className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            <span className="text-emerald-500">{winCount}W</span>
            <span className="text-xs text-zinc-500 mx-1">/</span>
            <span className="text-rose-500">{lossCount}L</span>
            <span className="text-xs text-zinc-500 mx-1">/</span>
            <span className="text-zinc-400">{drawCount}D</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Win Rate: <span className="font-semibold text-emerald-500">{winRate}%</span> ({totalMatches} games)
          </div>
        </div>

        {/* Training Streak */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Daily Streak</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 tabular-nums">
            {streak} <span className="text-xs font-bold text-zinc-400">Days</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Consistent training habits
          </div>
        </div>

        {/* Rank Tier */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Division</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
            {rankTier.title}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Starts at 400 • Level up by winning
          </div>
        </div>
      </div>

      {/* ── 3. TABS: RATING PROGRESSION & MATCH HISTORY ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('career')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'career'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Rating Progression
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              Recent Match Replays
            </button>
          </div>

          <div className="text-xs text-slate-400 dark:text-zinc-500">
            Ratings update automatically after every match
          </div>
        </div>

        {/* Tab 1: Dynamic Rating Progression Timeline */}
        {activeTab === 'career' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Official Rating Timeline
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Calculated via standard Chess Elo (K=32)
              </span>
            </div>

            {profile.ratingHistory && profile.ratingHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                {profile.ratingHistory.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        item.result === 'WIN'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.result === 'LOSS'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-300'
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
                          Rating
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

        {/* Tab 2: Recent Match Replays */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {(['ALL', 'WINS', 'LOSSES'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setGameFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    gameFilter === f
                      ? 'bg-slate-900 dark:bg-zinc-700 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              {filteredGames.slice(0, 8).map((game) => (
                <div key={game.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{game.whitePlayer} vs {game.blackPlayer}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">• {game.opening?.name || 'Standard Game'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {game.date} · Result: {game.resultString}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate(`/analyze?gameId=${game.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <BarChart2 className="w-3 h-3" />
                    Analyze
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
