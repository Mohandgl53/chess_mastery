import { Chess } from 'chess.js';
import { CoachMessage, CoachMode, CoachPromptOption } from '../types/coach';
import { OpeningInfo, PostGameAnalysis, GameResult } from '../types/game';
import { EvaluationData, MoveRecord } from '../types/chess';
import { openingService } from './openingService';
import { chessEngine } from './chessEngine';

export interface MoveAnalysisInput {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveNumber: number;
  moveHistorySan: string[];
  playerColor: 'w' | 'b';
  opening?: OpeningInfo;
  coachMode: CoachMode;
}

export interface ICoachService {
  analyzeMove(input: MoveAnalysisInput): Promise<CoachMessage | null>;
  getHint(fen: string, playerColor: 'w' | 'b'): Promise<CoachMessage>;
  answerQuestion(
    query: string,
    fen: string,
    history: MoveRecord[],
    opening?: OpeningInfo
  ): Promise<CoachMessage>;
  generatePostGameAnalysis(
    moves: MoveRecord[],
    playerColor: 'w' | 'b',
    result: GameResult,
    resultReason: string
  ): Promise<PostGameAnalysis>;
  getPresetPrompts(): CoachPromptOption[];
}

export class MockCoachService implements ICoachService {
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
    const { fenBefore, fenAfter, moveSan, moveNumber, moveHistorySan, coachMode } = input;
    const opening = input.opening || openingService.identifyOpening(moveHistorySan);

    // If Post-Game only mode, omit real-time messages
    if (coachMode === 'POST_GAME_ONLY' || coachMode === 'HINTS_ONLY') {
      return null;
    }

    const classificationData = await chessEngine.classifyMove(fenBefore, fenAfter, moveSan);
    const { classification, bestMove } = classificationData;

    // Filter by mode
    if (coachMode === 'IMPORTANT_MISTAKES') {
      if (classification !== 'BLUNDER' && classification !== 'MISTAKE' && classification !== 'INACCURACY') {
        return null;
      }
    }

    // 1. Opening Principles (First 6-8 moves)
    if (moveNumber <= 4) {
if (['e4', 'd4', 'e5', 'd5'].includes(moveSan)) {
        const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
        return {
          id: `coach-${Date.now()}`,
          type: 'OPENING_PRINCIPLE',
          title: 'Controlling the Center',
          content: `You played ${moveSan}. Excellent move claiming the key central squares.`,
          lesson: 'Rule of thumb: Occupy the center with pawns early to restrict your opponent\'s pieces.',
          suggestedMove: moveSan,
          timestamp: Date.now(),
          practiceTheme: practiceTheme?.theme,
          practiceThemeTitle: practiceTheme?.title
        };
      }

      if (['Nf3', 'Nc3', 'Nf6', 'Nc6', 'Bc4', 'Bb5', 'Bc5', 'Bb4'].includes(moveSan)) {
        const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
        return {
          id: `coach-${Date.now()}`,
          type: 'GOOD_MOVE',
          title: 'Piece Development',
          content: `You played ${moveSan}. Developing minor pieces toward the center increases coordination and prepares castling.`,
          lesson: 'Knights before bishops is a classical guideline for smooth opening development.',
          timestamp: Date.now(),
          practiceTheme: practiceTheme?.theme,
          practiceThemeTitle: practiceTheme?.title
        };
      }
    }

    // Castling move
    if (moveSan === 'O-O' || moveSan === 'O-O-O') {
      const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
      return {
        id: `coach-${Date.now()}`,
        type: 'GOOD_MOVE',
        title: 'King Safety Secured',
        content: 'You castled! Your king is tucked safely behind pawn shields, and your rook is now active.',
        lesson: 'Castling early shields your king from open central files and brings rooks into the game.',
        timestamp: Date.now(),
        practiceTheme: practiceTheme?.theme,
        practiceThemeTitle: practiceTheme?.title
      };
    }

    // Blunders
    if (classification === 'BLUNDER') {
      const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
      return {
        id: `coach-${Date.now()}`,
        type: 'BLUNDER',
        title: 'Critical Mistake',
        content: `You played ${moveSan}, which gives your opponent tactical advantages or loses material.`,
        lesson: `Consider ${bestMove} instead to keep your pieces defended and active.`,
        bestAlternative: bestMove,
        timestamp: Date.now(),
        practiceTheme: practiceTheme?.theme,
        practiceThemeTitle: practiceTheme?.title
      };
    }

    // Inaccuracy / Mistake
    if (classification === 'INACCURACY' || classification === 'MISTAKE') {
      const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
      return {
        id: `coach-${Date.now()}`,
        type: 'INACCURACY',
        title: 'Positional Inaccuracy',
        content: `You played ${moveSan}. While playable, it temporarily gives away tempo or weakens square control.`,
        lesson: `A stronger alternative was ${bestMove} to maintain active initiative.`,
        bestAlternative: bestMove,
        timestamp: Date.now(),
        practiceTheme: practiceTheme?.theme,
        practiceThemeTitle: practiceTheme?.title
      };
    }

    // Tactical Opportunity (Capture or Check)
    if (moveSan.includes('+') || moveSan.includes('x')) {
      const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
      return {
        id: `coach-${Date.now()}`,
        type: 'TACTICAL_OPPORTUNITY',
        title: 'Forcing Move Found',
        content: `You played ${moveSan}. Applying immediate pressure forces your opponent into defensive calculations.`,
        lesson: 'Forcing moves (checks, captures, threats) dictate the rhythm of the game.',
        timestamp: Date.now(),
        practiceTheme: practiceTheme?.theme,
        practiceThemeTitle: practiceTheme?.title
      };
    }

    // Standard Good Move
    const practiceTheme = this.getPracticeTheme(classification, moveNumber, moveSan);
    return {
      id: `coach-${Date.now()}`,
      type: 'GOOD_MOVE',
      title: 'Solid Move',
      content: `Good decision with ${moveSan}. Maintains piece harmony and supports your strategic position in the ${opening.name}.`,
      lesson: 'Keep your pieces working together harmoniously across the board.',
      timestamp: Date.now(),
      practiceTheme: practiceTheme?.theme,
      practiceThemeTitle: practiceTheme?.title
    };
  }

  async getHint(fen: string, playerColor: 'w' | 'b'): Promise<CoachMessage> {
    const candidates = await chessEngine.getCandidateMoves(fen, 1);
    const topCandidate = candidates[0];

    if (!topCandidate) {
      return {
        id: `hint-${Date.now()}`,
        type: 'HINT',
        title: 'Coach Hint',
        content: 'Look for forcing moves like checks, captures, or attacking undefended enemy pieces.',
        lesson: 'Always calculate your opponent’s candidate replies before making your final move.',
        timestamp: Date.now()
      };
    }

    return {
      id: `hint-${Date.now()}`,
      type: 'HINT',
      title: 'Tactical Hint',
      content: `Consider focusing on ${topCandidate.from} — look for a way to activate this piece to ${topCandidate.to}.`,
      lesson: topCandidate.explanation,
      suggestedMove: topCandidate.san,
      highlightSquares: [topCandidate.from, topCandidate.to],
      timestamp: Date.now()
    };
  }

  async answerQuestion(
    query: string,
    fen: string,
    history: MoveRecord[],
    opening?: OpeningInfo
  ): Promise<CoachMessage> {
    const lowerQuery = query.toLowerCase();
    const chess = new Chess(fen);
    const candidates = await chessEngine.getCandidateMoves(fen, 3);
    const openingName = opening?.name || 'Current Opening';

    if (lowerQuery.includes('why') && (lowerQuery.includes('bad') || lowerQuery.includes('mistake') || lowerQuery.includes('inaccurate'))) {
      const lastMove = history[history.length - 1];
      return {
        id: `qa-${Date.now()}`,
        type: 'INACCURACY',
        title: 'Move Evaluation Breakdown',
        content: lastMove
          ? `The move ${lastMove.san} concedes tempo and gives the opponent time to coordinate their counter-attack.`
          : 'Look at piece coordination: moving a piece multiple times in the opening or leaving pieces undefended causes immediate vulnerabilities.',
        lesson: 'Every move should either improve a piece, control space, or create a concrete threat.',
        timestamp: Date.now()
      };
    }

    if (lowerQuery.includes('plan') || lowerQuery.includes('strategy')) {
      const isMiddlegame = history.length > 12;
      return {
        id: `qa-${Date.now()}`,
        type: 'MIDDLEGAME_PLAN',
        title: 'Strategic Middlegame Plan',
        content: isMiddlegame
          ? `In this ${openingName} middlegame, your plan should be: 1) Connect your rooks on open files, 2) Target weak pawns, and 3) Seek outposts for your knights.`
          : 'Complete your development, castle your king to safety, and challenge the center with pawn breaks before launching any attacks.',
        lesson: 'A bad plan is better than no plan at all — always have a purpose for your pieces.',
        timestamp: Date.now()
      };
    }

    if (lowerQuery.includes('trap') || lowerQuery.includes('opening')) {
      return {
        id: `qa-${Date.now()}`,
        type: 'OPENING_PRINCIPLE',
        title: `Opening Insights: ${openingName}`,
        content: `In the ${openingName}, watch out for quick f7/f2 square attacks and early queen pins on your knights.`,
        lesson: 'Never grab poisoned pawns if it costs you two or more tempi in development.',
        timestamp: Date.now()
      };
    }

    if (lowerQuery.includes('what should i play') || lowerQuery.includes('candidate')) {
      const best = candidates[0];
      return {
        id: `qa-${Date.now()}`,
        type: 'HINT',
        title: 'Recommended Candidate Move',
        content: best
          ? `The engine recommends ${best.san}. ${best.explanation}.`
          : 'Look for forcing moves: checks, captures, or creating threats against loose pieces.',
        suggestedMove: best?.san,
        lesson: 'Scan the board for your opponent’s unprotected pieces before choosing your move.',
        timestamp: Date.now()
      };
    }

    // General breakdown
    return {
      id: `qa-${Date.now()}`,
      type: 'GENERAL_ADVICE',
      title: 'Position Evaluation Breakdown',
      content: `In this position, active piece placement and king safety are the key factors. White has good piece activity while Black maintains solid central resilience.`,
      lesson: 'Identify your worst-placed piece and find a square that improves its influence.',
      timestamp: Date.now()
    };
  }

  async generatePostGameAnalysis(
    moves: MoveRecord[],
    playerColor: 'w' | 'b',
    result: GameResult,
    resultReason: string
  ): Promise<PostGameAnalysis> {
    const opening = openingService.identifyOpening(moves.map(m => m.san));
    const playerMoves = moves.filter(m => m.color === playerColor);
    
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    const opponentMoves = moves.filter((m) => m.color === opponentColor);

    // Count player classifications
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

    // Objectively calculate opponent (bot) accuracy from its moves
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

    return {
      result,
      resultReason,
      playerColor,
      accuracy: {
        player: playerAccuracy,
        opponent: opponentAccuracy
      },
      opening,
      bestMove,
      biggestMistake: biggestMistake || (inaccuracies > 0 ? playerMoves[playerMoves.length - 1]?.san : undefined),
      keyLesson: blunders > 0
        ? 'Always double-check your piece defense before making an attacking move.'
        : 'Develop all minor pieces and secure king safety early before launching central pawn breaks.',
      moveBreakdown: {
        best,
        excellent,
        good,
        inaccuracies,
        mistakes,
        blunders
      },
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

import { LLMCoachService } from './LLMCoachService';

// Select coach service based on VITE_DATA_MODE:
// - 'api': LLMCoachService calls backend /api/coach/* backed by free LLM (Groq / OpenRouter / Ollama / Mock)
// - 'mock': MockCoachService runs entirely client-side with heuristics
export const coachService: ICoachService = new LLMCoachService();
