import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlayerProfile as LocalPlayerProfile, RatingHistoryEntry } from '../types/user';
import { useAuth } from '../auth/AuthProvider';
import { gameApi, BackendGameDto, mapBackendGameToSavedGame } from '../services/api/gameApi';
import { playerApi, BackendPlayerProfile } from '../services/api/playerApi';
import { SavedGame } from '../types/game';
import { updatePlayerProfile, loadPlayerProfile } from '../services/playerProfileService';
import { compressAvatarImage } from '../utils/imageCompressor';
import {
  Trophy,
  Award,
  Target,
  TrendingUp,
  Share2,
  CheckCircle2,
  Edit3,
  Check,
  X,
  Shield,
  Zap,
  MapPin,
  Calendar,
  Upload,
  BarChart2,
  Clock,
  Play,
  Loader2,
  Trash2,
  ArrowUpRight
} from 'lucide-react';

interface ProfilePageProps {
  userProfile: LocalPlayerProfile;
  onNavigate: (route: string) => void;
}

const COUNTRY_OPTIONS = [
  'Global',
  'India',
  'United States',
  'United Kingdom',
  'Norway',
  'Canada',
  'Germany',
  'France',
  'Spain',
  'Brazil',
  'Japan',
  'Australia',
  'Armenia',
  'Uzbekistan',
  'Netherlands',
  'Poland',
  'Italy'
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile: initialProfile, onNavigate }) => {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Derive sanitized username and display name (strictly never exposing raw email)
  const effectiveDisplayName = user?.displayName?.trim() || initialProfile.name?.trim() || 'Player';
  const effectiveUsername = useMemo(() => {
    if (initialProfile.username && initialProfile.username !== 'player') {
      return initialProfile.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }
    return effectiveDisplayName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'player';
  }, [initialProfile.username, effectiveDisplayName]);

  // Format joined date professionally
  const memberSince = useMemo(() => {
    if (authProfile?.createdAt) {
      try {
        const d = new Date(authProfile.createdAt);
        return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      } catch {}
    }
    return initialProfile.joinedDate || 'Member since Oct 2026';
  }, [authProfile?.createdAt, initialProfile.joinedDate]);

  // Load user-scoped persisted profile
  const [profile, setProfile] = useState<LocalPlayerProfile>(() =>
    loadPlayerProfile(user?.id, {
      displayName: effectiveDisplayName,
      rating: authProfile?.rating ?? initialProfile.rating ?? 400,
      avatarUrl: authProfile?.avatarUrl,
      bio: authProfile?.bio,
      country: authProfile?.country || 'Global',
      statusMessage: authProfile?.statusMessage
    })
  );

  // Sync profile when user or auth profile updates
  useEffect(() => {
    setProfile(
      loadPlayerProfile(user?.id, {
        displayName: effectiveDisplayName,
        rating: authProfile?.rating ?? initialProfile.rating ?? 400,
        avatarUrl: authProfile?.avatarUrl,
        bio: authProfile?.bio,
        country: authProfile?.country || 'Global',
        statusMessage: authProfile?.statusMessage
      })
    );
  }, [
    user?.id,
    effectiveDisplayName,
    authProfile?.rating,
    authProfile?.avatarUrl,
    authProfile?.bio,
    authProfile?.country,
    authProfile?.statusMessage,
    initialProfile.rating
  ]);

  // Edit Drawer State
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable Form Fields
  const [editName, setEditName] = useState(profile.name || effectiveDisplayName);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl || '');
  const [editBio, setEditBio] = useState(profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.');
  const [editCountry, setEditCountry] = useState(profile.country || 'Global');

  // Match history & stats state
  const [recentGames, setRecentGames] = useState<SavedGame[]>([]);
  const [playerStats, setPlayerStats] = useState<BackendPlayerProfile | null>(null);
  const [gameFilter, setGameFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');
  const [activeTab, setActiveTab] = useState<'ratings' | 'history' | 'achievements'>('ratings');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
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

  // Fetch match history & stats from backend
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

  // Authoritative metrics
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

  // Clean, professional rank tier badge without emojis
  const rankTier = useMemo(() => {
    if (currentRating >= 2200) return { title: 'Grandmaster Tier', badge: 'GM Aspirant', accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10', nextTier: 2400 };
    if (currentRating >= 1800) return { title: 'Master Contender', badge: 'Master Tier', accent: 'text-purple-400 border-purple-500/30 bg-purple-500/10', nextTier: 2000 };
    if (currentRating >= 1400) return { title: 'Tactical Specialist', badge: 'Class A', accent: 'text-blue-400 border-blue-500/30 bg-blue-500/10', nextTier: 1600 };
    if (currentRating >= 1000) return { title: 'Club Competitor', badge: 'Intermediate', accent: 'text-teal-400 border-teal-500/30 bg-teal-500/10', nextTier: 1200 };
    if (currentRating >= 600) return { title: 'Rising Star', badge: 'Rising Tier', accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', nextTier: 800 };
    return { title: 'Novice Calibrator', badge: 'Novice 400', accent: 'text-zinc-400 border-zinc-700 bg-zinc-800/40', nextTier: 600 };
  }, [currentRating]);

  // Handle Photo Upload with compression & PostgreSQL persistence (invoked intentionally inside Edit Profile)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      showToast('Optimizing and compressing image...');

      const compressed = await compressAvatarImage(file, {
        maxDimension: 256,
        quality: 0.82
      });

      const kb = Math.round(compressed.compressedSizeBytes / 1024);
      setEditAvatar(compressed.dataUrl);

      // Persist to PostgreSQL database immediately
      await playerApi.updateProfile({ avatarUrl: compressed.dataUrl });

      // Update local storage and dispatch to all components
      const updated = updatePlayerProfile({
        avatarUrl: compressed.dataUrl
      }, user?.id);

      setProfile(updated);
      await refreshProfile();
      showToast(`Profile photo compressed (${kb} KB) and saved!`);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showToast(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove photo and reset to clean initial monogram
  const handleRemovePhoto = async () => {
    try {
      setIsSaving(true);
      setEditAvatar('');

      await playerApi.updateProfile({ avatarUrl: null });

      const updated = updatePlayerProfile({
        avatarUrl: ''
      }, user?.id);

      setProfile(updated);
      await refreshProfile();
      showToast('Profile photo removed.');
    } catch (err: any) {
      console.error('Remove photo error:', err);
      showToast('Could not remove photo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save profile changes (Display Name, Country, Bio) to PostgreSQL
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const payload = {
        displayName: editName.trim() || effectiveDisplayName,
        avatarUrl: editAvatar || null,
        bio: editBio.trim(),
        country: editCountry
      };

      await playerApi.updateProfile(payload);

      const updated = updatePlayerProfile({
        name: payload.displayName,
        avatarUrl: payload.avatarUrl || '',
        bio: payload.bio,
        country: payload.country
      }, user?.id);

      setProfile(updated);
      await refreshProfile();
      setIsEditing(false);
      showToast('Profile updated successfully.');
    } catch (err: any) {
      console.error('Save profile error:', err);
      showToast(err.message || 'Could not save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareProfile = () => {
    const text = `Chess Mastery Profile — ${profile.name} (@${effectiveUsername})
Rating: ${currentRating} (${rankTier.badge})
Peak: ${peakRating} | Win Rate: ${winRate}% (${winCount}W / ${lossCount}L / ${drawCount}D)
Training Streak: ${streak} Days
http://localhost:5173`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Profile link copied to clipboard.');
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

  // Clean achievements without WhatsApp-style emojis
  const achievements = useMemo(() => [
    {
      id: 'first-step',
      title: 'First Step',
      desc: 'Created your Chess Mastery account',
      icon: Shield,
      unlocked: true
    },
    {
      id: 'first-win',
      title: 'First Victory',
      desc: 'Won a rated match against an engine bot',
      icon: Trophy,
      unlocked: winCount >= 1
    },
    {
      id: 'rating-500',
      title: 'Rising Calibrator',
      desc: 'Achieved an Elo rating above 450',
      icon: TrendingUp,
      unlocked: currentRating >= 450
    },
    {
      id: 'hot-streak',
      title: 'Winning Streak',
      desc: 'Achieved a consecutive streak of 3+ games',
      icon: Zap,
      unlocked: streak >= 3 || longestStreak >= 3
    },
    {
      id: 'puzzle-solver',
      title: 'Tactical Precision',
      desc: 'Solved tactical training puzzles',
      icon: Target,
      unlocked: (playerStats?.puzzlesSolved || 0) > 0
    },
    {
      id: 'mastery-student',
      title: 'Curriculum Graduate',
      desc: 'Completed an interactive coaching lesson',
      icon: Award,
      unlocked: (playerStats?.lessonsCompleted || 0) > 0
    },
    {
      id: 'deep-analyzer',
      title: 'Game Reviewer',
      desc: 'Analyzed matches using the Grandmaster engine',
      icon: BarChart2,
      unlocked: (playerStats?.gamesAnalyzed || 0) > 0 || recentGames.length > 0
    }
  ], [winCount, currentRating, streak, longestStreak, playerStats, recentGames.length]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-zinc-900 text-white border border-zinc-700 shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. UNIFIED EXECUTIVE PROFILE CARD (No harsh top/bottom split, no black box) ── */}
      <div className="rounded-2xl bg-[#151922] border border-[#232B3B] text-white shadow-xl relative overflow-hidden">
        {/* Subtle ambient lighting accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="p-6 sm:p-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Avatar & Identity Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Clean Framed Avatar (NO intrusive hover in normal view) */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-emerald-900 via-emerald-800 to-teal-700 ring-2 ring-emerald-500/30 text-white flex items-center justify-center shadow-xl overflow-hidden">
                  {profile.avatarUrl && (profile.avatarUrl.startsWith('http') || profile.avatarUrl.startsWith('data:')) ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-emerald-100 select-none">
                      {profile.name ? profile.name[0]?.toUpperCase() : 'P'}
                    </span>
                  )}
                </div>

                {/* Online Indicator */}
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#151922]"
                  title="Online now"
                />
              </div>

              {/* Player Identity Information */}
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
                    {profile.name || effectiveDisplayName}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${rankTier.accent}`}>
                    {rankTier.badge}
                  </span>
                </div>

                {/* Username & Metadata (Strictly NO email displayed) */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 font-bold">@{effectiveUsername}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {memberSince}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.country || 'Global'}
                  </span>
                </div>

                {/* Bio / Motto */}
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed pt-1">
                  {profile.bio || 'Chess tactician striving for master-level calculation and positional harmony.'}
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setEditName(profile.name || effectiveDisplayName);
                  setEditAvatar(profile.avatarUrl || '');
                  setEditBio(profile.bio || '');
                  setEditCountry(profile.country || 'Global');
                  setIsEditing(!isEditing);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Close Editor' : 'Edit Profile'}</span>
              </button>

              <button
                onClick={handleShareProfile}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Share profile"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={() => onNavigate('/play')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Match</span>
              </button>
            </div>
          </div>

          {/* ── PROFILE EDIT DRAWER (Visible ONLY when Edit Profile is clicked) ── */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5 animate-in fade-in duration-200 bg-black/30 p-5 sm:p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Edit Profile Details
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Update your public identity and profile photo.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Upload Section inside Editor */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                    {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) ? (
                      <img src={editAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-zinc-400">
                        {editName ? editName[0]?.toUpperCase() : 'P'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Profile Photo</div>
                    <div className="text-[11px] text-zinc-400">
                      Upload a square photo. It will be compressed to ~20 KB and saved in PostgreSQL.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    disabled={isCompressing}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isCompressing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isCompressing ? 'Compressing...' : 'Upload New Photo'}</span>
                  </button>

                  {editAvatar && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSaving}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Remove profile photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Player Bio
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Tell opponents and students about your chess goals"
                  />
                </div>
              </div>

              {/* Save & Cancel Buttons */}
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
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. EXECUTIVE RATING & PERFORMANCE CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Rapid Rating */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Rapid Elo
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tabular-nums">
              {currentRating}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Peak: <span className="font-bold text-slate-700 dark:text-zinc-300">{peakRating}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Career Win Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Win Rate
            </span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {winCount} Wins
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tabular-nums">
              {winRate}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Total Matches: <span className="font-bold text-slate-700 dark:text-zinc-300">{totalMatches}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Training Streak */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Active Streak
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tabular-nums">
              {streak} <span className="text-xs font-bold text-slate-400">Days</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Longest: <span className="font-bold text-slate-700 dark:text-zinc-300">{longestStreak} Days</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tactical Puzzles */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Puzzles Solved
            </span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tabular-nums">
              {playerStats?.puzzlesSolved || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Attempted: <span className="font-bold text-slate-700 dark:text-zinc-300">{playerStats?.puzzlesAttempted || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. PERFORMANCE RATIO BAR ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-zinc-300">
            Career Record Breakdown
          </span>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {winCount} Won ({winRate}%)
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              {drawCount} Drawn ({drawRate}%)
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {lossCount} Lost ({lossRate}%)
            </span>
          </div>
        </div>

        {/* Segmented bar */}
        <div className="h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
          {totalMatches > 0 ? (
            <>
              <div style={{ width: `${winRate}%` }} className="bg-emerald-500 transition-all duration-500" />
              <div style={{ width: `${drawRate}%` }} className="bg-zinc-500 transition-all duration-500" />
              <div style={{ width: `${lossRate}%` }} className="bg-rose-500 transition-all duration-500" />
            </>
          ) : (
            <div className="w-full bg-zinc-700/50" />
          )}
        </div>
      </div>

      {/* ── 4. MATCH HISTORY & ACHIEVEMENTS TABS ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ratings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ratings'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Rating Progression
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Recent Matches ({recentGames.length})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'achievements'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Milestones
            </button>
          </div>
        </div>

        {/* Tab 1: Rating Progression History */}
        {activeTab === 'ratings' && (
          <div className="space-y-3">
            {profile.ratingHistory && profile.ratingHistory.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {profile.ratingHistory.slice(-8).reverse().map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] ${
                        item.result === 'WIN'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : item.result === 'LOSS'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-zinc-800 text-zinc-400'
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
                      <span className={`font-black text-xs tabular-nums ${
                        item.delta > 0
                          ? 'text-emerald-500'
                          : item.delta < 0
                          ? 'text-rose-500'
                          : 'text-zinc-400'
                      }`}>
                        {item.delta > 0 ? `+${item.delta}` : item.delta === 0 ? '±0' : item.delta}
                      </span>
                      <div className="min-w-[60px]">
                        <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                          {item.rating}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">Elo</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                Play your first rated match to record your rating progression history.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recent Matches */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
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

              <button
                onClick={() => onNavigate('/play')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>New Match</span>
              </button>
            </div>

            {filteredGames.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
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
                            <span className="text-[10px] text-zinc-400 font-normal">• {game.opening?.name || 'Standard Match'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {game.date} · Result: {game.resultString}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate(`/analyze?gameId=${game.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Review</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                <p>No games found matching your filter.</p>
                <button
                  onClick={() => onNavigate('/play')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Play Rated Bot Match
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Milestones & Achievements */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    ach.unlocked
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/25 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800/60 opacity-60 text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    ach.unlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{ach.title}</span>
                      {ach.unlocked && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">Unlocked</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {ach.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
