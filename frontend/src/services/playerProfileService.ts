import { PlayerProfile, RatingHistoryEntry } from '../types/user';

const PROFILE_EVENT = 'chess_mastery_profile_changed';

export function getStorageKey(userId?: string): string {
  if (userId && userId.trim()) {
    return `chess_mastery_player_profile_${userId.trim()}`;
  }
  try {
    const active = localStorage.getItem('chess_mastery_active_user_id');
    if (active) return `chess_mastery_player_profile_${active}`;
  } catch {}
  return 'chess_mastery_player_profile_guest';
}

export const INITIAL_USER_PROFILE: PlayerProfile = {
  id: 'usr-local-player',
  name: 'Player',
  username: 'player',
  avatarUrl: '♞',
  bio: 'Chess tactician striving for master-level calculation and positional harmony.',
  country: 'Global 🌐',
  preferredStyle: 'Tactical',
  favoriteOpening: 'Sicilian Defense',
  favoriteOpeningBlack: 'French Defense',
  flair: '♟️',
  joinedDate: 'Joined Oct 2026',
  statusMessage: 'Ready to play & learn chess',
  rapidRating: 400,
  blitzRating: 400,
  bulletRating: 400,
  puzzleRating: 450,
  rating: 400,
  peakRating: 400,
  winCount: 0,
  lossCount: 0,
  drawCount: 0,
  streakDays: 1,
  ratingHistory: [
    {
      date: 'Starting Calibration',
      rating: 400,
      delta: 0,
      opponent: 'Provisional Baseline',
      result: 'DRAW'
    }
  ],
  skills: {
    openings: 50,
    tactics: 50,
    middlegame: 50,
    endgame: 50,
    calculation: 50,
    timeManagement: 50
  },
  weaknesses: [],
  strengths: [],
  recommendations: [],
  coachMemory: {
    totalGamesAnalyzed: 0,
    primaryWeakness: 'None detected yet',
    primaryStrength: 'Rapid Piece Development',
    recentObservations: ['Play your first game to unlock personalized AI coach diagnosis.'],
    lastCoachingTip: 'Focus on piece activity and king safety in your opening moves.'
  }
};

export function createDefaultUserProfile(
  userId?: string,
  defaults?: { displayName?: string; email?: string; rating?: number }
): PlayerProfile {
  const name = defaults?.displayName?.trim() || (defaults?.email ? defaults.email.split('@')[0] : 'Player');
  const username = defaults?.email ? defaults.email.split('@')[0] : 'player';
  const rating = defaults?.rating ?? 400;

  return {
    ...INITIAL_USER_PROFILE,
    id: userId || 'usr-local-player',
    name,
    username,
    rating,
    rapidRating: rating,
    blitzRating: rating,
    bulletRating: rating,
    peakRating: rating,
    joinedDate: `Joined ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    ratingHistory: [
      {
        date: 'Account Created',
        rating,
        delta: 0,
        opponent: 'Provisional Baseline',
        result: 'DRAW'
      }
    ]
  };
}

/**
 * Load persisted profile or initialize with 400 starting rating
 */
export function loadPlayerProfile(
  userId?: string,
  defaults?: {
    displayName?: string;
    email?: string;
    rating?: number;
    avatarUrl?: string | null;
    bio?: string | null;
    country?: string | null;
    preferredStyle?: string | null;
    favoriteOpening?: string | null;
    favoriteOpeningBlack?: string | null;
    flair?: string | null;
    statusMessage?: string | null;
  }
): PlayerProfile {
  if (typeof window === 'undefined') return createDefaultUserProfile(userId, defaults);

  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = createDefaultUserProfile(userId, defaults);
      if (defaults?.avatarUrl) initial.avatarUrl = defaults.avatarUrl;
      if (defaults?.bio) initial.bio = defaults.bio;
      if (defaults?.country) initial.country = defaults.country;
      if (defaults?.preferredStyle) initial.preferredStyle = defaults.preferredStyle as any;
      if (defaults?.favoriteOpening) initial.favoriteOpening = defaults.favoriteOpening;
      if (defaults?.favoriteOpeningBlack) initial.favoriteOpeningBlack = defaults.favoriteOpeningBlack;
      if (defaults?.flair) initial.flair = defaults.flair;
      if (defaults?.statusMessage) initial.statusMessage = defaults.statusMessage;
      savePlayerProfile(initial, userId);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const fallbackName = defaults?.displayName?.trim() || (defaults?.email ? defaults.email.split('@')[0] : parsed.name || 'Player');
    const fallbackRating = defaults?.rating ?? parsed.rating ?? 400;

    return {
      ...INITIAL_USER_PROFILE,
      ...parsed,
      id: userId || parsed.id || 'usr-local-player',
      name: parsed.name || fallbackName,
      username: parsed.username || (defaults?.email ? defaults.email.split('@')[0] : 'player'),
      avatarUrl: defaults?.avatarUrl ?? parsed.avatarUrl ?? '♞',
      bio: defaults?.bio ?? parsed.bio ?? INITIAL_USER_PROFILE.bio,
      country: defaults?.country ?? parsed.country ?? INITIAL_USER_PROFILE.country,
      preferredStyle: (defaults?.preferredStyle ?? parsed.preferredStyle ?? INITIAL_USER_PROFILE.preferredStyle) as any,
      favoriteOpening: defaults?.favoriteOpening ?? parsed.favoriteOpening ?? INITIAL_USER_PROFILE.favoriteOpening,
      favoriteOpeningBlack: defaults?.favoriteOpeningBlack ?? parsed.favoriteOpeningBlack ?? INITIAL_USER_PROFILE.favoriteOpeningBlack,
      flair: defaults?.flair ?? parsed.flair ?? INITIAL_USER_PROFILE.flair,
      statusMessage: defaults?.statusMessage ?? parsed.statusMessage ?? INITIAL_USER_PROFILE.statusMessage,
      rating: fallbackRating,
      rapidRating: parsed.rapidRating ?? fallbackRating,
      blitzRating: parsed.blitzRating ?? fallbackRating,
      bulletRating: parsed.bulletRating ?? fallbackRating,
      puzzleRating: parsed.puzzleRating ?? 450,
      peakRating: Math.max(parsed.peakRating ?? fallbackRating, fallbackRating),
      ratingHistory: Array.isArray(parsed.ratingHistory) && parsed.ratingHistory.length > 0
        ? parsed.ratingHistory
        : [
            {
              date: 'Account Created',
              rating: fallbackRating,
              delta: 0,
              opponent: 'Provisional Baseline',
              result: 'DRAW'
            }
          ]
    };
  } catch (err) {
    console.error('Error loading player profile from localStorage:', err);
    return createDefaultUserProfile(userId, defaults);
  }
}

/**
 * Save player profile to localStorage and notify all listeners
 */
export function savePlayerProfile(profile: PlayerProfile, userId?: string): void {
  if (typeof window === 'undefined') return;

  const key = getStorageKey(userId || profile.id);
  try {
    localStorage.setItem(key, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: profile }));
  } catch (err) {
    console.error('Error saving player profile to localStorage:', err);
  }
}

/**
 * Calculate dynamic Elo change after a match
 */
export function calculateMatchRating(
  currentRating: number,
  botRating: number,
  result: 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW',
  playerColor: 'w' | 'b'
): { delta: number; newRating: number; matchResult: 'WIN' | 'LOSS' | 'DRAW' } {
  const isWin = result === (playerColor === 'w' ? 'WHITE_WINS' : 'BLACK_WINS');
  const isDraw = result === 'DRAW';
  const matchResult: 'WIN' | 'LOSS' | 'DRAW' = isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS';

  // Standard Elo formula with K-factor = 32 for dynamic rating progression
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (botRating - currentRating) / 400));
  const actualScore = isWin ? 1.0 : isDraw ? 0.5 : 0.0;

  let delta = Math.round(K * (actualScore - expectedScore));

  // Intuitive floors & ceilings so victories always feel rewarding
  if (isWin) {
    delta = Math.max(delta, 12);
  } else if (isDraw) {
    if (botRating > currentRating) {
      delta = Math.max(4, Math.round((botRating - currentRating) / 50));
    } else {
      delta = 0;
    }
  } else {
    if (botRating > currentRating + 300) {
      delta = Math.min(-4, Math.max(-12, delta));
    } else {
      delta = Math.min(delta, -8);
    }
  }

  // Never drop below 100 rating
  const newRating = Math.max(100, currentRating + delta);
  return { delta: newRating - currentRating, newRating, matchResult };
}

/**
 * Update profile statistics and rating when a game finishes
 */
export function recordCompletedMatch(
  opponentName: string,
  opponentRating: number,
  result: 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW',
  playerColor: 'w' | 'b',
  userId?: string
): { updatedProfile: PlayerProfile; delta: number } {
  const current = loadPlayerProfile(userId);
  const { delta, newRating, matchResult } = calculateMatchRating(
    current.rating,
    opponentRating,
    result,
    playerColor
  );

  const newHistoryEntry: RatingHistoryEntry = {
    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    rating: newRating,
    delta,
    opponent: opponentName,
    result: matchResult
  };

  const updatedProfile: PlayerProfile = {
    ...current,
    rating: newRating,
    rapidRating: newRating,
    peakRating: Math.max(current.peakRating, newRating),
    winCount: matchResult === 'WIN' ? current.winCount + 1 : current.winCount,
    lossCount: matchResult === 'LOSS' ? current.lossCount + 1 : current.lossCount,
    drawCount: matchResult === 'DRAW' ? current.drawCount + 1 : current.drawCount,
    ratingHistory: [newHistoryEntry, ...(current.ratingHistory || [])].slice(0, 50)
  };

  savePlayerProfile(updatedProfile, userId);
  return { updatedProfile, delta };
}

/**
 * Update custom profile details (name, avatar, bio, style, country, opening)
 */
export function updatePlayerProfile(updates: Partial<PlayerProfile>, userId?: string): PlayerProfile {
  const current = loadPlayerProfile(userId);
  const updated: PlayerProfile = {
    ...current,
    ...updates,
    peakRating: updates.rating ? Math.max(current.peakRating, updates.rating) : current.peakRating
  };
  savePlayerProfile(updated, userId);
  return updated;
}
