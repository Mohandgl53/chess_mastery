/** Minimal RAG chunk shape used by LLM providers — avoids circular import with rag.retrieval.service */
export interface RagChunks {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface PlayerMemoryContext {
  tacticsSkill?: number;
  calculationSkill?: number;
  openingSkill?: number;
  middlegameSkill?: number;
  endgameSkill?: number;
  kingSafetySkill?: number;
  overallTrainingScore?: number;
  gamesAnalyzed?: number;
  activeWeaknesses?: Array<{ theme: string; category: string; count: number; confidence: number }>;
  strengths?: Array<{ theme: string; category: string; count: number }>;
  themeMasteries?: Array<{ theme: string; masteryScore: number; accuracy: number; streak: number }>;
}

export interface CoachExplanationContext {
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
  coachMode: 'FULL_COACHING' | 'IMPORTANT_MISTAKES' | 'HINTS_ONLY' | 'POST_GAME_ONLY';
  playerMemory?: PlayerMemoryContext;
}

export interface CoachHintContext {
  fen: string;
  playerColor: 'w' | 'b';
  hintLevel: 1 | 2 | 3;
  candidateMoves: Array<{ san: string; score: number; pv?: string[] }>;
  openingName?: string;
  playerMemory?: PlayerMemoryContext;
}

export interface CoachChatContext {
  query: string;
  fen: string;
  playerColor: 'w' | 'b';
  moveHistorySan: string[];
  openingName?: string;
  lastMoveEvaluation?: {
    san: string;
    score: number;
    bestMove?: string;
  };
  playerMemory?: PlayerMemoryContext;
}

export interface PostGameReviewContext {
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
  playerMemory?: PlayerMemoryContext;
}

export interface CoachStructuredOutput {
  title: string;
  content: string;
  lesson?: string;
  suggestedMove?: string;
  bestAlternative?: string;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
}

export interface PhaseReviewSection {
  title: string;
  positivePoints: string[];
  negativePoints: string[];
}

export interface PostGameStructuredOutput {
  summary: string;
  keyLesson: string;
  bestMove: string;
  biggestMistake?: string;
  phaseReviews: {
    opening: PhaseReviewSection;
    middlegame: PhaseReviewSection;
    endgame: PhaseReviewSection;
  };
}

export interface ILLMProvider {
  readonly providerName: string;
  explainMove(context: CoachExplanationContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput>;
  generateHint(context: CoachHintContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput>;
  answerQuestion(context: CoachChatContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput>;
  generatePostGameReview(context: PostGameReviewContext, ragChunks?: RagChunks[]): Promise<PostGameStructuredOutput>;
}
