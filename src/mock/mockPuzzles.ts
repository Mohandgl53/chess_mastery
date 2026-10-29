import { Puzzle } from '../types/puzzle';

export const MOCK_PUZZLES: Puzzle[] = [
  {
    id: 'puz-101',
    title: 'Royal Fork on c7',
    rating: 850,
    theme: 'Fork',
    themeDescription: 'Attacking the enemy King and Rook simultaneously with a knight jump.',
    difficulty: 'Easy',
    fen: 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd5',
        to: 'c7',
        san: 'Nxc7+',
        response: {
          from: 'e8',
          to: 'd8',
          san: 'Kd8'
        }
      },
      {
        from: 'c7',
        to: 'a8',
        san: 'Nxa8'
      }
    ],
    hints: [
      {
        level: 1,
        title: 'Hint 1: Find the right piece',
        description: 'Look at your active white knight on d5.',
        highlightSquares: ['d5']
      },
      {
        level: 2,
        title: 'Hint 2: Identify the target square',
        description: 'Notice that Black’s c7 pawn is undefended and borders both the king on e8 and the rook on a8.',
        highlightSquares: ['c7']
      },
      {
        level: 3,
        title: 'Hint 3: The Tactical Solution',
        description: 'Play Nxc7+ delivering check and winning the rook on a8 next move!',
        highlightSquares: ['d5', 'c7', 'e8', 'a8']
      }
    ],
    tacticalExplanation: 'The knight jumps to c7, delivering check to the king on e8 while attacking the rook on a8. Because the king is in check, Black is forced to move their king, leaving the rook helpless to be captured on the next move.',
    coachInsight: 'Always look for undefended c7 or f7 squares when your knight reaches the 5th rank!'
  },
  {
    id: 'puz-102',
    title: 'Back-Rank Corridor Checkmate',
    rating: 900,
    theme: 'Back-Rank Mate',
    themeDescription: 'Delivering mate on the 8th rank because the defending king is trapped by its own pawn shield.',
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
      {
        level: 1,
        title: 'Hint 1: Target the 8th rank',
        description: 'Notice that Black’s king on g8 has no escape squares due to the pawns on f7, g7, and h7.',
        highlightSquares: ['g8', 'f7', 'g7', 'h7']
      },
      {
        level: 2,
        title: 'Hint 2: Find the forcing capture',
        description: 'Your rook on d1 can capture the black rook on d8.',
        highlightSquares: ['d1', 'd8']
      },
      {
        level: 3,
        title: 'Hint 3: Mate in 1',
        description: 'Play Rxd8# to deliver instant checkmate.',
        highlightSquares: ['d1', 'd8']
      }
    ],
    tacticalExplanation: 'Rxd8 captures the defending rook with checkmate. Black cannot capture back or block the check, and the black king is suffocated by its own pawn chain on f7/g7/h7.',
    coachInsight: 'Creating "Luft" (pushing h3 or g3) is essential in practical games to avoid this exact back-rank tragedy.'
  },
  {
    id: 'puz-103',
    title: 'Absolute Pin against the Queen',
    rating: 1050,
    theme: 'Pin',
    themeDescription: 'Pinning the enemy queen to the king along an open diagonal.',
    difficulty: 'Medium',
    fen: 'r3k2r/ppp2ppp/2n5/4q3/4B3/8/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'd1',
        to: 'e2',
        san: 'Qe2'
      }
    ],
    hints: [
      {
        level: 1,
        title: 'Hint 1: Look at the e-file',
        description: 'Black’s queen on e5 and king on e8 are aligned along the open e-file.',
        highlightSquares: ['e5', 'e8']
      },
      {
        level: 2,
        title: 'Hint 2: Defend your pinned bishop',
        description: 'White’s bishop on e4 is pinned to the king. Back it up with your queen on e2.',
        highlightSquares: ['d1', 'e2', 'e4']
      },
      {
        level: 3,
        title: 'Hint 3: The Move',
        description: 'Play Qe2 to reinforce the pin and threaten discovered attacks.',
        highlightSquares: ['d1', 'e2']
      }
    ],
    tacticalExplanation: 'By playing Qe2, White secures the e4 bishop and prepares to unleash devastating discovered checks with the bishop when it moves.',
    coachInsight: 'When a piece is aligned with the enemy king, look for ways to exploit or intensify the pin.'
  },
  {
    id: 'puz-104',
    title: 'The Linear Skewer',
    rating: 1100,
    theme: 'Skewer',
    themeDescription: 'Attacking a high-value piece that is forced to move, exposing a piece behind it.',
    difficulty: 'Medium',
    fen: '8/8/8/3k4/8/8/1r6/R3K3 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      {
        from: 'a1',
        to: 'd1',
        san: 'Rd1+',
        response: {
          from: 'd5',
          to: 'e6',
          san: 'Ke6'
        }
      },
      {
        from: 'd1',
        to: 'd2',
        san: 'Rd2'
      }
    ],
    hints: [
      {
        level: 1,
        title: 'Hint 1: Check along the file',
        description: 'Deliver check to the black king on d5.',
        highlightSquares: ['a1', 'd1']
      },
      {
        level: 2,
        title: 'Hint 2: King & Rook alignment',
        description: 'Notice Black’s king and rook are in close proximity.',
        highlightSquares: ['d5', 'b2']
      },
      {
        level: 3,
        title: 'Hint 3: Rd1+',
        description: 'Play Rd1+ forcing the king away.',
        highlightSquares: ['a1', 'd1']
      }
    ],
    tacticalExplanation: 'Rd1+ delivers check. When the king steps away, White wins the initiative and targets Black’s exposed rook.',
    coachInsight: 'Unlike a pin where the more valuable piece is behind, a skewer attacks the valuable piece in front!'
  }
];
