import {
  ICoachService,
  MoveAnalysisInput
} from './coachService';
import { CoachMessage, CoachPromptOption } from '../types/coach';
import { PostGameAnalysis, GameResult } from '../types/game';
import { MoveRecord } from '../types/chess';
import { chessEngine } from './chessEngine';
import { openingService } from './openingService';
import {
  explainMoveApi,
  getHintApi,
  chatCoachApi,
  postGameReviewApi
} from './api/coachApi';

export class LLMCoachService implements ICoachService {
  private cache: Map<string, CoachMessage> = new Map();
  private activeRequestId = 0;

  // Map move classifications to practice themes (matching backend puzzle themes)
  // Exported for testing
  getPracticeTheme(classification: string, moveNumber: number, moveSan: string): { theme: string; title: string } | undefined {
    // Handle empty moveSan
    if (!moveSan) {
      return undefined;
    }

    // Extract piece type from SAN (first character if uppercase letter, empty for pawn)
    const pieceType = moveSan.charAt(0);
    const isCapture = moveSan.includes('x');
    const isCheck = moveSan.includes('+');
    const isCastling = moveSan === 'O-O' || moveSan === 'O-O-O';

    // Opening phase (first 10 moves) -> CENTER_CONTROL
    if (moveNumber <= 10) {
      return { theme: 'CENTER_CONTROL', title: 'Center Occupation & Space' };
    }

    // Castling -> LATE_CASTLING (King Safety)
    if (isCastling) {
      return { theme: 'LATE_CASTLING', title: 'King Safety & Proactive Castling' };
    }

    // Blunders -> HANGING_PIECE (undefended pieces)
    if (classification === 'BLUNDER') {
      return { theme: 'HANGING_PIECE', title: 'Hanging & Undefended Pieces' };
    }

    // Tactical moves (captures/checks) -> map by piece type
    if (isCapture || isCheck) {
      switch (pieceType) {
        case 'N': // Knight -> FORK
          return { theme: 'FORK', title: 'Knight & Pawn Forks' };
        case 'B': // Bishop -> PIN
          return { theme: 'PIN', title: 'Pins & Paralyzed Pieces' };
        case 'R': // Rook -> could be SKEWER, BACK_RANK, or OPEN_FILE
          // If move is on back rank (rank 1 or 8) and checking, likely BACK_RANK
          if (isCheck && (moveSan.includes('1') || moveSan.includes('8'))) {
            return { theme: 'BACK_RANK', title: 'Back-Rank Defense & Mate' };
          }
          // If capture on open file, could be OPEN_FILE
          if (isCapture) {
            return { theme: 'OPEN_FILE', title: 'Rook Infiltration on Open Files' };
          }
          return { theme: 'SKEWER', title: 'Linear Skewers' };
        case 'Q': // Queen -> could be SKEWER, BACK_RANK, or OPEN_FILE
          if (isCheck && (moveSan.includes('1') || moveSan.includes('8'))) {
            return { theme: 'BACK_RANK', title: 'Back-Rank Defense & Mate' };
          }
          return { theme: 'SKEWER', title: 'Linear Skewers' };
        default: // Pawn captures -> FORK (pawn forks)
          return { theme: 'FORK', title: 'Knight & Pawn Forks' };
      }
    }

    // Mistakes -> PIN
    if (classification === 'MISTAKE') {
      return { theme: 'PIN', title: 'Pins & Paralyzed Pieces' };
    }

    // Inaccuracies -> CENTER_CONTROL (positional)
    if (classification === 'INACCURACY') {
      return { theme: 'CENTER_CONTROL', title: 'Center Occupation & Space' };
    }

    // Best/Excellent non-tactical moves in middlegame -> map by piece type
    if (classification === 'BEST' || classification === 'EXCELLENT') {
      switch (pieceType) {
        case 'N': // Knight -> FORK
          return { theme: 'FORK', title: 'Knight & Pawn Forks' };
        case 'B': // Bishop -> PIN
          return { theme: 'PIN', title: 'Pins & Paralyzed Pieces' };
        case 'R': // Rook -> SKEWER
          return { theme: 'SKEWER', title: 'Linear Skewers' };
        case 'Q': // Queen -> SKEWER
          return { theme: 'SKEWER', title: 'Linear Skewers' };
        default: // Pawn -> CENTER_CONTROL
          return { theme: 'CENTER_CONTROL', title: 'Center Occupation & Space' };
      }
    }

    // Endgame (simplified: moveNumber > 30) -> BACK_RANK
    if (moveNumber > 30) {
      return { theme: 'BACK_RANK', title: 'Back-Rank Defense & Mate' };
    }

    // Default for good moves in middlegame -> CENTER_CONTROL
    return { theme: 'CENTER_CONTROL', title: 'Center Occupation & Space' };
  }

  getPresetPrompts(): CoachPromptOption[] {
    return [
      { id: 'why_bad', label: 'Why is this bad?', query: 'Why was this move considered inaccurate or risky?' },
      { id: 'my_plan', label: "What's my plan?", query: 'What should my strategic plan be in this position?' },
      { id: 'opening_trap', label: 'Opening traps?', query: 'Are there any common tactical traps or tricks here?' },
      { id: 'what_to_play', label: 'What should I play?', query: 'What is the most constructive candidate move right now?' },
      { id: 'explain_position', label: 'Explain position', query: 'Can you break down the key features of this position?' }
    ];
  }

  async analyzeMove(input: MoveAnalysisInput): Promise<CoachMessage | null> {
    const { fenBefore, fenAfter, moveSan, moveNumber, moveHistorySan, coachMode, playerColor } = input;
    const opening = input.opening || openingService.identifyOpening(moveHistorySan);

    // If Post-Game only mode or Hints only mode, omit real-time messages
    if (coachMode === 'POST_GAME_ONLY' || coachMode === 'HINTS_ONLY') {
      return null;
    }

    // 1. Authoritative Stockfish evaluation
    const classificationData = await chessEngine.classifyMove(fenBefore, fenAfter, moveSan);
    const { classification, bestMove } = classificationData;

    // Filter by mode
    if (coachMode === 'IMPORTANT_MISTAKES') {
      if (classification !== 'BLUNDER' && classification !== 'MISTAKE' && classification !== 'INACCURACY') {
        return null;
      }
    }

    // 2. Check in-memory cache
    const cacheKey = `${fenBefore}:${moveSan}:${coachMode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 3. Increment request ID for stale-request protection
    const currentRequestId = ++this.activeRequestId;

    try {
      const candidates = await chessEngine.getCandidateMoves(fenAfter, 2);

      const message = await explainMoveApi({
        fenBefore,
        fenAfter,
        moveSan,
        moveNumber,
        playerColor,
        classification,
        bestMove,
        // Phase 8: Pass full Stockfish context for personalized, grounded coaching
        evalBefore: classificationData.evalBefore,
        evalAfter: classificationData.evalAfter,
        evalDelta: Math.round(classificationData.evalDelta * 100), // convert to centipawns
        principalVariation: classificationData.principalVariation,
        candidateMoves: candidates.map((c) => ({ san: c.san, score: c.score, explanation: c.explanation })),
        openingName: opening?.name,
        coachMode
      });

      // Discard if a newer move was requested while this request was inflight
      if (currentRequestId !== this.activeRequestId) {
        return null;
      }

      this.cache.set(cacheKey, message);
      return message;
    } catch (err) {
      console.warn('[LLMCoachService] Backend explain failed, AI coach unavailable:', err);
      // AI coach unavailable - return explicit unavailable message with engine analysis
      let content = `${moveSan} was played.`;
      if (classification === 'BEST' || classification === 'EXCELLENT') {
        content = `${moveSan} is the engine's top recommendation, maintaining full positional control.`;
      } else if (bestMove && (classification === 'BLUNDER' || classification === 'MISTAKE')) {
        content = `${moveSan} is suboptimal according to engine analysis. The engine's preferred continuation was ${bestMove}.`;
      } else if (bestMove && classification === 'INACCURACY') {
        content = `${moveSan} is a slight inaccuracy. ${bestMove} was more active and purposeful.`;
      } else if (classification === 'GOOD' || classification === 'BOOK') {
        content = `${moveSan} keeps the balance and follows solid development.`;
      }

      const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);

      return {
        id: `fb-${Date.now()}`,
        type: 'COACH_UNAVAILABLE',
        title: 'AI Coach Unavailable (Engine Analysis)',
        content: `${content} [AI coach unavailable — showing local Stockfish evaluation]`,
        lesson: bestMove ? `Compare ${moveSan} with the engine line ${bestMove}.` : 'Focus on active piece coordination and king safety.',
        suggestedMove: bestMove,
        timestamp: Date.now(),
        practiceTheme: practiceTheme?.theme,
        practiceThemeTitle: practiceTheme?.title
      };
    }
  }

  async getHint(fen: string, playerColor: 'w' | 'b'): Promise<CoachMessage> {
    try {
      const candidates = await chessEngine.getCandidateMoves(fen, 3);
      return await getHintApi({
        fen,
        playerColor,
        hintLevel: 2,
        candidateMoves: candidates.map((c) => ({ san: c.san, score: c.score }))
      });
    } catch (err) {
      console.warn('[LLMCoachService] Backend hint failed, AI coach unavailable:', err);
      const candidates = await chessEngine.getCandidateMoves(fen, 3);
      const best = candidates[0];
      return {
        id: `hint-${Date.now()}`,
        type: 'COACH_UNAVAILABLE',
        title: 'AI Coach Unavailable (Engine Hint)',
        content: best
          ? `Local engine suggests ${best.san}. ${best.explanation} [AI coach unavailable — showing local engine hint]`
          : 'Focus on developing your pieces toward central control. [AI coach unavailable]',
        suggestedMove: best?.san,
        timestamp: Date.now()
      };
    }
  }

  async answerQuestion(
    query: string,
    fen: string,
    history: MoveRecord[],
    opening?: { name: string }
  ): Promise<CoachMessage> {
    try {
      const lastMove = history[history.length - 1];
      return await chatCoachApi({
        query,
        fen,
        playerColor: history.length % 2 === 0 ? 'w' : 'b',
        moveHistorySan: history.map((m) => m.san),
        openingName: opening?.name,
        lastMoveEvaluation: lastMove
          ? { san: lastMove.san, score: 0 }
          : undefined
      });
    } catch (err) {
      console.warn('[LLMCoachService] Backend chat failed, AI coach unavailable:', err);
      return {
        id: `chat-${Date.now()}`,
        type: 'COACH_UNAVAILABLE',
        title: 'AI Coach Unavailable',
        content: 'The AI coach is currently unavailable. Focus on fundamental principles: king safety, piece coordination, and fighting for key central outposts. [AI coach unavailable — showing generic advice]',
        lesson: 'Every move must have a concrete purpose. The AI coach will return when the backend is reachable.',
        timestamp: Date.now()
      };
    }
  }

  async generatePostGameAnalysis(
    moves: MoveRecord[],
    playerColor: 'w' | 'b',
    result: GameResult,
    resultReason: string
  ): Promise<PostGameAnalysis> {
    const opening = openingService.identifyOpening(moves.map((m) => m.san));
    const playerMoves = moves.filter((m) => m.color === playerColor);
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    const opponentMoves = moves.filter((m) => m.color === opponentColor);

    let best = 0;
    let excellent = 0;
    let good = 0;
    let inaccuracies = 0;
    let mistakes = 0;
    let blunders = 0;

    let bestMove = playerMoves.find((m) => m.classification === 'BEST')?.san || playerMoves[0]?.san || 'e4';
    let biggestMistake: string | undefined;

    for (const m of playerMoves) {
      const cls = m.classification || 'GOOD';
      if (cls === 'BEST') best++;
      else if (cls === 'EXCELLENT') excellent++;
      else if (cls === 'GOOD' || cls === 'BOOK') good++;
      else if (cls === 'INACCURACY') inaccuracies++;
      else if (cls === 'MISTAKE') {
        mistakes++;
        if (!biggestMistake) biggestMistake = m.san;
      } else if (cls === 'BLUNDER') {
        blunders++;
        biggestMistake = m.san;
      }
    }

    const totalPlayerMoves = Math.max(1, playerMoves.length);
    // Blunders contribute 0 points to accuracy
    const playerScore = (best * 100 + excellent * 92 + good * 80 + inaccuracies * 50 + mistakes * 25) / totalPlayerMoves;
    const playerAccuracy = Math.min(100, Math.max(20, Math.round(playerScore)));

    let oppBest = 0;
    let oppExcellent = 0;
    let oppGood = 0;
    let oppInaccuracies = 0;
    let oppMistakes = 0;
    let oppBlunders = 0;

    for (const m of opponentMoves) {
      const cls = m.classification || 'GOOD';
      if (cls === 'BEST') oppBest++;
      else if (cls === 'EXCELLENT') oppExcellent++;
      else if (cls === 'GOOD' || cls === 'BOOK') oppGood++;
      else if (cls === 'INACCURACY') oppInaccuracies++;
      else if (cls === 'MISTAKE') oppMistakes++;
      else if (cls === 'BLUNDER') oppBlunders++;
    }

    const totalOpponentMoves = Math.max(1, opponentMoves.length);
    const oppScore = (oppBest * 100 + oppExcellent * 92 + oppGood * 80 + oppInaccuracies * 50 + oppMistakes * 25) / totalOpponentMoves;
    const opponentAccuracy = opponentMoves.length > 0 ? Math.min(100, Math.max(20, Math.round(oppScore))) : 80;

    const detectedThemes = Array.from(
      new Set(
        moves
          .filter((m) => m.color === playerColor && m.theme)
          .map((m) => m.theme!)
      )
    );

    const fallbackBase = {
      result,
      resultReason,
      playerColor,
      opening: opening || { eco: 'A00', name: 'Standard Opening' },
      accuracy: { player: playerAccuracy, opponent: opponentAccuracy },
      detectedThemes,
      moveBreakdown: {
        best,
        excellent,
        good,
        inaccuracies,
        mistakes,
        blunders
      }
    };

    try {
      const apiResult = await postGameReviewApi(
        {
          moves: moves.map((m) => ({
            moveNumber: m.moveNumber,
            san: m.san,
            color: m.color,
            evaluation: 0,
            classification: m.classification
          })),
          playerColor,
          result: result === 'WHITE_WINS' ? 'WHITE_WINS' : result === 'BLACK_WINS' ? 'BLACK_WINS' : 'DRAW',
          resultReason,
          openingName: opening?.name,
          accuracyWhite: playerColor === 'w' ? playerAccuracy : opponentAccuracy,
          accuracyBlack: playerColor === 'b' ? playerAccuracy : opponentAccuracy
        },
        fallbackBase
      );
      return {
        ...apiResult,
        detectedThemes
      };
    } catch (err) {
      console.warn('[LLMCoachService] Backend post-game review failed, using fallback summary:', err);
      return {
        ...fallbackBase,
        bestMove,
        biggestMistake,
        keyLesson: blunders > 0
          ? 'Always double-check your piece defense before making an attacking move.'
          : 'Develop all minor pieces and secure king safety early before launching central pawn breaks.',
        phaseReviews: {
          opening: {
            title: 'Opening Phase',
            positivePoints: ['Controlled key central squares with pawns', 'Developed minor pieces smoothly'],
            negativePoints: inaccuracies > 1 ? ['Delayed kingside castling by 2 moves'] : []
          },
          middlegame: {
            title: 'Middlegame Strategy',
            positivePoints: ['Found active square outposts for knights', 'Coordinated rook files effectively'],
            negativePoints: mistakes > 0 ? ['Missed tactical vulnerability on the flank'] : []
          },
          endgame: {
            title: 'Endgame Technique',
            positivePoints: ['Activated king toward the center pawns'],
            negativePoints: blunders > 0 ? ['Allowed opponent passed pawn to advance'] : []
          }
        }
      };
    }
  }
}
