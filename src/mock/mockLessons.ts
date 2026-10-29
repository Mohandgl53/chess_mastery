import { CurriculumModule, Lesson } from '../types/learning';

export const MOCK_CURRICULUM: CurriculumModule[] = [
  {
    id: 'basics',
    title: '1. Chess Basics',
    subtitle: 'The foundational rules and board vision',
    description: 'Learn how every piece moves, board geometry, value of pieces, and essential rules.',
    iconName: 'BookOpen',
    lessons: [
      {
        id: 'basics-board-vision',
        title: 'Board Geometry & Coordinates',
        category: 'basics',
        categoryTitle: 'Chess Basics',
        description: 'Understand ranks, files, diagonals, and algebraic square notation.',
        difficulty: 'Beginner',
        durationMinutes: 5,
        totalSteps: 3,
        completed: true,
        progressPercent: 100,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'Ranks and Files',
            instruction: 'Read the concept and examine the board.',
            explanation: 'The chessboard consists of 64 squares arranged in 8 horizontal ranks (numbered 1 to 8) and 8 vertical files (lettered a to h).',
            fen: '8/8/8/8/8/8/8/8 w - - 0 1',
            turn: 'w',
            coachTip: 'Every square has a unique coordinate name, like e4 or c7.',
            highlightSquares: ['e4', 'd4', 'e5', 'd5']
          },
          {
            id: 'step-2',
            stepNumber: 2,
            type: 'question',
            title: 'Identify Central Squares',
            instruction: 'Which four squares make up the absolute center of the chessboard?',
            explanation: 'The four central squares are e4, d4, e5, and d5.',
            fen: '8/8/8/8/8/8/8/8 w - - 0 1',
            turn: 'w',
            options: [
              { id: 'opt-1', text: 'a1, a8, h1, h8', isCorrect: false, feedback: 'Those are the four corner squares.' },
              { id: 'opt-2', text: 'e4, d4, e5, d5', isCorrect: true, feedback: 'Correct! Dominating these 4 squares controls the board flow.' },
              { id: 'opt-3', text: 'c3, f3, c6, f6', isCorrect: false, feedback: 'Those are natural knight development squares, not the central squares.' }
            ],
            coachTip: 'Controlling the center allows your pieces to traverse from one flank to another effortlessly.'
          }
        ]
      }
    ]
  },
  {
    id: 'openings',
    title: '2. Opening Principles',
    subtitle: 'Build a solid foundation in the first 10 moves',
    description: 'Master center control, piece development, king safety, and avoid dangerous opening traps.',
    iconName: 'Shield',
    lessons: [
      {
        id: 'opening-center-control',
        title: 'Controlling the Center',
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'Why the central squares (e4, d4, e5, d5) dictate piece mobility and space advantage.',
        difficulty: 'Beginner',
        durationMinutes: 6,
        totalSteps: 3,
        completed: false,
        progressPercent: 66,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'Why the Center Matters',
            instruction: 'Examine the white pawn on e4.',
            explanation: 'A pawn placed in the center (e4 or d4) stakes claim to key territory, prevents enemy knights from occupying central outposts, and opens diagonals for your queen and bishops.',
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            turn: 'w',
            coachTip: 'Notice how the e4 pawn controls d5 and f5 while opening the diagonal for White’s light-squared bishop.',
            highlightSquares: ['e4', 'd5', 'f5']
          },
          {
            id: 'step-2',
            stepNumber: 2,
            type: 'interactive_move',
            title: 'Seize the Center',
            instruction: 'Play the classic opening move that occupies the center and frees White’s queen and bishop.',
            explanation: 'Playing 1. e4 immediately controls central space and prepares rapid development.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            expectedMove: {
              from: 'e2',
              to: 'e4',
              san: 'e4'
            },
            coachTip: 'Grab the e2 pawn and push it two squares forward to e4.',
            highlightSquares: ['e2', 'e4']
          },
          {
            id: 'step-3',
            stepNumber: 3,
            type: 'interactive_move',
            title: 'Develop Toward the Center',
            instruction: 'Develop your kingside knight to attack Black’s e5 pawn while controlling d4.',
            explanation: '2. Nf3 develops a minor piece, attacks e5, and prepares kingside castling.',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            turn: 'w',
            expectedMove: {
              from: 'g1',
              to: 'f3',
              san: 'Nf3'
            },
            coachTip: 'Move the knight from g1 to f3 to exert pressure on e5.',
            highlightSquares: ['g1', 'f3', 'e5']
          }
        ]
      },
      {
        id: 'opening-piece-development',
        title: 'Developing Minor Pieces',
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'Knights before bishops, avoiding premature queen moves, and maximizing piece harmony.',
        difficulty: 'Beginner',
        durationMinutes: 8,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'Knights Before Bishops',
            instruction: 'Understand early piece harmony.',
            explanation: 'Knights typically have clear initial squares (f3, c3, f6, c6), while bishops benefit from waiting to see how the opponent develops.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            turn: 'w',
            coachTip: 'Developing minor pieces quickly allows you to castle within the first 5-7 moves.'
          }
        ]
      },
      {
        id: 'opening-king-safety',
        title: 'King Safety & Castling',
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'Why you must castle early and never leave your king in the crosshairs of an open central file.',
        difficulty: 'Beginner',
        durationMinutes: 7,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'interactive_move',
            title: 'Perform Kingside Castling',
            instruction: 'Castle your white king to safety.',
            explanation: 'Castling moves the king two squares toward the corner and swings the rook toward the center.',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
            turn: 'w',
            expectedMove: {
              from: 'e1',
              to: 'g1',
              san: 'O-O'
            },
            coachTip: 'Drag the White King from e1 to g1 to execute kingside castling.',
            highlightSquares: ['e1', 'g1']
          }
        ]
      }
    ]
  },
  {
    id: 'tactics',
    title: '3. Tactical Patterns',
    subtitle: 'Win material with devastating tactical combinations',
    description: 'Master the fundamental building blocks of chess tactics: forks, pins, skewers, and discoveries.',
    iconName: 'Zap',
    lessons: [
      {
        id: 'tactics-knight-fork',
        title: 'The Knight Fork',
        category: 'tactics',
        categoryTitle: 'Tactical Patterns',
        description: 'Using the unique L-shaped jump of the knight to attack two high-value pieces at once.',
        difficulty: 'Beginner',
        durationMinutes: 8,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'interactive_move',
            title: 'Royal Fork on c7',
            instruction: 'Find the knight move that delivers check to the king and attacks the undefended rook on a8 simultaneously.',
            explanation: 'Nxc7+ forks the black king on e8 and the black rook on a8. The king is forced to move, winning the rook next move.',
            fen: 'r3k2r/pppb1ppp/8/3Np3/4P3/8/PPP2PPP/R3KB1R w KQkq - 0 1',
            turn: 'w',
            expectedMove: {
              from: 'd5',
              to: 'c7',
              san: 'Nxc7+'
            },
            coachTip: 'Look at the c7 square — it creates a double attack against e8 and a8!',
            highlightSquares: ['d5', 'c7', 'e8', 'a8']
          }
        ]
      },
      {
        id: 'tactics-absolute-pin',
        title: 'The Absolute Pin',
        category: 'tactics',
        categoryTitle: 'Tactical Patterns',
        description: 'Paralyze enemy pieces by pinning them to their king.',
        difficulty: 'Intermediate',
        durationMinutes: 6,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'Anatomy of an Absolute Pin',
            instruction: 'Observe how the pinned piece is legally forbidden from moving.',
            explanation: 'When a piece is pinned to the king along a rank, file, or diagonal, moving it is illegal because it would expose the king to check.',
            fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
            turn: 'w',
            coachTip: 'White’s bishop on b5 pins Black’s knight on c6 directly to the king on e8.'
          }
        ]
      }
    ]
  },
  {
    id: 'middlegame',
    title: '4. Middlegame Strategy',
    subtitle: 'Formulate purposeful plans when the opening ends',
    description: 'Learn pawn structures, outposts, weak color complexes, and coordinating attacking forces.',
    iconName: 'Target',
    lessons: [
      {
        id: 'middlegame-finding-plan',
        title: 'Formulating a Middlegame Plan',
        category: 'middlegame',
        categoryTitle: 'Middlegame Strategy',
        description: 'How to evaluate weaknesses in the opponent camp and formulate a multi-move plan.',
        difficulty: 'Intermediate',
        durationMinutes: 10,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'Identify Weaknesses & Outposts',
            instruction: 'Notice backward pawns and undefended squares.',
            explanation: 'Look for backward pawns, open files for your rooks, and outposts that cannot be attacked by enemy pawns.',
            fen: 'r1r3k1/pp1b1ppp/2n1p3/3pP3/3P4/P1NB4/1P3PPP/R4RK1 w - - 1 15',
            turn: 'w',
            coachTip: 'A knight parked on an outpost deep in enemy territory is often worth as much as a rook.'
          }
        ]
      }
    ]
  },
  {
    id: 'endgame',
    title: '5. Endgame Fundamentals',
    subtitle: 'Convert advantages and master king & pawn technique',
    description: 'Opposition, the square of the pawn, rook activity, and avoiding stalemate traps.',
    iconName: 'Award',
    lessons: [
      {
        id: 'endgame-king-pawn',
        title: 'King & Pawn: The Opposition',
        category: 'endgame',
        categoryTitle: 'Endgame Fundamentals',
        description: 'Master the concept of the opposition to escort your passed pawn to promotion.',
        difficulty: 'Intermediate',
        durationMinutes: 8,
        totalSteps: 2,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'interactive_move',
            title: 'Take the Direct Opposition',
            instruction: 'Step your king directly opposite the black king with one square between them.',
            explanation: 'Stepping to e5 takes the direct opposition, forcing the black king to yield ground to the left or right.',
            fen: '8/4k3/8/4P3/8/4K3/8/8 w - - 0 1',
            turn: 'w',
            expectedMove: {
              from: 'e3',
              to: 'e4',
              san: 'Ke4'
            },
            coachTip: 'Move the King from e3 to e4 to seize control of the key forward squares.',
            highlightSquares: ['e3', 'e4', 'e7']
          }
        ]
      }
    ]
  },
  {
    id: 'advanced',
    title: '6. Advanced Chess Mastery',
    subtitle: 'Prophylaxis, positional sacrifices, and deep calculation',
    description: 'Think like a master: stopping opponent plans before they happen and dynamic calculation.',
    iconName: 'Compass',
    lessons: [
      {
        id: 'adv-prophylaxis',
        title: 'Prophylaxis: Stopping Opponent Plans',
        category: 'advanced',
        categoryTitle: 'Advanced Chess',
        description: 'The art of asking: "What does my opponent want to play next?" before making your move.',
        difficulty: 'Advanced',
        durationMinutes: 12,
        totalSteps: 1,
        completed: false,
        progressPercent: 0,
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            type: 'concept',
            title: 'The Prophylactic Mindset',
            instruction: 'Learn how Grandmasters anticipate threats.',
            explanation: 'Before executing your own attacking idea, verify if your opponent is threatening a check, fork, or piece capture.',
            fen: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 4 8',
            turn: 'w',
            coachTip: 'Prophylaxis is not passive defense — it preserves your initiative by denying your opponent counterplay.'
          }
        ]
      }
    ]
  }
];
