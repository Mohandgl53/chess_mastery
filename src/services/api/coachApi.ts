import { apiClient } from './client';
import { CoachMessage, CoachMessageType } from '../../types/coach';
import { PostGameAnalysis, GameResult } from '../../types/game';
import { PieceColor } from '../../types/chess';

export interface ExplainMovePayload {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveNumber: number;
  playerColor: 'w' | 'b';
  classification: string;
  bestMove?: string;
  evalBefore?: number;
  evalAfter?: number;
  evalDelta?: number;
  principalVariation?: string[];
  candidateMoves?: Array<{ san: string; score: number; explanation?: string }>;
  openingName?: string;
  coachMode?: 'FULL_COACHING' | 'IMPORTANT_MISTAKES' | 'HINTS_ONLY' | 'POST_GAME_ONLY';
  gameId?: string;
}

export interface HintPayload {
  fen: string;
  playerColor: 'w' | 'b';
  hintLevel: 1 | 2 | 3;
  candidateMoves?: Array<{ san: string; score: number; pv?: string[] }>;
  openingName?: string;
  gameId?: string;
}

export interface ChatPayload {
  query: string;
  fen: string;
  playerColor: 'w' | 'b';
  moveHistorySan?: string[];
  openingName?: string;
  lastMoveEvaluation?: {
    san: string;
    score: number;
    bestMove?: string;
  };
  gameId?: string;
}

export interface PostGameReviewPayload {
  moves: Array<{
    moveNumber: number;
    san: string;
    color: 'w' | 'b';
    evaluation?: number;
    classification?: string;
  }>;
  playerColor: 'w' | 'b';
  result: 'WHITE_WINS' | 'BLACK_WINS' | 'DRAW';
  resultReason: string;
  openingName?: string;
  accuracyWhite?: number;
  accuracyBlack?: number;
  gameId?: string;
}

export interface BackendCoachResponse {
  title: string;
  content: string;
  lesson?: string;
  suggestedMove?: string;
  bestAlternative?: string;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
}

export interface BackendPostGameResponse {
  summary: string;
  keyLesson: string;
  bestMove: string;
  biggestMistake?: string;
  phaseReviews: {
    opening: { title: string; positivePoints: string[]; negativePoints: string[] };
    middlegame: { title: string; positivePoints: string[]; negativePoints: string[] };
    endgame: { title: string; positivePoints: string[]; negativePoints: string[] };
  };
}

export async function explainMoveApi(payload: ExplainMovePayload): Promise<CoachMessage> {
  const res = await apiClient<{ data: BackendCoachResponse }>('/coach/explain', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const raw = res.data;
  return {
    id: `llm-explain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: (payload.classification as CoachMessageType) || 'GOOD_MOVE',
    title: raw.title,
    content: raw.content,
    lesson: raw.lesson,
    suggestedMove: raw.suggestedMove,
    bestAlternative: raw.bestAlternative,
    highlightSquares: raw.highlightSquares,
    arrowFromTo: raw.arrowFromTo,
    timestamp: Date.now()
  };
}

export async function getHintApi(payload: HintPayload): Promise<CoachMessage> {
  const res = await apiClient<{ data: BackendCoachResponse }>('/coach/hint', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const raw = res.data;
  return {
    id: `llm-hint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'HINT',
    title: raw.title,
    content: raw.content,
    lesson: raw.lesson,
    suggestedMove: raw.suggestedMove,
    highlightSquares: raw.highlightSquares,
    timestamp: Date.now()
  };
}

export async function chatCoachApi(payload: ChatPayload): Promise<CoachMessage> {
  const res = await apiClient<{ data: BackendCoachResponse }>('/coach/chat', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const raw = res.data;
  return {
    id: `llm-chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'GENERAL_ADVICE',
    title: raw.title,
    content: raw.content,
    lesson: raw.lesson,
    suggestedMove: raw.suggestedMove,
    highlightSquares: raw.highlightSquares,
    timestamp: Date.now()
  };
}

export async function postGameReviewApi(
  payload: PostGameReviewPayload,
  fallbackBase: {
    result: GameResult;
    resultReason: string;
    playerColor: PieceColor;
    opening: { eco: string; name: string };
    accuracy: { player: number; opponent: number };
    moveBreakdown: { best: number; excellent: number; good: number; inaccuracies: number; mistakes: number; blunders: number };
  }
): Promise<PostGameAnalysis> {
  const res = await apiClient<{ data: BackendPostGameResponse }>('/coach/post-game', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const raw = res.data;
  return {
    result: fallbackBase.result,
    resultReason: fallbackBase.resultReason,
    playerColor: fallbackBase.playerColor,
    accuracy: fallbackBase.accuracy,
    opening: fallbackBase.opening,
    bestMove: raw.bestMove || 'e4',
    biggestMistake: raw.biggestMistake,
    keyLesson: raw.keyLesson || 'Review piece coordination and defense.',
    moveBreakdown: fallbackBase.moveBreakdown,
    phaseReviews: {
      opening: raw.phaseReviews.opening,
      middlegame: raw.phaseReviews.middlegame,
      endgame: raw.phaseReviews.endgame
    }
  };
}
