import { PracticePuzzleData } from '../services/api/practiceApi';

export interface PracticeDrillDefinition {
  theme: string;
  category: 'OPENINGS' | 'MIDDLEGAME' | 'ENDGAME' | 'TACTICS';
  ratingTier: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER';
  rating: number;
  title: string;
  desc: string;
  puzzle: PracticePuzzleData & {
    solutionMoves: Array<{ from: string; to: string; san: string; response?: { from: string; to: string; san: string } }>;
  };
}

export const ALL_PRACTICE_DRILLS: PracticeDrillDefinition[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // OPENINGS
  // ───────────────────────────────────────────────────────────────────────────
  {
    theme: 'SICILIAN_DEFENSE',
    category: 'OPENINGS',
    ratingTier: 'INTERMEDIATE',
    rating: 1250,
    title: 'Sicilian Defense: Open Sicilian d5 Break',
    desc: 'Strike at the white center with the classic ...d5 central counter-punch in the Open Sicilian.',
    puzzle: {
      id: 'drill-open-sicilian-1',
      title: 'Sicilian Defense: The ...d5 Central Strike',
      theme: 'SICILIAN_DEFENSE',
      rating: 1250,
      difficulty: 'MEDIUM',
      fen: 'r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5',
      playerColor: 'b',
      hints: [
        { level: 1, title: 'Central Tension', description: 'Look at the pawn tension on d4 and d6.', highlightSquares: ['d6', 'd4'] },
        { level: 2, title: 'Counter-punch', description: 'Black can contest White\'s center directly with an e-pawn thrust.', highlightSquares: ['e7', 'e5'] },
        { level: 3, title: 'Solution', description: 'Play e5! Seize central space and kick White\'s d4 knight.', highlightSquares: ['e7', 'e5', 'd4'] }
      ],
      tacticalExplanation: '1... e5 forces White\'s centralized knight to retreat and asserts Black\'s control over the center, establishing the classic Boleslavsky/Najdorf pawn structure.',
      coachInsight: 'In the Sicilian Defense, Black must never play passively. Striking the center gives dynamic counter-chances!',
      solutionMoves: [
        { from: 'e7', to: 'e5', san: 'e5' }
      ]
    }
  },
  {
    theme: 'FRENCH_DEFENSE',
    category: 'OPENINGS',
    ratingTier: 'INTERMEDIATE',
    rating: 1150,
    title: 'French Defense: Attacking the Pawn Chain Base',
    desc: 'Undermine White\'s central pawn wedge with the thematic 2... c5 lever.',
    puzzle: {
      id: 'drill-french-1',
      title: 'French Defense: The ...c5 Pawn Wedge Strike',
      theme: 'FRENCH_DEFENSE',
      rating: 1150,
      difficulty: 'MEDIUM',
      fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
      playerColor: 'b',
      hints: [
        { level: 1, title: 'Pawn Chain', description: 'White\'s d4-e5 pawn chain restricts your kingside space.', highlightSquares: ['d4', 'e5'] },
        { level: 2, title: 'Attack the Base', description: 'Attack the base of the chain on d4 using your c-pawn.', highlightSquares: ['c7', 'd4'] },
        { level: 3, title: 'Solution', description: 'Play c5! Direct challenge to the d4 foundation.', highlightSquares: ['c7', 'c5'] }
      ],
      tacticalExplanation: '3... c5 is the quintessential French Defense reaction! Striking at d4 chips away at White\'s central space advantage.',
      coachInsight: 'Always attack pawn chains at their base, not their apex.',
      solutionMoves: [
        { from: 'c7', to: 'c5', san: 'c5' }
      ]
    }
  },
  {
    theme: 'ITALIAN_GAME',
    category: 'OPENINGS',
    ratingTier: 'NOVICE',
    rating: 850,
    title: 'Italian Game: Rapid f7 Targeting',
    desc: 'Develop the light-squared bishop to c4 targeting Black\'s vulnerable f7 square.',
    puzzle: {
      id: 'drill-italian-1',
      title: 'Italian Game: Classical Bishop Deployment',
      theme: 'ITALIAN_GAME',
      rating: 850,
      difficulty: 'EASY',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Develop Bishop', description: 'White\'s light-squared bishop on f1 is ready to join the fight.', highlightSquares: ['f1'] },
        { level: 2, title: 'Optimal Outpost', description: 'c4 eyes Black\'s weakest square: f7.', highlightSquares: ['c4', 'f7'] },
        { level: 3, title: 'Solution', description: 'Play Bc4 to initiate the classical Italian Game!', highlightSquares: ['f1', 'c4'] }
      ],
      tacticalExplanation: '3. Bc4 puts immediate pressure on the vulnerable f7 square, which is defended solely by the Black King in the opening.',
      coachInsight: 'The Italian Game is a timeless opening emphasizing rapid development, piece harmony, and king safety.',
      solutionMoves: [
        { from: 'f1', to: 'c4', san: 'Bc4' }
      ]
    }
  },
  {
    theme: 'RUY_LOPEZ',
    category: 'OPENINGS',
    ratingTier: 'ADVANCED',
    rating: 1450,
    title: 'Ruy Lopez: Pressuring the e5 Defender',
    desc: 'Pin and contest the knight on c6 that guards Black\'s central e5 pawn.',
    puzzle: {
      id: 'drill-ruy-lopez-1',
      title: 'Ruy Lopez (Spanish Opening): 3. Bb5',
      theme: 'RUY_LOPEZ',
      rating: 1450,
      difficulty: 'HARD',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Spanish Pin', description: 'Step your bishop beyond your territory to apply deep pressure.', highlightSquares: ['f1'] },
        { level: 2, title: 'Target c6', description: 'Attacking the c6 defender loosens Black\'s hold on e5.', highlightSquares: ['b5', 'c6'] },
        { level: 3, title: 'Solution', description: 'Play Bb5! The foundational move of the Ruy Lopez.', highlightSquares: ['f1', 'b5'] }
      ],
      tacticalExplanation: '3. Bb5 pressures Black\'s c6 knight, introducing positional tension on e5 that can dictate the game for dozens of moves.',
      coachInsight: 'The Spanish Opening has been tested by every World Champion in modern chess history.',
      solutionMoves: [
        { from: 'f1', to: 'b5', san: 'Bb5' }
      ]
    }
  },
  {
    theme: 'QUEENS_GAMBIT',
    category: 'OPENINGS',
    ratingTier: 'INTERMEDIATE',
    rating: 1100,
    title: "Queen's Gambit: Central Pawn Sacrifice",
    desc: 'Offer the c-pawn with 2. c4 to divert Black from the center and dominate the board.',
    puzzle: {
      id: 'drill-qg-1',
      title: "Queen's Gambit: 2. c4 Central Lever",
      theme: 'QUEENS_GAMBIT',
      rating: 1100,
      difficulty: 'MEDIUM',
      fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Flank Lever', description: 'Attack Black\'s d5 pawn from the side.', highlightSquares: ['c2', 'd5'] },
        { level: 2, title: 'Gambit Pawn', description: 'Push your c-pawn two squares to offer a temporary gambit.', highlightSquares: ['c4'] },
        { level: 3, title: 'Solution', description: 'Play c4! The Queen\'s Gambit.', highlightSquares: ['c2', 'c4'] }
      ],
      tacticalExplanation: '2. c4 offers the c-pawn. If Black takes with 2... dxc4, White enjoys central dominance and recovers the pawn easily with e4 and Bxc4.',
      coachInsight: 'The Queen\'s Gambit is not a true gambit because White can always regain the pawn with superior central control.',
      solutionMoves: [
        { from: 'c2', to: 'c4', san: 'c4' }
      ]
    }
  },
  {
    theme: 'CARO_KANN',
    category: 'OPENINGS',
    ratingTier: 'NOVICE',
    rating: 950,
    title: 'Caro-Kann Defense: Solid d5 Preparation',
    desc: 'Prepare the central d5 strike without blocking your light-squared bishop.',
    puzzle: {
      id: 'drill-caro-1',
      title: 'Caro-Kann: 1... c6 Foundation',
      theme: 'CARO_KANN',
      rating: 950,
      difficulty: 'EASY',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      playerColor: 'b',
      hints: [
        { level: 1, title: 'Pawn Support', description: 'Support the d5 push from the flank.', highlightSquares: ['c7'] },
        { level: 2, title: 'One Square', description: 'Move the c-pawn one square forward.', highlightSquares: ['c6'] },
        { level: 3, title: 'Solution', description: 'Play c6 preparing d5 next turn.', highlightSquares: ['c7', 'c6'] }
      ],
      tacticalExplanation: '1... c6 prepares 2... d5. Unlike the French Defense (1... e6), Black\'s light-squared bishop remains free to develop to f5 or g4.',
      coachInsight: 'The Caro-Kann gives you a rock-solid pawn structure with zero weaknesses.',
      solutionMoves: [
        { from: 'c7', to: 'c6', san: 'c6' }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // MIDDLEGAME STRATEGY
  // ───────────────────────────────────────────────────────────────────────────
  {
    theme: 'KNIGHT_OUTPOST',
    category: 'MIDDLEGAME',
    ratingTier: 'ADVANCED',
    rating: 1550,
    title: 'Knight Outpost on d5',
    desc: 'Anchor your knight on an advanced central hole where enemy pawns cannot dislodge it.',
    puzzle: {
      id: 'drill-mid-outpost-1',
      title: 'Seize the Undefended Central Hole',
      theme: 'KNIGHT_OUTPOST',
      rating: 1550,
      difficulty: 'HARD',
      fen: 'r2q1rk1/1pp1bppp/p1np1n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 9',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Weak Central Square', description: 'Notice that Black can never play ...c6 or ...e6 to kick a piece on d5.', highlightSquares: ['d5'] },
        { level: 2, title: 'Knight Leap', description: 'Hop your c3 knight into the d5 sanctuary.', highlightSquares: ['c3', 'd5'] },
        { level: 3, title: 'Solution', description: 'Play Nd5! Dominating the center.', highlightSquares: ['c3', 'd5'] }
      ],
      tacticalExplanation: 'Nd5 plants the knight on an untouchable outpost. Black cannot drive it away with pawns, giving White an enduring positional clamp.',
      coachInsight: 'An octopus knight on the 5th rank paralyzes opponent coordination.',
      solutionMoves: [
        { from: 'c3', to: 'd5', san: 'Nd5' }
      ]
    }
  },
  {
    theme: 'GREEK_GIFT',
    category: 'MIDDLEGAME',
    ratingTier: 'MASTER',
    rating: 1850,
    title: 'The Greek Gift Sacrifice (Bxh7+)',
    desc: 'Obliterate the black king\'s pawn barrier with a decisive bishop sacrifice on h7.',
    puzzle: {
      id: 'drill-mid-greekgift-1',
      title: 'Classic Classical Bishop Sacrifice',
      theme: 'GREEK_GIFT',
      rating: 1850,
      difficulty: 'HARD',
      fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 0 8',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Kingside Weakness', description: 'Black\'s h7 pawn has no defender except the king.', highlightSquares: ['h7', 'g8'] },
        { level: 2, title: 'Sacrifice', description: 'Your light-squared bishop can smash the h7 pawn with check.', highlightSquares: ['d3', 'h7'] },
        { level: 3, title: 'Solution', description: 'Play Bxh7+! Forcing the king out into the open.', highlightSquares: ['d3', 'h7'] }
      ],
      tacticalExplanation: 'Bxh7+ strips the black king of its pawn barrier. Followed by Ng5+ and Qh5, White launches a winning mating attack.',
      coachInsight: 'Check for the 3 conditions: bishop on d3, knight on f3, queen ready to reach h5 or g4!',
      solutionMoves: [
        { from: 'd3', to: 'h7', san: 'Bxh7+' }
      ]
    }
  },
  {
    theme: 'PROPHYLAXIS',
    category: 'MIDDLEGAME',
    ratingTier: 'ADVANCED',
    rating: 1600,
    title: 'Prophylaxis: Neutralizing the Enemy Break',
    desc: 'Anticipate Black\'s intended tactical counter-strike and shut it down in advance.',
    puzzle: {
      id: 'drill-mid-proph-1',
      title: 'Prophylactic Defense with h3',
      theme: 'PROPHYLAXIS',
      rating: 1600,
      difficulty: 'HARD',
      fen: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 4 8',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Enemy Threat', description: 'Black wants to jump Bg4 or Ng4 targeting your f3 piece.', highlightSquares: ['g4'] },
        { level: 2, title: 'Quiet Guard', description: 'Push your h-pawn one square to deny the g4 square permanently.', highlightSquares: ['h2', 'h3'] },
        { level: 3, title: 'Solution', description: 'Play h3 to neutralize Black\'s piece activity.', highlightSquares: ['h2', 'h3'] }
      ],
      tacticalExplanation: '1. h3 is a classic prophylactic pawn move that denies Black\'s minor pieces access to the g4 square before complications arise.',
      coachInsight: 'Grandmasters prevent problems two moves before they occur.',
      solutionMoves: [
        { from: 'h2', to: 'h3', san: 'h3' }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ENDGAME TECHNIQUE
  // ───────────────────────────────────────────────────────────────────────────
  {
    theme: 'KING_AND_PAWN',
    category: 'ENDGAME',
    ratingTier: 'INTERMEDIATE',
    rating: 1100,
    title: 'King & Pawn: Seizing the Opposition',
    desc: 'Face the enemy king with an odd number of squares to take the direct opposition and force passage.',
    puzzle: {
      id: 'drill-end-opposition-1',
      title: 'Direct Opposition to Win the Pawn Race',
      theme: 'KING_AND_PAWN',
      rating: 1100,
      difficulty: 'MEDIUM',
      fen: '8/4k3/8/4P3/8/4K3/8/8 w - - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'King Step', description: 'Do not push the pawn immediately! Bring the king forward.', highlightSquares: ['e3'] },
        { level: 2, title: 'Direct Opposition', description: 'Place your king directly opposite the enemy king on the same file.', highlightSquares: ['e4', 'e7'] },
        { level: 3, title: 'Solution', description: 'Play Ke4 taking the direct opposition.', highlightSquares: ['e3', 'e4'] }
      ],
      tacticalExplanation: 'Ke4 seizes the direct opposition! Black must step aside to the left or right, allowing the White King to escort the passed e-pawn to promotion.',
      coachInsight: 'In King and Pawn endings: King before Pawn! The pawn needs an escort, not a follower.',
      solutionMoves: [
        { from: 'e3', to: 'e4', san: 'Ke4' }
      ]
    }
  },
  {
    theme: 'LUCENA_POSITION',
    category: 'ENDGAME',
    ratingTier: 'ADVANCED',
    rating: 1650,
    title: 'Lucena Position: Building the Bridge',
    desc: 'Master the fundamental winning technique in Rook & Pawn endings: the 4th rank bridge.',
    puzzle: {
      id: 'drill-end-lucena-1',
      title: 'Lucena Bridge: Stationing Rook on the 4th Rank',
      theme: 'LUCENA_POSITION',
      rating: 1650,
      difficulty: 'HARD',
      fen: '1K1k4/1P6/8/8/8/8/7r/4R3 w - - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: '4th Rank Placement', description: 'White needs to shield the king from horizontal rook checks.', highlightSquares: ['e4'] },
        { level: 2, title: 'Re4 Move', description: 'Swing your rook to e4 to prepare the bridge.', highlightSquares: ['e1', 'e4'] },
        { level: 3, title: 'Solution', description: 'Play Re4! The key bridge-building rank.', highlightSquares: ['e1', 'e4'] }
      ],
      tacticalExplanation: '1. Re4 is the critical first step of building the bridge. Once the white king steps out to d7 and c7, Black gives rook checks, and Re4 will block the check on the 4th rank!',
      coachInsight: 'The Lucena Position is the single most important technical endgame pattern for chess improvement.',
      solutionMoves: [
        { from: 'e1', to: 'e4', san: 'Re4' }
      ]
    }
  },
  {
    theme: 'PHILIDOR_DEFENSE',
    category: 'ENDGAME',
    ratingTier: 'ADVANCED',
    rating: 1500,
    title: 'Philidor Defense: 3rd Rank Barrier',
    desc: 'Maintain a 3rd rank rook barrier against an advancing enemy king to secure a clean draw.',
    puzzle: {
      id: 'drill-end-philidor-1',
      title: 'Rook on the 6th/3rd Rank Fortress',
      theme: 'PHILIDOR_DEFENSE',
      rating: 1500,
      difficulty: 'HARD',
      fen: '4k3/8/8/4KP2/8/8/2r5/R7 b - - 0 1',
      playerColor: 'b',
      hints: [
        { level: 1, title: 'King Barrier', description: 'Prevent the white king from stepping onto the 6th rank.', highlightSquares: ['e6', 'f6'] },
        { level: 2, title: '6th Rank Rook', description: 'Place your rook on the 6th rank.', highlightSquares: ['c6'] },
        { level: 3, title: 'Solution', description: 'Play Rc6! Cutting off the white king.', highlightSquares: ['c2', 'c6'] }
      ],
      tacticalExplanation: '1... Rc6 establishes the Philidor barrier! The White King cannot advance. As soon as White pushes the pawn to f6, Black swings the rook to the 1st rank for infinite rear checks.',
      coachInsight: 'Hold the 3rd/6th rank until the pawn pushes, then drop back and deliver checks from behind.',
      solutionMoves: [
        { from: 'c2', to: 'c6', san: 'Rc6' }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TACTICAL COMBINATIONS
  // ───────────────────────────────────────────────────────────────────────────
  {
    theme: 'FORK',
    category: 'TACTICS',
    ratingTier: 'NOVICE',
    rating: 850,
    title: 'Royal Knight Fork on c7',
    desc: 'Simultaneously attack the black king and corner rook with an explosive knight fork.',
    puzzle: {
      id: 'drill-tac-fork-1',
      title: 'Royal Knight Fork on c7',
      theme: 'FORK',
      rating: 850,
      difficulty: 'EASY',
      fen: 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Find the Knight', description: 'White\'s active knight on d5 is ready to strike.', highlightSquares: ['d5'] },
        { level: 2, title: 'Double Attack', description: 'c7 checks the king on e8 and hits the rook on a8.', highlightSquares: ['c7', 'e8', 'a8'] },
        { level: 3, title: 'Solution', description: 'Play Nxc7+ to win the rook!', highlightSquares: ['d5', 'c7'] }
      ],
      tacticalExplanation: 'Nxc7+ checks the king and forks the a8 rook. Black must spend a turn moving the king, letting White capture the free rook.',
      coachInsight: 'Always calculate knight checks on c7 and f7 when kings are uncastled!',
      solutionMoves: [
        { from: 'd5', to: 'c7', san: 'Nxc7+' }
      ]
    }
  },
  {
    theme: 'PIN',
    category: 'TACTICS',
    ratingTier: 'NOVICE',
    rating: 900,
    title: 'Absolute Pin Against King',
    desc: 'Freeze the c6 defender completely by pinning it along the diagonal to the king.',
    puzzle: {
      id: 'drill-tac-pin-1',
      title: 'Absolute Pin with Bb5',
      theme: 'PIN',
      rating: 900,
      difficulty: 'EASY',
      fen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Diagonal Line', description: 'Look at the long diagonal pointing toward the black king on e8.', highlightSquares: ['e8'] },
        { level: 2, title: 'Pin Target', description: 'Deploy your f1 bishop to b5.', highlightSquares: ['b5', 'c6'] },
        { level: 3, title: 'Solution', description: 'Play Bb5 pinning the knight.', highlightSquares: ['f1', 'b5'] }
      ],
      tacticalExplanation: 'Bb5 pins the c6 knight absolutely to Black\'s king on e8. The knight is legally forbidden from moving!',
      coachInsight: 'Pinned pieces are helpless defenders. Attack them a second time to win material!',
      solutionMoves: [
        { from: 'f1', to: 'b5', san: 'Bb5' }
      ]
    }
  },
  {
    theme: 'SKEWER',
    category: 'TACTICS',
    ratingTier: 'INTERMEDIATE',
    rating: 1050,
    title: 'Linear Rook Skewer',
    desc: 'Check the king on the open file and capture the defenseless piece lined up behind it.',
    puzzle: {
      id: 'drill-tac-skewer-1',
      title: 'Linear File Skewer with Re1+',
      theme: 'SKEWER',
      rating: 1050,
      difficulty: 'MEDIUM',
      fen: '4r3/4k3/8/8/8/8/8/3K1R2 w - - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Aligned Pieces', description: 'Black\'s king and rook are lined up vertically on the e-file.', highlightSquares: ['e7', 'e8'] },
        { level: 2, title: 'Rook Check', description: 'Deliver check on the e-file.', highlightSquares: ['e1'] },
        { level: 3, title: 'Solution', description: 'Play Re1+ forcing the king away!', highlightSquares: ['f1', 'e1'] }
      ],
      tacticalExplanation: 'Re1+ forces the king to step aside, exposing the e8 rook behind it for capture next move.',
      coachInsight: 'In a skewer, the more valuable piece is in front. In a pin, it is in the rear.',
      solutionMoves: [
        { from: 'f1', to: 'e1', san: 'Re1+' }
      ]
    }
  },
  {
    theme: 'HANGING_PIECE',
    category: 'TACTICS',
    ratingTier: 'NOVICE',
    rating: 800,
    title: 'Capture Undefended Knight',
    desc: 'Spot the loose piece that has no pawn or piece defending it and snap it up.',
    puzzle: {
      id: 'drill-tac-hang-1',
      title: 'Punish the Loose Piece on e4',
      theme: 'HANGING_PIECE',
      rating: 800,
      difficulty: 'EASY',
      fen: 'r1bqk2r/pppp1ppp/2n5/4p3/4n3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 5',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Count Protectors', description: 'Look at Black\'s knight on e4. How many defenders does it have? Zero!', highlightSquares: ['e4'] },
        { level: 2, title: 'Pawn Capture', description: 'Capture with your d3 pawn.', highlightSquares: ['d3', 'e4'] },
        { level: 3, title: 'Solution', description: 'Play dxe4 winning a full piece.', highlightSquares: ['d3', 'e4'] }
      ],
      tacticalExplanation: '1. dxe4 takes the completely undefended black knight on e4, winning 3 points of material immediately.',
      coachInsight: 'Loose pieces drop off! Always scan the board for unprotected enemy pieces.',
      solutionMoves: [
        { from: 'd3', to: 'e4', san: 'dxe4' }
      ]
    }
  },
  {
    theme: 'BACK_RANK',
    category: 'TACTICS',
    ratingTier: 'INTERMEDIATE',
    rating: 1150,
    title: 'Back-Rank Corridor Checkmate',
    desc: 'Exploit the trapped enemy king blocked behind its own pawn wall.',
    puzzle: {
      id: 'drill-tac-backrank-1',
      title: 'Corridor Checkmate on d8',
      theme: 'BACK_RANK',
      rating: 1150,
      difficulty: 'MEDIUM',
      fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      playerColor: 'w',
      hints: [
        { level: 1, title: 'Corridor Trap', description: 'The black king is trapped on g8 behind pawns on f7, g7, and h7.', highlightSquares: ['g8', 'f7', 'g7', 'h7'] },
        { level: 2, title: 'Rook Trade & Mate', description: 'White\'s d1 rook can capture Black\'s d8 rook with checkmate.', highlightSquares: ['d1', 'd8'] },
        { level: 3, title: 'Solution', description: 'Play Rxd8# for checkmate!', highlightSquares: ['d1', 'd8'] }
      ],
      tacticalExplanation: '1. Rxd8# delivers checkmate because Black has no pawn luft (breathing room) on h7 or g7 to escape.',
      coachInsight: 'Always give your king an escape window with h3 or g3 in the middlegame to prevent back-rank mates!',
      solutionMoves: [
        { from: 'd1', to: 'd8', san: 'Rxd8#' }
      ]
    }
  }
];
