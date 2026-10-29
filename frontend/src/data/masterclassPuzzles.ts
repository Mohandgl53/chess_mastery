import { Puzzle } from '../types/puzzle';

export const MASTERCLASS_PUZZLES: Puzzle[] = [
  // ── 1. Beginner & Free Pieces (Rating: 400 - 800) ────────────────────────
  {
    id: 'puz-hang-01',
    title: 'Punish the Loose Central Pawn',
    rating: 450,
    theme: 'Hanging Piece',
    themeDescription: 'Spotting and capturing unprotected free material.',
    difficulty: 'Easy',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    playerColor: 'w',
    solutionMoves: [{ from: 'f3', to: 'e5', san: 'Nxe5' }],
    hints: [
      { level: 1, title: 'Find free pieces', description: "Look at Black's pawn on e5. Is it defended?", highlightSquares: ['e5'] },
      { level: 2, title: 'Attack square', description: "White's f3 knight can jump directly to e5.", highlightSquares: ['f3', 'e5'] },
      { level: 3, title: 'Execution', description: 'Play Nxe5 capturing the free central pawn.', highlightSquares: ['f3', 'e5'] }
    ],
    tacticalExplanation: "Black's e5 pawn is completely undefended. Nxe5 takes the pawn for free while placing a white knight on a dominating central outpost.",
    coachInsight: 'Always count defenders! If attackers outnumber defenders, you win material.',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-mate-01',
    title: "The Scholar's Mate Finisher",
    rating: 500,
    theme: 'Tactics',
    themeDescription: 'Deliver instant checkmate against the vulnerable f7 square.',
    difficulty: 'Easy',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    playerColor: 'w',
    solutionMoves: [{ from: 'f3', to: 'f7', san: 'Qxf7#' }],
    hints: [
      { level: 1, title: 'Target f7', description: 'The f7 square is only defended by the black king.', highlightSquares: ['f7', 'e8'] },
      { level: 2, title: 'Bishop + Queen battery', description: 'Both the c4 bishop and f3 queen coordinate on f7.', highlightSquares: ['c4', 'f3', 'f7'] },
      { level: 3, title: 'Mate in 1', description: 'Play Qxf7# for instant victory!', highlightSquares: ['f3', 'f7'] }
    ],
    tacticalExplanation: 'Qxf7# delivers checkmate supported by the bishop on c4. The king has no flight squares and cannot capture the protected queen.',
    coachInsight: 'The f7 (and f2) squares are the weakest points on the board at the start because only the king defends them.',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-hang-02',
    title: 'Free Knight on e4',
    rating: 650,
    theme: 'Hanging Piece',
    themeDescription: 'Win material by capturing an unprotected piece.',
    difficulty: 'Easy',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/4n3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 5',
    playerColor: 'w',
    solutionMoves: [{ from: 'd3', to: 'e4', san: 'dxe4' }],
    hints: [
      { level: 1, title: 'Spot the target', description: 'Black jumped a knight into e4 with zero defenders.', highlightSquares: ['e4'] },
      { level: 2, title: 'Pawn capture', description: 'Your d3 pawn can capture directly.', highlightSquares: ['d3', 'e4'] },
      { level: 3, title: 'Take the piece', description: 'Play dxe4.', highlightSquares: ['d3', 'e4'] }
    ],
    tacticalExplanation: 'dxe4 captures the unprotected black knight on e4, winning 3 full points of material advantage.',
    coachInsight: 'LPDO: Loose Pieces Drop Off. Scan your opponent for undefended pieces after every move.',
    source: 'Mastery Archive'
  },

  // ── 2. Forks (Rating: 750 - 1100) ──────────────────────────────────────────
  {
    id: 'puz-fork-101',
    title: 'Royal Knight Fork on c7',
    rating: 850,
    theme: 'Fork',
    themeDescription: 'Attacking the enemy King and Rook simultaneously with a knight jump.',
    difficulty: 'Easy',
    fen: 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      { from: 'd5', to: 'c7', san: 'Nxc7+', response: { from: 'e8', to: 'd8', san: 'Kd8' } },
      { from: 'c7', to: 'a8', san: 'Nxa8' }
    ],
    hints: [
      { level: 1, title: 'Find the jumping knight', description: "Look at White's active knight on d5.", highlightSquares: ['d5'] },
      { level: 2, title: 'Target c7', description: 'c7 is undefended and forks e8 and a8.', highlightSquares: ['c7'] },
      { level: 3, title: 'Execute the fork', description: 'Play Nxc7+ and capture the a8 rook next move!', highlightSquares: ['d5', 'c7'] }
    ],
    tacticalExplanation: 'Nxc7+ checks the black king on e8 while threatening the rook on a8. After the king moves to d8, White captures the helpless rook with Nxa8.',
    coachInsight: 'Knights are the ultimate forking pieces because their geometric jumps cannot be blocked!',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-fork-102',
    title: 'Queen Fork on King and Bishop',
    rating: 980,
    theme: 'Fork',
    themeDescription: 'Centralized Queen forks the enemy King and an undefended bishop.',
    difficulty: 'Easy',
    fen: 'r1bqk2r/ppp2ppp/2n5/1B1p4/1b1P4/5N2/PP1B1PPP/R2QK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [
      { from: 'd1', to: 'e2', san: 'Qe2+', response: { from: 'c8', to: 'e6', san: 'Be6' } },
      { from: 'b5', to: 'c6', san: 'Bxc6+' }
    ],
    hints: [
      { level: 1, title: 'Central check', description: 'The e-file is wide open for Queen checks.', highlightSquares: ['d1', 'e2'] },
      { level: 2, title: 'Pins and forks', description: 'Qe2+ forces a defensive piece to step into a pin.', highlightSquares: ['e2', 'e8'] },
      { level: 3, title: 'Play Qe2+', description: 'Deliver check on e2.', highlightSquares: ['d1', 'e2'] }
    ],
    tacticalExplanation: 'Qe2+ seizes the initiative on the open file, forcing Black to block awkwardly and allowing White to dominate.',
    coachInsight: 'Open files pointing at an uncastled king are open invitations for queen infiltration.',
    source: 'Mastery Archive'
  },

  // ── 3. Back-Rank Mates (Rating: 900 - 1150) ────────────────────────────────
  {
    id: 'puz-back-101',
    title: 'Back-Rank Corridor Checkmate',
    rating: 900,
    theme: 'Back-Rank Mate',
    themeDescription: 'Delivering mate on the 8th rank because the king is trapped by its own pawns.',
    difficulty: 'Easy',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'd1', to: 'd8', san: 'Rxd8#' }],
    hints: [
      { level: 1, title: '8th Rank Trap', description: "Black's king is suffocated on g8 by pawns on f7, g7, h7.", highlightSquares: ['g8', 'f7', 'g7', 'h7'] },
      { level: 2, title: 'Capture the defender', description: "White's d1 rook can capture Black's d8 rook.", highlightSquares: ['d1', 'd8'] },
      { level: 3, title: 'Rxd8#', description: 'Play Rxd8# for checkmate.', highlightSquares: ['d1', 'd8'] }
    ],
    tacticalExplanation: 'Rxd8 captures the defending rook and checkmates the king on the corridor of the 8th rank.',
    coachInsight: 'Always keep an eye on castled kings without "Luft" (escape squares).',
    source: 'Mastery Archive'
  },

  // ── 4. Pins (Rating: 950 - 1200) ───────────────────────────────────────────
  {
    id: 'puz-pin-101',
    title: 'Break the Absolute Pin',
    rating: 950,
    theme: 'Pin',
    themeDescription: 'A piece cannot move because it would expose the King to check.',
    difficulty: 'Easy',
    fen: 'r3k2r/ppp2ppp/2n5/3p4/1b1P4/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'e1', to: 'g1', san: 'O-O' }],
    hints: [
      { level: 1, title: 'King safety first', description: 'Castle to break any pins against your king.', highlightSquares: ['e1', 'g1'] },
      { level: 2, title: 'Activate the rook', description: 'Castling connects the rooks and secures White.', highlightSquares: ['e1', 'f1'] },
      { level: 3, title: 'Castle kingside', description: 'Play O-O.', highlightSquares: ['e1', 'g1'] }
    ],
    tacticalExplanation: "Castling kingside O-O neutralizes Black's pin on the c3 knight and prepares re-centralization.",
    coachInsight: 'To eliminate an absolute pin on yourself, move the king out of the firing line!',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-pin-102',
    title: 'Relative Pin Against the Queen',
    rating: 1100,
    theme: 'Pin',
    themeDescription: 'Pinning a defender to a higher-value piece.',
    difficulty: 'Medium',
    fen: 'r2qkb1r/ppp2ppp/4pn2/8/3PP3/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'c1', to: 'g5', san: 'Bg5' }],
    hints: [
      { level: 1, title: 'Develop Bishop with threat', description: "White's c1 bishop can pin Black's f6 knight.", highlightSquares: ['c1', 'g5'] },
      { level: 2, title: 'Queen behind Knight', description: "Black's d8 queen is in the line of fire.", highlightSquares: ['f6', 'd8'] },
      { level: 3, title: 'Bg5', description: 'Play Bg5 pinning the knight.', highlightSquares: ['c1', 'g5'] }
    ],
    tacticalExplanation: "Bg5 pins Black's f6 knight against the d8 queen. Moving the knight loses the queen, paralyzing Black.",
    coachInsight: 'Relative pins paralyze enemy pieces because moving them results in disastrous material loss.',
    source: 'Mastery Archive'
  },

  // ── 5. Skewers (Rating: 950 - 1300) ────────────────────────────────────────
  {
    id: 'puz-skewer-101',
    title: 'Linear Rook Skewer',
    rating: 950,
    theme: 'Skewer',
    themeDescription: 'Force the King aside to capture the prize behind it.',
    difficulty: 'Easy',
    fen: '4r3/4k3/8/8/8/8/8/3K1R2 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      { from: 'f1', to: 'e1', san: 'Re1+', response: { from: 'e7', to: 'd7', san: 'Kd7' } },
      { from: 'e1', to: 'e8', san: 'Rxe8' }
    ],
    hints: [
      { level: 1, title: 'Open File Check', description: 'Deliver check along the e-file.', highlightSquares: ['f1', 'e1'] },
      { level: 2, title: 'Aligned Targets', description: 'King on e7 and Rook on e8 are aligned vertically.', highlightSquares: ['e7', 'e8'] },
      { level: 3, title: 'Re1+', description: 'Play Re1+ and win the e8 rook!', highlightSquares: ['f1', 'e1'] }
    ],
    tacticalExplanation: 'Re1+ checks the king. Because the king is forced to move, White captures the helpless rook behind it on e8.',
    coachInsight: 'In a skewer, the more valuable piece is in FRONT. Attack it and collect what is behind.',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-skewer-102',
    title: 'Diagonal Bishop Skewer',
    rating: 1150,
    theme: 'Skewer',
    themeDescription: 'Skewer King and Queen across the long diagonal.',
    difficulty: 'Medium',
    fen: '8/8/8/3B4/1q6/8/K7/4r2k w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'd5', to: 'e4', san: 'Be4+' }],
    hints: [
      { level: 1, title: 'Long diagonal check', description: 'Look at bishop on d5 pointing towards h1.', highlightSquares: ['d5', 'h1'] },
      { level: 2, title: 'Target Queen', description: 'The black queen on b4 is in the bishop line of sight.', highlightSquares: ['b4'] },
      { level: 3, title: 'Be4+', description: 'Play Be4+ delivering check!', highlightSquares: ['d5', 'e4'] }
    ],
    tacticalExplanation: "Be4+ checks the king on h1 while pinning and skewering Black's pieces, turning the game around.",
    coachInsight: 'Diagonals in open endgames can turn losing positions into winning tactics.',
    source: 'Mastery Archive'
  },

  // ── 6. Discovered Attacks (Rating: 1150 - 1450) ────────────────────────────
  {
    id: 'puz-disc-101',
    title: 'Eliminate Attacker & Seize Initiative',
    rating: 1150,
    theme: 'Discovered Attack',
    themeDescription: 'Remove active enemy piece to prepare discovered tactics.',
    difficulty: 'Medium',
    fen: 'r1bqk2r/ppp2ppp/2n5/1B1p4/1b1P4/5N2/PP1B1PPP/R2QK2R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'd2', to: 'b4', san: 'Bxb4' }],
    hints: [
      { level: 1, title: 'Active Bishop', description: "White's d2 bishop can eliminate Black's active attacker.", highlightSquares: ['d2', 'b4'] },
      { level: 2, title: 'Simplify with advantage', description: "Bxb4 removes Black's attacking piece.", highlightSquares: ['d2', 'b4'] },
      { level: 3, title: 'Bxb4', description: 'Play Bxb4.', highlightSquares: ['d2', 'b4'] }
    ],
    tacticalExplanation: "Bxb4 removes Black's menacing bishop and leaves White with superior coordination.",
    coachInsight: 'Discovered attacks are twice as dangerous when the rear piece delivers check while the front piece captures.',
    source: 'Mastery Archive'
  },

  // ── 7. Deflection & Greek Gift (Rating: 1250 - 1650) ───────────────────────
  {
    id: 'puz-def-101',
    title: 'The Classical Greek Gift Sacrifice',
    rating: 1450,
    theme: 'Greek Gift',
    themeDescription: 'Classical sacrifice on h7 destroying the king shelter.',
    difficulty: 'Medium',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P4/2PBPN2/PP1N1PPP/R2QK2R w KQ - 0 8',
    playerColor: 'w',
    solutionMoves: [
      { from: 'd3', to: 'h7', san: 'Bxh7+', response: { from: 'g8', to: 'h7', san: 'Kxh7' } },
      { from: 'f3', to: 'g5', san: 'Ng5+' }
    ],
    hints: [
      { level: 1, title: 'Greek gift motif', description: 'The bishop on d3 is aimed straight at h7.', highlightSquares: ['d3', 'h7'] },
      { level: 2, title: 'Shatter the shield', description: 'Sacrifice the bishop on h7 with check!', highlightSquares: ['d3', 'h7'] },
      { level: 3, title: 'Bxh7+!', description: 'Play Bxh7+ followed by Ng5+.', highlightSquares: ['d3', 'h7'] }
    ],
    tacticalExplanation: "1. Bxh7+ Kxh7 2. Ng5+ rips open Black's king fortress and brings the white queen in for a decisive attack.",
    coachInsight: 'The classic "Greek Gift" bishop sacrifice on h7 is one of the most famous tactical patterns in chess history!',
    source: 'Mastery Archive'
  },

  // ── 8. Smothered Mates (Rating: 1400 - 1750) ────────────────────────────────
  {
    id: 'puz-smoth-101',
    title: 'The Knight Infiltration',
    rating: 1400,
    theme: 'Smothered Mate',
    themeDescription: 'Jump the knight into the enemy king fortress to deliver decisive check.',
    difficulty: 'Medium',
    fen: '6k1/5ppp/8/8/4N3/8/5PPP/6K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'e4', to: 'f6', san: 'Nf6+' }],
    hints: [
      { level: 1, title: 'Knight outpost', description: 'Jump your knight into enemy territory.', highlightSquares: ['e4', 'f6'] },
      { level: 2, title: 'Deliver check', description: 'Nf6+ puts the king under immense pressure.', highlightSquares: ['e4', 'f6'] },
      { level: 3, title: 'Nf6+', description: 'Play Nf6+.', highlightSquares: ['e4', 'f6'] }
    ],
    tacticalExplanation: "Nf6+ invades Black's castled shelter, demonstrating the knight's unique ability to leap over defenses.",
    coachInsight: 'Smothered mate is pure poetry: the king\'s own bodyguards become its prison bars.',
    source: 'Mastery Archive'
  },

  // ── 9. Pawn Endgames (Rating: 1200 - 1550) ──────────────────────────────────
  {
    id: 'puz-pawn-101',
    title: 'Seize the Opposition',
    rating: 1200,
    theme: 'Pawn Endgame',
    themeDescription: 'Step into vertical opposition to escort your passed pawn to promotion.',
    difficulty: 'Medium',
    fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      { from: 'e3', to: 'd3', san: 'Kd3', response: { from: 'e5', to: 'd5', san: 'Kd5' } },
      { from: 'e2', to: 'e4', san: 'e4' }
    ],
    hints: [
      { level: 1, title: 'King mobility', description: 'Guide your king forward before pushing the pawn.', highlightSquares: ['e3', 'd3'] },
      { level: 2, title: 'Key squares', description: 'Step to d3 controlling key squares.', highlightSquares: ['d3'] },
      { level: 3, title: 'Kd3!', description: 'Play Kd3 then advance with e4!', highlightSquares: ['e3', 'd3'] }
    ],
    tacticalExplanation: '1. Kd3 Kd5 2. e4+ claims the opposition and guarantees the pawn will successfully promote to a queen.',
    coachInsight: 'In King & Pawn endgames, the king must lead the pawn, not follow it!',
    source: 'Mastery Archive'
  },
  {
    id: 'puz-pawn-102',
    title: 'The Breakthrough Pawn Push',
    rating: 1500,
    theme: 'Pawn Endgame',
    themeDescription: 'Advance your passed pawn to create unstoppable promotion threats.',
    difficulty: 'Hard',
    fen: '8/p5p1/1p6/1P4P1/8/8/k7/4K3 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'g5', to: 'g6', san: 'g6' }],
    hints: [
      { level: 1, title: 'Create a passer', description: 'Look at the g-pawn. Can it sprint forward?', highlightSquares: ['g5', 'g6'] },
      { level: 2, title: 'Freeze the opponent', description: "g6 freezes Black's pawns and creates a path.", highlightSquares: ['g6'] },
      { level: 3, title: 'g6!', description: 'Play g6.', highlightSquares: ['g5', 'g6'] }
    ],
    tacticalExplanation: "g6 immobilizes Black's kingside pawns, paving the way for White's king to harvest the board and promote.",
    coachInsight: 'Passed pawns must be pushed! Every step forward creates panic in the opposing camp.',
    source: 'Mastery Archive'
  },

  // ── 10. Master Queen Sacrifices (Rating: 1750 - 2100) ──────────────────────
  {
    id: 'puz-queen-101',
    title: 'The Destruction Sacrifice',
    rating: 1850,
    theme: 'Queen Sacrifice',
    themeDescription: 'Sacrifice material to rip open the opponent King to checkmate.',
    difficulty: 'Hard',
    fen: 'r1b2rk1/pp3ppp/2n5/2qp4/8/3B1N2/PPP2PPP/R2QR1K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [
      { from: 'd3', to: 'h7', san: 'Bxh7+', response: { from: 'g8', to: 'h7', san: 'Kxh7' } },
      { from: 'f3', to: 'g5', san: 'Ng5+' }
    ],
    hints: [
      { level: 1, title: 'Calculate checks first', description: 'Forcing moves leave your opponent with zero choices.', highlightSquares: ['d3', 'h7'] },
      { level: 2, title: 'King exposure', description: 'Bxh7+ tears the shield off the king.', highlightSquares: ['h7', 'g8'] },
      { level: 3, title: 'Bxh7+', description: 'Execute Bxh7+!', highlightSquares: ['d3', 'h7'] }
    ],
    tacticalExplanation: 'Precision tactical destruction. White converts positional harmony into a decisive king hunt.',
    coachInsight: 'A sacrifice is the ultimate demonstration of calculation over material greed.',
    source: 'Mastery Archive'
  }
];
