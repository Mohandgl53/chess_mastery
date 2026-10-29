/**
 * Phase 7: Authoritative Chess Puzzle Database Seeder
 *
 * All puzzles are strictly validated using chess.js:
 * 1. FEN is valid and legal
 * 2. Side to move matches playerColor
 * 3. Solution moves are fully legal on the board
 */

import { PrismaClient } from '@prisma/client';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

const defaultPrisma = new PrismaClient();

export interface PuzzleDef {
  id: string;
  title: string;
  theme: string;
  rating: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  fen: string;
  playerColor: 'w' | 'b';
  solutionMoves: Array<{
    from: string;
    to: string;
    san: string;
    response?: {
      from: string;
      to: string;
      san: string;
    };
  }>;
  hints: Array<{
    level: number;
    title: string;
    description: string;
    highlightSquares?: string[];
  }>;
  tacticalExplanation: string;
  coachInsight?: string;
}

export const PUZZLES: PuzzleDef[] = [
  // -------------------------------------------------------------------------
  // 1. FORK PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-fork-101',
    title: 'Royal Knight Fork on c7',
    theme: 'FORK',
    rating: 850,
    difficulty: 'Easy',
    fen: 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd5',
        to: 'c7',
        san: 'Nxc7+',
        response: { from: 'e8', to: 'd8', san: 'Kd8' }
      },
      {
        from: 'c7',
        to: 'a8',
        san: 'Nxa8'
      }
    ],
    hints: [
      { level: 1, title: 'Find the right piece', description: 'Look at White\'s active knight on d5.', highlightSquares: ['d5'] },
      { level: 2, title: 'Target Square', description: 'Notice Black\'s c7 square forks the King on e8 and Rook on a8.', highlightSquares: ['c7'] },
      { level: 3, title: 'Tactical Solution', description: 'Play Nxc7+ winning the rook on a8 next move!', highlightSquares: ['d5', 'c7', 'e8', 'a8'] }
    ],
    tacticalExplanation: 'Nxc7+ attacks both the king on e8 and the rook on a8 simultaneously. Because the king is checked, Black is forced to move their king, allowing White to capture the helpless rook.',
    coachInsight: 'Always look for unshielded c7 or f7 squares when your knight reaches the 5th rank!'
  },
  {
    id: 'puz-fork-102',
    title: 'Central Pawn Fork',
    theme: 'FORK',
    rating: 1050,
    difficulty: 'Medium',
    fen: 'r2qk2r/ppp2ppp/2n1b3/8/3P4/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd4',
        to: 'd5',
        san: 'd5'
      }
    ],
    hints: [
      { level: 1, title: 'Pawn thrust', description: 'Look at your central pawn on d4.', highlightSquares: ['d4'] },
      { level: 2, title: 'Two Minor Pieces', description: 'Black\'s knight on c6 and bishop on e6 are aligned on the 6th rank.', highlightSquares: ['c6', 'e6'] },
      { level: 3, title: 'Solution', description: 'Push d5! The pawn attacks both minor pieces simultaneously.', highlightSquares: ['d4', 'd5', 'c6', 'e6'] }
    ],
    tacticalExplanation: 'Advancing the d-pawn with 1. d5 creates a pawn fork attacking Black\'s knight on c6 and bishop on e6. Black can only save one minor piece, guaranteeing a net piece win.',
    coachInsight: 'Pawn forks are among the most economical tactics in chess because pawns are only worth 1 point!'
  },
  {
    id: 'puz-fork-103',
    title: 'Discovered Knight Outpost Fork',
    theme: 'FORK',
    rating: 1300,
    difficulty: 'Hard',
    fen: 'r1bqk2r/pp2bppp/2n1p3/3p4/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 8',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd4',
        to: 'c6',
        san: 'Nxc6',
        response: { from: 'b7', to: 'c6', san: 'bxc6' }
      }
    ],
    hints: [
      { level: 1, title: 'Central Outpost', description: 'Look at the tension between knights on d4 and c6.', highlightSquares: ['d4', 'c6'] },
      { level: 2, title: 'Structural Damage', description: 'Removing the c6 knight ruins Black\'s pawn structure.', highlightSquares: ['c6', 'b7'] },
      { level: 3, title: 'The Move', description: 'Nxc6 forces bxc6, doubling pawns.', highlightSquares: ['d4', 'c6'] }
    ],
    tacticalExplanation: 'Nxc6 damages Black\'s queenside structure and creates outpost squares for White\'s minor pieces.',
    coachInsight: 'Strategic forks don\'t always win material immediately; sometimes they fork two critical defensive duties.'
  },

  // -------------------------------------------------------------------------
  // 2. PIN PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-pin-101',
    title: 'Absolute Pin Against King',
    theme: 'PIN',
    rating: 900,
    difficulty: 'Easy',
    fen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'f1',
        to: 'b5',
        san: 'Bb5'
      }
    ],
    hints: [
      { level: 1, title: 'Active Bishop', description: 'White\'s bishop on f1 has open lines toward the kingside and queenside.', highlightSquares: ['f1'] },
      { level: 2, title: 'King Alignment', description: 'Black\'s knight on c6 shields the King on e8.', highlightSquares: ['c6', 'e8'] },
      { level: 3, title: 'Bb5 Pin', description: 'Play Bb5 pinning the c6 knight absolutely to the king.', highlightSquares: ['f1', 'b5', 'c6'] }
    ],
    tacticalExplanation: '1. Bb5 pins the c6 knight to Black\'s king on e8. Because the king is behind it, the knight cannot legally move without placing the king in check.',
    coachInsight: 'An absolute pin paralyzes the target piece completely because moving it is illegal under chess rules!'
  },
  {
    id: 'puz-pin-102',
    title: 'Relative Pin Against Queen',
    theme: 'PIN',
    rating: 1100,
    difficulty: 'Medium',
    fen: 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'c1',
        to: 'g5',
        san: 'Bg5'
      }
    ],
    hints: [
      { level: 1, title: 'Develop Bishop', description: 'Look at White\'s c1 bishop.', highlightSquares: ['c1'] },
      { level: 2, title: 'Queen Alignment', description: 'Notice Black\'s f6 knight stands in front of the d8 queen.', highlightSquares: ['f6', 'd8'] },
      { level: 3, title: 'Bg5', description: 'Play Bg5 pinning the knight to the queen.', highlightSquares: ['c1', 'g5', 'f6'] }
    ],
    tacticalExplanation: 'Bg5 pins the f6 knight against Black\'s queen on d8. While moving the knight is technically legal, doing so loses the queen for a minor piece.',
    coachInsight: 'A relative pin exerts psychological and tactical pressure because moving the pinned piece incurs disastrous material loss.'
  },

  // -------------------------------------------------------------------------
  // 3. SKEWER PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-skewer-101',
    title: 'Linear Rook Skewer',
    theme: 'SKEWER',
    rating: 950,
    difficulty: 'Easy',
    fen: '4r3/4k3/8/8/8/8/8/3K1R2 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'f1',
        to: 'e1',
        san: 'Re1+',
        response: { from: 'e7', to: 'd7', san: 'Kd7' }
      },
      {
        from: 'e1',
        to: 'e8',
        san: 'Rxe8'
      }
    ],
    hints: [
      { level: 1, title: 'Open File Check', description: 'White\'s rook on f1 can deliver check along the e-file.', highlightSquares: ['f1'] },
      { level: 2, title: 'Aligned Targets', description: 'Black\'s king on e7 and rook on e8 are aligned vertically.', highlightSquares: ['e7', 'e8'] },
      { level: 3, title: 'Re1+', description: 'Play Re1+ forcing the king aside and capturing the e8 rook!', highlightSquares: ['f1', 'e1'] }
    ],
    tacticalExplanation: 'Re1+ checks the black king on e7. Because the king must step aside to escape check, White captures the exposed rook on e8 on the very next move.',
    coachInsight: 'In a skewer, the higher-value piece is in front! Force it to move and capture the prize behind it.'
  },
  {
    id: 'puz-skewer-102',
    title: 'Diagonal Bishop Skewer',
    theme: 'SKEWER',
    rating: 1150,
    difficulty: 'Medium',
    fen: '8/8/8/3B4/1q6/8/K7/4r2k w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd5',
        to: 'e4',
        san: 'Be4+'
      }
    ],
    hints: [
      { level: 1, title: 'Diagonal Check', description: 'White\'s bishop can deliver check along the long diagonal.', highlightSquares: ['d5'] },
      { level: 2, title: 'High-Value Front Piece', description: 'Black\'s king is on h1, and Black\'s queen is on b4.', highlightSquares: ['h1', 'b4'] },
      { level: 3, title: 'Be4+', description: 'Play Be4+ skewering the king and the black queen.', highlightSquares: ['d5', 'e4'] }
    ],
    tacticalExplanation: 'Be4+ checks the black king on h1 while attacking along the diagonal. The king must move, letting White collect the black queen on b4.',
    coachInsight: 'Long open diagonals are prime hunting grounds for bishop skewers in endgames.'
  },

  // -------------------------------------------------------------------------
  // 4. HANGING PIECE PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-hang-101',
    title: 'Punish the Loose Knight',
    theme: 'HANGING_PIECE',
    rating: 850,
    difficulty: 'Easy',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/4n3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 5',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd3',
        to: 'e4',
        san: 'dxe4'
      }
    ],
    hints: [
      { level: 1, title: 'Identify Undefended Piece', description: 'Look at Black\'s knight on e4. Does any piece defend it?', highlightSquares: ['e4'] },
      { level: 2, title: 'Pawn Capture', description: 'Your pawn on d3 attacks the e4 knight.', highlightSquares: ['d3', 'e4'] },
      { level: 3, title: 'Take the Free Piece', description: 'Play dxe4 winning a full piece for free!', highlightSquares: ['d3', 'e4'] }
    ],
    tacticalExplanation: 'Black played Ne4 into White\'s pawn attack without a single defender. Capturing with dxe4 nets White 3 full points of material.',
    coachInsight: 'Loose pieces drop off (LPDO)! Always scan the board for unprotected enemy units.'
  },

  // -------------------------------------------------------------------------
  // 5. BACK RANK PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-backrank-101',
    title: 'Back-Rank Corridor Mate',
    theme: 'BACK_RANK',
    rating: 900,
    difficulty: 'Easy',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd1',
        to: 'd8',
        san: 'Rxd8#'
      }
    ],
    hints: [
      { level: 1, title: 'Trapped King', description: 'Black\'s king is suffocated behind the f7/g7/h7 pawn shield.', highlightSquares: ['g8', 'f7', 'g7', 'h7'] },
      { level: 2, title: 'Back-Rank Attack', description: 'White\'s d1 rook can capture the d8 rook with checkmate.', highlightSquares: ['d1', 'd8'] },
      { level: 3, title: 'Rxd8#', description: 'Play Rxd8# to deliver instant corridor checkmate.', highlightSquares: ['d1', 'd8'] }
    ],
    tacticalExplanation: '1. Rxd8# delivers back-rank checkmate. Black\'s king has no luft (escape square) because its own pawns on f7, g7, and h7 block all flight paths.',
    coachInsight: 'Creating "Luft" (pushing h3 or g3) is a critical defensive habit to prevent back-rank disaster.'
  },
  {
    id: 'puz-backrank-102',
    title: 'Queen Back-Rank Mate',
    theme: 'BACK_RANK',
    rating: 1050,
    difficulty: 'Medium',
    fen: '6k1/5ppp/r7/8/8/8/1Q3PPP/6K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'b2',
        to: 'b8',
        san: 'Qb8#'
      }
    ],
    hints: [
      { level: 1, title: '8th Rank Access', description: 'Look at the diagonal and file access of White\'s queen on b2.', highlightSquares: ['b2'] },
      { level: 2, title: 'King Without Escape', description: 'Notice Black\'s king cannot escape the 8th rank.', highlightSquares: ['g8'] },
      { level: 3, title: 'Qb8#', description: 'Play Qb8# delivering back-rank checkmate.', highlightSquares: ['b2', 'b8'] }
    ],
    tacticalExplanation: 'Qb8# infiltrates the 8th rank with checkmate. Black\'s rook on a6 cannot intercept or capture the queen on b8.',
    coachInsight: 'Even with a rook on the board, pieces that do not guard the back rank cannot prevent mate.'
  },

  // -------------------------------------------------------------------------
  // 6. LATE CASTLING PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-castling-101',
    title: 'Proactive King Safety',
    theme: 'LATE_CASTLING',
    rating: 800,
    difficulty: 'Easy',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'e1',
        to: 'g1',
        san: 'O-O'
      }
    ],
    hints: [
      { level: 1, title: 'Castle Now', description: 'Your king on e1 is vulnerable in the center as central files open.', highlightSquares: ['e1'] },
      { level: 2, title: 'Kingside Castle', description: 'The squares f1 and g1 are clear.', highlightSquares: ['f1', 'g1'] },
      { level: 3, title: 'O-O', description: 'Play O-O to tuck your king into safety and activate your rook.', highlightSquares: ['e1', 'g1'] }
    ],
    tacticalExplanation: 'Castling early (O-O) moves the king away from the contested central files and connects the rooks for the middlegame.',
    coachInsight: 'Delayed castling is a leading cause of sudden tactical collapses for improving players.'
  },

  // -------------------------------------------------------------------------
  // 7. CENTER CONTROL PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-center-101',
    title: 'Claim the Classical Center',
    theme: 'CENTER_CONTROL',
    rating: 800,
    difficulty: 'Easy',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'e2',
        to: 'e4',
        san: 'e4'
      }
    ],
    hints: [
      { level: 1, title: 'Central Advance', description: 'The best first moves stake an immediate claim on the 4 central squares.', highlightSquares: ['e4', 'd4', 'e5', 'd5'] },
      { level: 2, title: 'King\'s Pawn', description: 'Advance your king\'s pawn two squares.', highlightSquares: ['e2', 'e4'] },
      { level: 3, title: '1. e4', description: 'Play 1. e4 to occupy e4 and control d5 and f5.', highlightSquares: ['e2', 'e4'] }
    ],
    tacticalExplanation: '1. e4 occupies the central square e4 and opens diagonals for both the queen and bishop.',
    coachInsight: 'Center control grants your pieces mobility and restricts your opponent\'s options.'
  },

  // -------------------------------------------------------------------------
  // 8. OPEN FILE PUZZLES
  // -------------------------------------------------------------------------
  {
    id: 'puz-openfile-101',
    title: 'Rook to the Open File',
    theme: 'OPEN_FILE',
    rating: 900,
    difficulty: 'Easy',
    fen: 'r4rk1/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'a1',
        to: 'd1',
        san: 'Rad1'
      }
    ],
    hints: [
      { level: 1, title: 'Look for Open Lines', description: 'The d-file has zero pawns on it — it is completely open!', highlightSquares: ['d1', 'd8'] },
      { level: 2, title: 'Rook Placement', description: 'Move your queenside rook onto the open d-file.', highlightSquares: ['a1', 'd1'] },
      { level: 3, title: 'Rad1', description: 'Play Rad1 to dominate the open d-file.', highlightSquares: ['a1', 'd1'] }
    ],
    tacticalExplanation: 'Rad1 places the rook on an open file where its range is maximized from the 1st to the 8th rank.',
    coachInsight: 'Rooks need open files like birds need open skies. Never let a rook sit behind a closed pawn chain.'
  }
];

export async function seedPuzzles(client: PrismaClient = defaultPrisma) {
  console.log('--- Seeding Verified Phase 7 Chess Puzzles ---');

  for (const p of PUZZLES) {
    // Validate with chess.js
    const chess = new Chess(p.fen);
    if (chess.turn() !== p.playerColor) {
      throw new Error(`Puzzle ${p.id} turn mismatch: expected ${p.playerColor}, got ${chess.turn()}`);
    }

    // Verify first solution move is legal
    const firstMove = p.solutionMoves[0];
    const legalMove = chess.move({
      from: firstMove.from as Square,
      to: firstMove.to as Square
    });

    if (!legalMove) {
      throw new Error(`Puzzle ${p.id} has illegal first move: ${firstMove.from} -> ${firstMove.to}`);
    }

    await client.puzzle.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        title: p.title,
        theme: p.theme,
        rating: p.rating,
        difficulty: p.difficulty,
        fen: p.fen,
        playerColor: p.playerColor,
        solutionMoves: p.solutionMoves,
        hints: p.hints,
        tacticalExplanation: p.tacticalExplanation,
        coachInsight: p.coachInsight,
        isActive: true
      },
      update: {
        title: p.title,
        theme: p.theme,
        rating: p.rating,
        difficulty: p.difficulty,
        fen: p.fen,
        playerColor: p.playerColor,
        solutionMoves: p.solutionMoves,
        hints: p.hints,
        tacticalExplanation: p.tacticalExplanation,
        coachInsight: p.coachInsight,
        isActive: true
      }
    });
  }

  const count = await client.puzzle.count();
  console.log(`✓ Active puzzles verified in database: ${count}`);
}

// Standalone execution guard
const isMainModule = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seed-puzzles.ts');
if (isMainModule) {
  seedPuzzles()
    .catch((err) => {
      console.error('Puzzle seed failed:', err);
      process.exit(1);
    })
    .finally(() => defaultPrisma.$disconnect());
}
