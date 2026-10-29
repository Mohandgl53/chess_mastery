import { PieceColor, SquareName } from './chess';

export type LessonCategory =
  | 'basics'
  | 'openings'
  | 'tactics'
  | 'middlegame'
  | 'endgame'
  | 'advanced';

export type LessonStepType = 'concept' | 'interactive_move' | 'question' | 'assessment';

export interface LessonStep {
  id: string;
  stepNumber: number;
  type: LessonStepType;
  title: string;
  instruction: string;
  explanation: string;
  fen: string;
  turn: PieceColor;
  expectedMove?: {
    from: SquareName;
    to: SquareName;
    san: string;
  };
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  coachTip: string;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
}

export interface Lesson {
  id: string;
  title: string;
  category: LessonCategory;
  categoryTitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  totalSteps: number;
  steps: LessonStep[];
  completed?: boolean;
  progressPercent?: number;
  currentStep?: number;
  themeTag?: string;
}

export interface CurriculumModule {
  id: LessonCategory;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  lessons: Lesson[];
}
