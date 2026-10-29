export type CoachMessageType =
  | 'GOOD_MOVE'
  | 'EXCELLENT_MOVE'
  | 'BOOK_MOVE'
  | 'INACCURACY'
  | 'MISTAKE'
  | 'BLUNDER'
  | 'TACTICAL_OPPORTUNITY'
  | 'OPENING_PRINCIPLE'
  | 'MIDDLEGAME_PLAN'
  | 'ENDGAME_LESSON'
  | 'HINT'
  | 'GENERAL_ADVICE'
  | 'COACH_UNAVAILABLE';

export type CoachMode =
  | 'FULL_COACHING'
  | 'IMPORTANT_MISTAKES'
  | 'HINTS_ONLY'
  | 'POST_GAME_ONLY';

export interface CoachMessage {
  id: string;
  type: CoachMessageType;
  title: string;
  content: string;
  lesson?: string;
  suggestedMove?: string;
  bestAlternative?: string;
  timestamp: number;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
  // Phase 8: Coach → Practice bridge
  practiceTheme?: string;
  practiceThemeTitle?: string;
}

export interface CoachPromptOption {
  id: string;
  label: string;
  query: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: number;
  coachDetails?: CoachMessage;
}
