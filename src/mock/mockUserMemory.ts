import { PlayerProfile } from '../types/user';

export const MOCK_USER_PROFILE: PlayerProfile = {
  id: 'usr-mohan-800',
  name: 'Mohan',
  username: 'mohan_chess',
  rating: 800,
  peakRating: 840,
  winCount: 14,
  lossCount: 9,
  drawCount: 3,
  streakDays: 5,
  skills: {
    openings: 60,
    tactics: 42,
    middlegame: 48,
    endgame: 25,
    calculation: 35,
    timeManagement: 68
  },
  weaknesses: [
    {
      id: 'w-1',
      type: 'KNIGHT_FORK',
      title: 'Knight Fork Vulnerability',
      description: 'You missed 5 opponent knight forks in your last 10 games, frequently on the c7 and f7 squares.',
      occurrences: 5,
      lastDetected: 'Yesterday',
      severity: 'high',
      recommendedTrainingId: 'practice-forks',
      recommendedTrainingTitle: 'Practice Knight Fork Defense'
    },
    {
      id: 'w-2',
      type: 'LATE_CASTLING',
      title: 'Delayed King Safety',
      description: 'You castled after move 12 in 6 recent games, leaving your king vulnerable to central attacks.',
      occurrences: 6,
      lastDetected: '2 days ago',
      severity: 'medium',
      recommendedTrainingId: 'practice-king-safety',
      recommendedTrainingTitle: 'King Safety & Castling Drills'
    },
    {
      id: 'w-3',
      type: 'BACK_RANK',
      title: 'Back-Rank Weakness',
      description: 'Frequent vulnerability to rook mate threats when your h/g pawns are untouched.',
      occurrences: 3,
      lastDetected: '4 days ago',
      severity: 'medium',
      recommendedTrainingId: 'practice-back-rank',
      recommendedTrainingTitle: 'Creating Luft & Back-Rank Defense'
    }
  ],
  strengths: [
    {
      id: 's-1',
      title: 'Center Pawn Control',
      description: 'Consistently open with central pawns (e4/d4) in 92% of games.',
      ratingImpact: +45
    },
    {
      id: 's-2',
      title: 'Pin Exploitation',
      description: 'Successfully capitalized on pinned enemy knights in 7 recent games.',
      ratingImpact: +30
    }
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: 'Practice Knight Forks',
      category: 'tactics',
      reason: 'Based on 5 missed fork patterns in recent games',
      targetWeakness: 'Knight Fork Vulnerability',
      durationMinutes: 8,
      route: '/practice'
    },
    {
      id: 'rec-2',
      title: 'Master King Safety & Castling',
      category: 'opening',
      reason: 'Improve castling timing to prevent central tactics',
      targetWeakness: 'Delayed King Safety',
      durationMinutes: 10,
      route: '/learn'
    },
    {
      id: 'rec-3',
      title: 'Back-Rank Tactical Puzzle Pack',
      category: 'practice',
      reason: 'Sharpen your calculation on back-rank defensive escapes',
      targetWeakness: 'Back-Rank Weakness',
      durationMinutes: 5,
      route: '/puzzles'
    }
  ],
  coachMemory: {
    totalGamesAnalyzed: 26,
    primaryWeakness: 'Knight fork awareness and delayed castling',
    primaryStrength: 'Aggressive opening center control with e4/d4',
    recentObservations: [
      'Showed improved patience in Italian Game opening structures.',
      'Needs to watch out for knight outposts on d5/c7.',
      'Tactical puzzle solve rate increased by 15% this week.'
    ],
    lastCoachingTip: 'Before moving an attacking piece, take 3 seconds to check if your opponent has a check or capture threat.'
  }
};
