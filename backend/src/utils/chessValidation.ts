import { Chess } from 'chess.js';
import { CreateGameMoveInput } from '../types/index.js';
import { ValidationError } from './errors.js';

export interface ValidatedGameReplay {
  verifiedPgn: string;
  calculatedFinalFen: string;
  plyCount: number;
}

/**
 * Validates chess moves sequentially using chess.js.
 * Verifies move legality, FEN positions, and final position consistency.
 */
export function validateChessMoves(
  moves: CreateGameMoveInput[],
  submittedFinalFen?: string,
  submittedPgn?: string
): ValidatedGameReplay {
  const chess = new Chess();

  if (!moves || moves.length === 0) {
    if (submittedFinalFen && submittedFinalFen.trim() !== chess.fen()) {
      throw new ValidationError(
        `Inconsistent FEN for empty game. Expected initial position '${chess.fen()}', got '${submittedFinalFen}'.`,
        'INCONSISTENT_FEN'
      );
    }
    return {
      verifiedPgn: submittedPgn || '',
      calculatedFinalFen: chess.fen(),
      plyCount: 0
    };
  }

  for (let i = 0; i < moves.length; i++) {
    const moveItem = moves[i];
    const expectedPly = i + 1;

    if (moveItem.ply !== expectedPly) {
      throw new ValidationError(
        `Move at index ${i} has invalid ply ${moveItem.ply}. Expected ${expectedPly}.`,
        'INVALID_PLY'
      );
    }

    try {
      // Execute move on chess.js board
      const executed = chess.move(moveItem.san);
      if (!executed) {
        throw new ValidationError(
          `Illegal move at ply ${expectedPly}: '${moveItem.san}' in position '${chess.fen()}'.`,
          'ILLEGAL_MOVE'
        );
      }

      // Check per-move FEN if client submitted one
      if (moveItem.fen) {
        const currentBoardFen = chess.fen();
        // Compare piece placement and active turn (first 2 tokens)
        const currentTokens = currentBoardFen.split(' ').slice(0, 2).join(' ');
        const submittedTokens = moveItem.fen.split(' ').slice(0, 2).join(' ');
        if (currentTokens !== submittedTokens) {
          throw new ValidationError(
            `FEN mismatch at ply ${expectedPly}: expected '${currentBoardFen}', got '${moveItem.fen}'.`,
            'INCONSISTENT_FEN'
          );
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(
        `Failed to execute move '${moveItem.san}' at ply ${expectedPly}: ${(err as Error).message}`,
        'ILLEGAL_MOVE'
      );
    }
  }

  const calculatedFinalFen = chess.fen();

  // Verify submitted finalFen matches actual board state
  if (submittedFinalFen) {
    const calcTokens = calculatedFinalFen.split(' ').slice(0, 2).join(' ');
    const subTokens = submittedFinalFen.split(' ').slice(0, 2).join(' ');
    if (calcTokens !== subTokens) {
      throw new ValidationError(
        `Inconsistent final FEN: calculated '${calculatedFinalFen}', client submitted '${submittedFinalFen}'.`,
        'INCONSISTENT_FINAL_FEN'
      );
    }
  }

  // If client submitted a PGN, verify it matches
  if (submittedPgn && submittedPgn.trim().length > 0) {
    try {
      const pgnVerifier = new Chess();
      pgnVerifier.loadPgn(submittedPgn);
      const pgnFinalTokens = pgnVerifier.fen().split(' ').slice(0, 2).join(' ');
      const actualTokens = calculatedFinalFen.split(' ').slice(0, 2).join(' ');
      if (pgnFinalTokens !== actualTokens) {
        throw new ValidationError(
          'Submitted PGN final position does not match executed move sequence.',
          'INVALID_PGN'
        );
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(
        `Submitted PGN is invalid or unparseable: ${(err as Error).message}`,
        'INVALID_PGN'
      );
    }
  }

  return {
    verifiedPgn: submittedPgn || chess.pgn(),
    calculatedFinalFen,
    plyCount: moves.length
  };
}
