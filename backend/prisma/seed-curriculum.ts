import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SeedStep {
  stepNumber: number;
  type: 'concept' | 'interactive_move' | 'question' | 'assessment';
  title: string;
  instruction: string;
  explanation: string;
  fen: string;
  turn?: string;
  expectedMove?: {
    from: string;
    to: string;
    san: string;
  };
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  coachTip?: string;
  highlightSquares?: string[];
  arrowFromTo?: [string, string];
}

export interface SeedLesson {
  id: string;
  title: string;
  category: string;
  categoryTitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  orderIndex: number;
  themeTag?: string;
  steps: SeedStep[];
}

export interface SeedModule {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  iconName: string;
  orderIndex: number;
  lessons: SeedLesson[];
}

export const CURRICULUM_DATA: SeedModule[] = [
  {
    id: 'basics',
    title: '1. Chess Basics',
    subtitle: 'The foundational rules and board vision',
    description: 'Learn how every piece moves, board geometry, value of pieces, and essential rules.',
    iconName: 'BookOpen',
    orderIndex: 1,
    lessons: [
      {
        id: 'basics-board-vision',
        title: 'Board Geometry & Coordinates',
        category: 'basics',
        categoryTitle: 'Chess Basics',
        description: 'Understand ranks, files, diagonals, and algebraic square notation.',
        difficulty: 'Beginner',
        durationMinutes: 5,
        orderIndex: 1,
        themeTag: 'board_vision',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'Ranks and Files',
            instruction: 'Read the concept and examine the board.',
            explanation: 'The chessboard consists of 64 squares arranged in 8 horizontal ranks (numbered 1 to 8) and 8 vertical files (lettered a to h).',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            coachTip: 'Every square has a unique coordinate name, like e4 or c7.',
            highlightSquares: ['e4', 'd4', 'e5', 'd5']
          },
          {
            stepNumber: 2,
            type: 'question',
            title: 'Identify Central Squares',
            instruction: 'Which four squares make up the absolute center of the chessboard?',
            explanation: 'The four central squares are e4, d4, e5, and d5.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            options: [
              { id: 'opt-1', text: 'a1, a8, h1, h8', isCorrect: false, feedback: 'Those are the four corner squares.' },
              { id: 'opt-2', text: 'e4, d4, e5, d5', isCorrect: true, feedback: 'Correct! Dominating these 4 squares controls the board flow.' },
              { id: 'opt-3', text: 'c3, f3, c6, f6', isCorrect: false, feedback: 'Those are natural knight development squares, not the central squares.' }
            ],
            coachTip: 'Controlling the center allows your pieces to traverse from one flank to another effortlessly.'
          }
        ]
      },
      {
        id: 'basics-piece-moves',
        title: 'Piece Values & Mobility',
        category: 'basics',
        categoryTitle: 'Chess Basics',
        description: 'Understand the relative strength of pawns, knights, bishops, rooks, and queens.',
        difficulty: 'Beginner',
        durationMinutes: 8,
        orderIndex: 2,
        themeTag: 'piece_activity',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'Relative Piece Values',
            instruction: 'Understand point valuations.',
            explanation: 'Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9. The King is invaluable.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            coachTip: 'Knowing piece values helps you determine whether a tactical trade is favorable.'
          },
          {
            stepNumber: 2,
            type: 'question',
            title: 'Evaluating Material Exchanges',
            instruction: 'If you trade your Rook (5 points) for an opponent’s Bishop and Pawn (3 + 1 = 4 points), is it generally advantageous?',
            explanation: 'Giving up 5 points to receive 4 points is losing the exchange (a net -1 point disadvantage).',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
            options: [
              { id: 'opt-1', text: 'Yes, because you gained two pieces for one', isCorrect: false, feedback: 'A rook is worth 5 points, whereas a bishop and pawn total only 4 points.' },
              { id: 'opt-2', text: 'No, because a Rook is worth 5 points and the return is only 4 points', isCorrect: true, feedback: 'Spot on! This is known as "losing the exchange."' },
              { id: 'opt-3', text: 'It depends solely on who is White', isCorrect: false, feedback: 'Piece valuations are symmetric for both players.' }
            ],
            coachTip: 'Protect your major pieces (Rooks and Queen) from unnecessary sacrifices.'
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
    orderIndex: 2,
    lessons: [
      {
        id: 'opening-center-control',
        title: 'Controlling the Center',
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'Why the central squares (e4, d4, e5, d5) dictate piece mobility and space advantage.',
        difficulty: 'Beginner',
        durationMinutes: 6,
        orderIndex: 1,
        themeTag: 'center_control',
        steps: [
          {
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
        orderIndex: 2,
        themeTag: 'development',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'Knights Before Bishops',
            instruction: 'Understand early piece harmony.',
            explanation: 'Knights typically have clear initial squares (f3, c3, f6, c6), while bishops benefit from waiting to see how the opponent develops.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            turn: 'w',
            coachTip: 'Developing minor pieces quickly allows you to castle within the first 5-7 moves.'
          },
          {
            stepNumber: 2,
            type: 'interactive_move',
            title: 'Active Bishop Placement',
            instruction: 'Develop your bishop to an active square attacking Black’s f7 weakness or pinning the c6 knight.',
            explanation: '3. Bc4 targets the vulnerable f7 pawn in classic Italian Game style.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            turn: 'w',
            expectedMove: {
              from: 'f1',
              to: 'c4',
              san: 'Bc4'
            },
            coachTip: 'Bring the bishop from f1 to c4 aiming straight at f7.',
            highlightSquares: ['f1', 'c4', 'f7']
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
        orderIndex: 3,
        themeTag: 'king_safety',
        steps: [
          {
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
          },
          {
            stepNumber: 2,
            type: 'question',
            title: 'When to Castle',
            instruction: 'What is the optimal timing for castling in most open games?',
            explanation: 'Castling within the first 5-8 moves tucks your king into safety before the center files open up.',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
            turn: 'w',
            options: [
              { id: 'opt-1', text: 'Wait until move 20 to see which side is safer', isCorrect: false, feedback: 'Waiting too long leaves your king vulnerable to sudden central breakthroughs.' },
              { id: 'opt-2', text: 'Castle early (within moves 5–8) once minor pieces are developed', isCorrect: true, feedback: 'Correct! King safety is a top priority in opening strategy.' },
              { id: 'opt-3', text: 'Only castle if you are checked', isCorrect: false, feedback: 'You cannot castle while in check!' }
            ],
            coachTip: 'Never delay castling without a concrete positional reason.'
          }
        ]
      },
      {
        id: 'opening-traps-scholar',
        title: "Avoiding Early Queen Traps (Scholar's Mate)",
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'How to punish early queen raids, guard the f7 square, and develop with tempo.',
        difficulty: 'Beginner',
        durationMinutes: 7,
        orderIndex: 4,
        themeTag: 'opening_trap',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'The Wayward Queen Attack',
            instruction: 'Notice White’s premature queen raid eyeing e5 and f7.',
            explanation: 'After 1. e4 e5 2. Qh5 Nc6 3. Bc4, White creates a direct Scholar’s Mate threat against the weak f7 pawn. Early queen incursions violate opening principles, but Black must defend accurately.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            turn: 'b',
            coachTip: 'White is betting Black will panic or miss the mate threat on f7.',
            highlightSquares: ['h5', 'c4', 'f7']
          },
          {
            stepNumber: 2,
            type: 'interactive_move',
            title: 'Block the Mate with Tempo',
            instruction: 'Block White’s queen from attacking f7 with a pawn push that forces the queen to retreat.',
            explanation: '3... g6! closes the diagonal to f7 and attacks the queen. Notice why 3... Nf6?? is fatal: 4. Qxf7# would be checkmate! 3... g6 is the premier instructive defense.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            turn: 'b',
            expectedMove: {
              from: 'g7',
              to: 'g6',
              san: 'g6'
            },
            coachTip: 'Push the g7 pawn to g6 to shield f7 and gain a tempo against the queen.',
            highlightSquares: ['g7', 'g6', 'h5']
          },
          {
            stepNumber: 3,
            type: 'interactive_move',
            title: 'Defend the Second Mate Threat',
            instruction: 'White plays 4. Qf3 renewing the mate threat on f7. Develop your kingside knight to block the threat naturally.',
            explanation: '4... Nf6! develops a minor piece toward the center, blocks the queen’s path to f7, and prepares kingside castling. White has wasted two queen moves with nothing to show.',
            fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4',
            turn: 'b',
            expectedMove: {
              from: 'g8',
              to: 'f6',
              san: 'Nf6'
            },
            coachTip: 'Leap the knight from g8 to f6 to block the queen while developing a key piece.',
            highlightSquares: ['g8', 'f6', 'f3', 'f7']
          },
          {
            stepNumber: 4,
            type: 'question',
            title: 'The Lesson of Premature Queen Attacks',
            instruction: 'Why do master players avoid bringing out the queen on move 2 in 1. e4 e5 openings?',
            explanation: 'A premature queen is easily harassed by enemy pawns and minor pieces. Black develops naturally while White is forced to spend valuable moves retreating the queen.',
            fen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5',
            turn: 'b',
            options: [
              { id: 'opt-1', text: 'Because queens are illegal to move before move 5', isCorrect: false, feedback: 'Queens can legally move on any turn.' },
              { id: 'opt-2', text: 'Black gains development tempos by harassing the exposed queen with developing moves', isCorrect: true, feedback: 'Correct! Never bring the queen out early unless there is an inescapable concrete win.' },
              { id: 'opt-3', text: 'Because White loses castling rights immediately', isCorrect: false, feedback: 'Moving the queen does not lose castling rights, but it loses valuable time.' }
            ],
            coachTip: 'Develop minor pieces first; let the queen support from behind.'
          }
        ]
      },
      {
        id: 'opening-traps-fried-liver',
        title: 'Defending the Knight Attack (Two Knights & Fried Liver)',
        category: 'openings',
        categoryTitle: 'Opening Principles',
        description: 'How to counter White’s aggressive 4. Ng5 in the Italian Game and avoid the dreaded Fried Liver Attack.',
        difficulty: 'Intermediate',
        durationMinutes: 9,
        orderIndex: 5,
        themeTag: 'opening_trap',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'The Dual Assault on f7',
            instruction: 'Examine White’s 4. Ng5 targeting f7 in the Two Knights Defense.',
            explanation: 'After 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5, White gangs up on f7 with both knight and bishop. Because Black cannot castle immediately, a passive response leads to disaster.',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
            turn: 'b',
            coachTip: 'White threatens Nxf7, forking queen and rook. Black needs an energetic counter-strike.',
            highlightSquares: ['g5', 'c4', 'f7']
          },
          {
            stepNumber: 2,
            type: 'interactive_move',
            title: 'The Central Break',
            instruction: 'Strike in the center with a pawn sacrifice to sever the c4 bishop’s line of sight to f7.',
            explanation: '4... d5! is the indispensable counter. It closes the diagonal of the c4 bishop and challenges White’s central presence.',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
            turn: 'b',
            expectedMove: {
              from: 'd7',
              to: 'd5',
              san: 'd5'
            },
            coachTip: 'Push d7 to d5 to shield f7 and strike at White’s center.',
            highlightSquares: ['d7', 'd5', 'c4']
          },
          {
            stepNumber: 3,
            type: 'interactive_move',
            title: 'Avoid the Trap: 5... Na5!',
            instruction: 'After 5. exd5, do NOT play 5... Nxd5 (which walks into 6. Nxf7! Fried Liver Attack). Instead, counterattack White’s c4 bishop with your knight.',
            explanation: '5... Na5! is the mainline master move. It attacks the unprotected c4 bishop and forces White onto the defensive. Taking 5... Nxd5? allows 6. Nxf7! Kxf7 7. Qf3+ Ke6, pulling Black’s king into a lethal pin.',
            fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
            turn: 'b',
            expectedMove: {
              from: 'c6',
              to: 'a5',
              san: 'Na5'
            },
            coachTip: 'Hop your knight from c6 to a5 to challenge White’s key attacking bishop.',
            highlightSquares: ['c6', 'a5', 'c4']
          },
          {
            stepNumber: 4,
            type: 'question',
            title: 'Understanding the Sacrifice',
            instruction: 'What compensation does Black get for the sacrificed pawn in 4... d5 and 5... Na5?',
            explanation: 'Black gains immense piece activity, drives White’s bishop back, controls the center, and leaves White’s g5 knight awkwardly stranded.',
            fen: 'r1bqkb1r/ppp2ppp/5n2/n2Pp1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 1 6',
            turn: 'b',
            options: [
              { id: 'opt-1', text: 'Black wins a queen immediately', isCorrect: false, feedback: 'No queen is won; White’s pieces are simply driven back.' },
              { id: 'opt-2', text: 'Dynamic piece activity, tempo on White’s bishop, and rapid counter-development', isCorrect: true, feedback: 'Correct! In open games, initiative and piece activity easily outweigh an isolated pawn.' },
              { id: 'opt-3', text: 'White is forced into checkmate on move 7', isCorrect: false, feedback: 'There is no forced mate, but Black has the superior dynamic game.' }
            ],
            coachTip: 'Pawn sacrifices for rapid activity are the hallmark of strong dynamic defense.'
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
    orderIndex: 3,
    lessons: [
      {
        id: 'tactics-knight-fork',
        title: 'The Knight Fork',
        category: 'tactics',
        categoryTitle: 'Tactical Patterns',
        description: 'Using the unique L-shaped jump of the knight to attack two high-value pieces at once.',
        difficulty: 'Beginner',
        durationMinutes: 8,
        orderIndex: 1,
        themeTag: 'fork',
        steps: [
          {
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
          },
          {
            stepNumber: 2,
            type: 'interactive_move',
            title: 'Central Fork on e5',
            instruction: 'Black’s Queen and Rook are aligned. Jump your knight to fork both pieces!',
            explanation: 'Ne5 attacks both the Queen on d7 and the Rook on c6.',
            fen: '2r3k1/pp1q1ppp/2r5/8/4N3/8/PPP2PPP/R3KB1R w - - 0 1',
            turn: 'w',
            expectedMove: {
              from: 'e4',
              to: 'c5',
              san: 'Nc5'
            },
            coachTip: 'Notice the c5 square puts both the d7 Queen and c6 Rook under fire.',
            highlightSquares: ['e4', 'c5', 'd7', 'c6']
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
        orderIndex: 2,
        themeTag: 'pin',
        steps: [
          {
            stepNumber: 1,
            type: 'concept',
            title: 'Anatomy of an Absolute Pin',
            instruction: 'Observe how the pinned piece is legally forbidden from moving.',
            explanation: 'When a piece is pinned to the king along a rank, file, or diagonal, moving it is illegal because it would expose the king to check.',
            fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
            turn: 'w',
            coachTip: 'White’s bishop on b5 pins Black’s knight on c6 directly to the king on e8.'
          },
          {
            stepNumber: 2,
            type: 'interactive_move',
            title: 'Exploit the Pinned Piece',
            instruction: 'The Black knight on c6 is pinned to the King. Attack the pinned piece with your pawn to win material!',
            explanation: 'Advancing d4 or attacking the pinned knight increases pressure that Black cannot relieve.',
            fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
            turn: 'w',
            expectedMove: {
              from: 'd4',
              to: 'd5',
              san: 'd5'
            },
            coachTip: 'Push the d4 pawn to d5 to hit the immobilized knight on c6.',
            highlightSquares: ['d4', 'd5', 'c6']
          }
        ]
      }
    ]
  },
  {
    id: 'endgame',
    title: '4. Essential Endgames',
    subtitle: 'Convert advantages and master king & pawn technique',
    description: 'Opposition, the square of the pawn, rook checkmates, and avoiding stalemate traps.',
    iconName: 'Trophy',
    orderIndex: 4,
    lessons: [
      {
        id: 'endgame-king-pawn',
        title: 'King & Pawn: The Opposition',
        category: 'endgame',
        categoryTitle: 'Essential Endgames',
        description: 'Master the concept of the opposition to escort your passed pawn to promotion.',
        difficulty: 'Intermediate',
        durationMinutes: 8,
        orderIndex: 1,
        themeTag: 'endgame_opposition',
        steps: [
          {
            stepNumber: 1,
            type: 'interactive_move',
            title: 'Take the Direct Opposition',
            instruction: 'Step your king directly opposite the black king with one square between them.',
            explanation: 'Stepping to e4 takes the direct opposition, forcing the black king to yield ground to the left or right.',
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
      },
      {
        id: 'endgame-back-rank',
        title: 'Back Rank Checkmate',
        category: 'endgame',
        categoryTitle: 'Essential Endgames',
        description: 'Deliver checkmate when the enemy king is trapped by its own pawn shield.',
        difficulty: 'Beginner',
        durationMinutes: 6,
        orderIndex: 2,
        themeTag: 'back_rank_mate',
        steps: [
          {
            stepNumber: 1,
            type: 'interactive_move',
            title: 'Deliver Back-Rank Mate',
            instruction: 'Black’s King is trapped behind pawns on f7, g7, and h7. Deliver checkmate on the 8th rank with your Rook!',
            explanation: 'Re8# is checkmate because the King cannot escape onto the 7th rank.',
            fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
            turn: 'w',
            expectedMove: {
              from: 'e1',
              to: 'e8',
              san: 'Rxe8#'
            },
            coachTip: 'Capture the e8 rook with Rxe8# to deliver checkmate.',
            highlightSquares: ['e1', 'e8', 'g8']
          }
        ]
      }
    ]
  }
];

export async function seedCurriculum(): Promise<void> {
  console.log('[SeedCurriculum] Seeding curriculum modules, lessons, and steps...');

  for (const mod of CURRICULUM_DATA) {
    await prisma.curriculumModule.upsert({
      where: { id: mod.id },
      update: {
        title: mod.title,
        subtitle: mod.subtitle,
        description: mod.description,
        iconName: mod.iconName,
        orderIndex: mod.orderIndex,
        isActive: true
      },
      create: {
        id: mod.id,
        title: mod.title,
        subtitle: mod.subtitle,
        description: mod.description,
        iconName: mod.iconName,
        orderIndex: mod.orderIndex,
        isActive: true
      }
    });

    for (const lesson of mod.lessons) {
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          moduleId: mod.id,
          title: lesson.title,
          category: lesson.category,
          categoryTitle: lesson.categoryTitle,
          description: lesson.description,
          difficulty: lesson.difficulty,
          durationMinutes: lesson.durationMinutes,
          orderIndex: lesson.orderIndex,
          themeTag: lesson.themeTag,
          isActive: true
        },
        create: {
          id: lesson.id,
          moduleId: mod.id,
          title: lesson.title,
          category: lesson.category,
          categoryTitle: lesson.categoryTitle,
          description: lesson.description,
          difficulty: lesson.difficulty,
          durationMinutes: lesson.durationMinutes,
          orderIndex: lesson.orderIndex,
          themeTag: lesson.themeTag,
          isActive: true
        }
      });

      for (const step of lesson.steps) {
        const stepData = {
          lessonId: lesson.id,
          stepNumber: step.stepNumber,
          type: step.type,
          title: step.title,
          instruction: step.instruction,
          explanation: step.explanation,
          fen: step.fen,
          turn: step.turn || 'w',
          expectedMoveSan: step.expectedMove?.san,
          expectedMoveFrom: step.expectedMove?.from,
          expectedMoveTo: step.expectedMove?.to,
          options: step.options ? JSON.parse(JSON.stringify(step.options)) : undefined,
          coachTip: step.coachTip,
          highlightSquares: step.highlightSquares ? JSON.parse(JSON.stringify(step.highlightSquares)) : undefined,
          arrowFromTo: step.arrowFromTo ? JSON.parse(JSON.stringify(step.arrowFromTo)) : undefined
        };

        await prisma.lessonStep.upsert({
          where: {
            lessonId_stepNumber: {
              lessonId: lesson.id,
              stepNumber: step.stepNumber
            }
          },
          update: stepData,
          create: stepData
        });
      }
    }
  }

  const moduleCount = await prisma.curriculumModule.count();
  const lessonCount = await prisma.lesson.count();
  const stepCount = await prisma.lessonStep.count();

  console.log(`[SeedCurriculum] Successfully seeded: ${moduleCount} modules, ${lessonCount} lessons, ${stepCount} steps.`);
}

if (process.argv[1]?.endsWith('seed-curriculum.ts')) {
  seedCurriculum()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[SeedCurriculum] Error seeding curriculum:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
