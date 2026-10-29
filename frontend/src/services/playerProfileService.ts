import { PlayerProfile, RatingHistoryEntry } from '../types/user';

const STORAGE_KEY = 'chess_mastery_player_profile';
const PROFILE_EVENT = 'chess_mastery_profile_changed';

export const INITIAL_USER_PROFILE: PlayerProfile = {
  id: 'usr-local-player',
  name: 'Player',
  username: 'player',
  avatarUrl: '♞',
  bio: 'Chess tactician striving for master-level calculation and positional harmony.',
  country: 'Global 🌐',
  preferredStyle: 'Tactical',
  favoriteOpening: 'Sicilian Defense',
  rating: 400,
  peakRating: 400,
  winCount: 0,
  lossCount: 0,
  drawCount: 0,
  streakDays: 1,
  ratingHistory: [
    {
      date: 'Starting Rating',
      rating: 400,
      delta: 0,
      opponent: 'Provisional Calibration',
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

/**
 * Load persisted profile or initialize with 400 starting rating
 */
export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') return INITIAL_USER_PROFILE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      savePlayerProfile(INITIAL_USER_PROFILE);
      return INITIAL_USER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_USER_PROFILE,
      ...parsed,
      rating: parsed.rating ?? 400,
      peakRating: parsed.peakRating ?? parsed.rating ?? 400,
      ratingHistory: Array.isArray(parsed.ratingHistory) && parsed.ratingHistory.length > 0
        ? parsed.ratingHistory
        : INITIAL_USER_PROFILE.ratingHistory
    };
  } catch (err) {
    console.error('Error loading player profile from localStorage:', err);
    return INITIAL_USER_PROFILE;
  }
}

/**
 * Save player profile to localStorage and notify all listeners
 */
export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
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
    // Drawing against a higher-rated bot gives positive elo
    if (botRating > currentRating) {
      delta = Math.max(4, Math.round((botRating - currentRating) / 50));
    } else {
      delta = 0;
    }
  } else {
    // Loss against higher bot shouldn't penalize too brutally
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
  playerColor: 'w' | 'b'
): { updatedProfile: PlayerProfile; delta: number } {
  const current = loadPlayerProfile();
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
    peakRating: Math.max(current.peakRating, newRating),
    winCount: matchResult === 'WIN' ? current.winCount + 1 : current.winCount,
    lossCount: matchResult === 'LOSS' ? current.lossCount + 1 : current.lossCount,
    drawCount: matchResult === 'DRAW' ? current.drawCount + 1 : current.drawCount,
    ratingHistory: [newHistoryEntry, ...(current.ratingHistory || [])].slice(0, 50)
  };

  savePlayerProfile(updatedProfile);
  return { updatedProfile, delta };
}

/**
 * Update custom profile details (name, avatar, bio, style, country, opening)
 */
export function updatePlayerProfile(updates: Partial<PlayerProfile>): PlayerProfile {
  const current = loadPlayerProfile();
  const updated: PlayerProfile = {
    ...current,
    ...updates,
    peakRating: updates.rating ? Math.max(current.peakRating, updates.rating) : current.peakRating
  };
  savePlayerProfile(updated);
  return updated;
}
