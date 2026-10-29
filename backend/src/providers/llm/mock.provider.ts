import {
  ILLMProvider,
  RagChunks,
  CoachExplanationContext,
  CoachHintContext,
  CoachChatContext,
  PostGameReviewContext,
  CoachStructuredOutput,
  PostGameStructuredOutput
} from './llm.provider.js';

export class MockLLMProvider implements ILLMProvider {
  readonly providerName = 'MockLLM';

  async explainMove(context: CoachExplanationContext, _ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const isBlunder = context.classification === 'BLUNDER';
    const isMistake = context.classification === 'MISTAKE';
    const isInaccuracy = context.classification === 'INACCURACY';

    let title = 'Solid Tactical Move';
    let content = `${context.moveSan} maintains active piece control and adheres to sound strategic development.`;
    let lesson = 'Keep your pieces coordinated and look for weaknesses in the opponent\'s camp.';

    if (isBlunder) {
      title = 'Costly Tactical Blunder';
      content = `Playing ${context.moveSan} significantly compromises your position and gives your opponent a concrete tactical refutation. ${context.bestMove ? `The engine preferred ${context.bestMove} to maintain balance.` : ''}`;
      lesson = 'Always double-check undefended pieces and calculate forcing responses before moving.';
    } else if (isMistake) {
      title = 'Inaccurate Execution';
      content = `${context.moveSan} concedes valuable momentum. ${context.bestMove ? `A better alternative was ${context.bestMove}.` : ''}`;
      lesson = 'Prioritize piece harmony and king safety before launching flank attacks.';
    } else if (isInaccuracy) {
      title = 'Minor Inaccuracy';
      content = `${context.moveSan} is slightly passive. ${context.bestMove ? `Consider ${context.bestMove} for more active play.` : ''}`;
      lesson = 'Every move should either improve your worst-placed piece or control central space.';
    }

    return {
      title,
      content,
      lesson,
      suggestedMove: context.bestMove,
      highlightSquares: []
    };
  }

  async generateHint(context: CoachHintContext, _ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const topCandidate = context.candidateMoves[0];
    if (context.hintLevel === 1) {
      return {
        title: 'Level 1 Strategic Hint',
        content: 'Look closely at your piece coordination and identify your least active piece in this position.',
        lesson: 'Before finding the move, find the piece that needs improvement.',
        highlightSquares: []
      };
    } else if (context.hintLevel === 2) {
      return {
        title: 'Level 2 Tactical Motif',
        content: topCandidate
          ? `Focus on the piece executing ${topCandidate.san}. Look for forcing squares or pins on that file.`
          : 'Look for forcing checks, captures, or attacks on loose pieces.',
        lesson: 'Tactics flow from superior piece placement.',
        highlightSquares: []
      };
    } else {
      return {
        title: 'Level 3 Candidate Move',
        content: topCandidate
          ? `The engine recommends ${topCandidate.san} as the best continuation.`
          : 'Calculate the most forcing candidate move.',
        lesson: 'Verify opponent counter-threats before executing your plan.',
        suggestedMove: topCandidate?.san,
        highlightSquares: []
      };
    }
  }

  async answerQuestion(context: CoachChatContext, _ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const queryLower = context.query.toLowerCase();

    if (queryLower.includes('why') || queryLower.includes('bad') || queryLower.includes('mistake')) {
      return {
        title: 'Move Breakdown',
        content: 'That move ceded control of key central squares and allowed the opponent active counterplay. Focus on keeping your pieces protected.',
        lesson: 'Every move should either improve your position or counter an immediate threat.',
        highlightSquares: []
      };
    }

    if (queryLower.includes('plan') || queryLower.includes('strategy')) {
      return {
        title: 'Strategic Plan',
        content: 'Your main strategic goals right now are: 1) Complete king safety, 2) Control central files with rooks, and 3) Find outposts for your knights.',
        lesson: 'A clear plan coordinates your pieces toward a unified goal.',
        highlightSquares: []
      };
    }

    return {
      title: 'Grandmaster Insights',
      content: `In this position (${context.openingName || 'Current Opening'}), active piece placement and king safety dictate the evaluation. Focus on increasing pressure on undefended squares.`,
      lesson: 'Identify the opponent\'s least defended square and target it.',
      highlightSquares: []
    };
  }

  async generatePostGameReview(context: PostGameReviewContext, _ragChunks?: RagChunks[]): Promise<PostGameStructuredOutput> {
    return {
      summary: `The game concluded with a ${context.result === 'WHITE_WINS' ? 'White victory' : context.result === 'BLACK_WINS' ? 'Black victory' : 'draw'} (${context.resultReason}). The critical turning points developed in the middlegame transition.`,
      keyLesson: 'Consistency in piece defense and patient king safety will elevate your accuracy significantly.',
      bestMove: context.moves.find((m) => m.classification === 'EXCELLENT_MOVE' || m.classification === 'BEST_MOVE')?.san || 'e4',
      biggestMistake: context.moves.find((m) => m.classification === 'BLUNDER' || m.classification === 'MISTAKE')?.san,
      phaseReviews: {
        opening: {
          title: 'Opening Phase',
          positivePoints: ['Controlled central squares early', 'Developed minor pieces smoothly'],
          negativePoints: ['Could have castled one move earlier']
        },
        middlegame: {
          title: 'Middlegame Strategy',
          positivePoints: ['Found active square outposts for knights'],
          negativePoints: ['Missed a tactical defensive response']
        },
        endgame: {
          title: 'Endgame Technique',
          positivePoints: ['Activated king toward key central pawns'],
          negativePoints: []
        }
      }
    };
  }
}
