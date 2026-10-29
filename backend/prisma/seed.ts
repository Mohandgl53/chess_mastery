import { PrismaClient, OpponentType, PlayerColor, GameStatus, GameResult, MoveClassification } from '@prisma/client';
import { Chess } from 'chess.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { seedCurriculum } from './seed-curriculum.js';
import { seedPuzzles } from './seed-puzzles.js';

dotenv.config();

const prisma = new PrismaClient();

interface MoveSeedDef {
  san: string;
  cls: MoveClassification;
  eval: number;
  exp: string;
}

function replayAndGenerateMoves(movesData: MoveSeedDef[]) {
  const chess = new Chess();
  const moves = [];

  for (let i = 0; i < movesData.length; i++) {
    const item = movesData[i];
    const m = chess.move(item.san);
    if (!m) {
      throw new Error(`Illegal seed move: ${item.san} at ply ${i + 1}`);
    }

    moves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      uci: `${m.from}${m.to}${m.promotion || ''}`,
      fen: chess.fen(),
      evaluation: item.eval,
      isMate: chess.isCheckmate(),
      mateIn: chess.isCheckmate() ? 0 : undefined,
      classification: item.cls,
      explanation: item.exp
    });
  }

  return {
    moves,
    finalFen: chess.fen(),
    pgn: chess.pgn()
  };
}

const italianMoves: MoveSeedDef[] = [
  { san: 'e4', cls: 'BEST', eval: 0.2, exp: 'Classical opening claiming the central e4 square and opening lines for the queen and bishop.' },
  { san: 'e5', cls: 'BEST', eval: 0.2, exp: 'Symmetric central response fighting for control of d4.' },
  { san: 'Nf3', cls: 'BEST', eval: 0.3, exp: 'Develops kingside knight, attacks e5, and prepares castling.' },
  { san: 'Nc6', cls: 'BEST', eval: 0.3, exp: 'Natural development defending the attacked e5 pawn.' },
  { san: 'Bc4', cls: 'BEST', eval: 0.4, exp: 'Italian Game setup targeting Black’s vulnerable f7 square.' },
  { san: 'Bc5', cls: 'BEST', eval: 0.3, exp: 'Active bishop development into the Giuoco Piano.' },
  { san: 'c3', cls: 'BEST', eval: 0.4, exp: 'Prepares the aggressive central thrust d4 to claim full pawn center.' },
  { san: 'Nf6', cls: 'BEST', eval: 0.3, exp: 'Counterattacks White’s e4 pawn and prepares kingside castling.' },
  { san: 'd4', cls: 'BEST', eval: 0.5, exp: 'Classical Greco central strike questioning Black’s bishop.' },
  { san: 'exd4', cls: 'GOOD', eval: 0.4, exp: 'Forced capture to avoid losing piece coordination.' },
  { san: 'cxd4', cls: 'BEST', eval: 0.5, exp: 'Recaptures toward the center, forming a formidable pawn duo.' },
  { san: 'Bb4+', cls: 'GOOD', eval: 0.3, exp: 'Active counter-check preventing White from rolling pawns immediately.' },
  { san: 'Nc3', cls: 'BEST', eval: 0.4, exp: 'Pins knight to defend king and continues rapid piece deployment.' },
  { san: 'Nxe4', cls: 'INACCURACY', eval: 0.9, exp: 'Greedy capture into White’s tactical center trap.' },
  { san: 'O-O', cls: 'BEST', eval: 1.2, exp: 'Pins the knight on the e-file and completes king safety.' },
  { san: 'Bxc3', cls: 'GOOD', eval: 1.1, exp: 'Exchanges piece to remove defender of e4.' },
  { san: 'd5', cls: 'BEST', eval: 2.1, exp: 'Aggressive pawn clearance attacking Black’s defensive knight!' },
  { san: 'Bf6', cls: 'INACCURACY', eval: 2.6, exp: 'Retreats bishop but leaves kingside coordination compromised.' },
  { san: 'Re1', cls: 'BEST', eval: 3.2, exp: 'Dominates the open e-file, pinning the e4 knight directly to Black’s king.' },
  { san: 'Ne7', cls: 'GOOD', eval: 3.3, exp: 'Attempting to unpin and redeploy knight to g6.' },
  { san: 'Rxe4', cls: 'BEST', eval: 3.8, exp: 'Regains material with massive spatial and tactical superiority.' },
  { san: 'd6', cls: 'GOOD', eval: 3.9, exp: 'Blunts White’s d5 pawn and opens diagonal for light-squared bishop.' },
  { san: 'Bg5', cls: 'BEST', eval: 4.4, exp: 'Pins and pressures the critical f6 defender.' },
  { san: 'Bxg5', cls: 'INACCURACY', eval: 5.1, exp: 'Trading defenders opens decisive attacking lines toward the black king.' },
  { san: 'Nxg5', cls: 'BEST', eval: 5.4, exp: 'Knight leaps to an aggressive outpost threatening both f7 and h7.' },
  { san: 'O-O', cls: 'GOOD', eval: 5.8, exp: 'Finally castles, but White’s attack is already crashing through.' },
  { san: 'Nxh7', cls: 'EXCELLENT', eval: 7.2, exp: 'Devastating Greek Gift piece sacrifice dismantling Black’s pawn shield!' },
  { san: 'Kxh7', cls: 'GOOD', eval: 7.1, exp: 'Accepts the sacrifice to prevent immediate ruin.' },
  { san: 'Qh5+', cls: 'BEST', eval: 8.5, exp: 'Decisive queen check forcing the king backward.' },
  { san: 'Kg8', cls: 'BEST', eval: 8.6, exp: 'Sole retreat square for the king.' },
  { san: 'Rh4', cls: 'BEST', eval: 9.9, exp: 'Rook joins the attack with an unstoppable mate threat on h7 and h8.' },
  { san: 'f5', cls: 'GOOD', eval: 9.8, exp: 'Desperation pawn push attempting to create an escape square for the king.' },
  { san: 'Re1', cls: 'BEST', eval: 12.0, exp: 'Brings final reserves into the attack, cutting off all retreat paths.' },
  { san: 'Bd7', cls: 'GOOD', eval: 12.5, exp: 'Connecting rooks, but White’s attack cannot be halted.' },
  { san: 'Re6', cls: 'BEST', eval: 15.0, exp: 'Brilliant interference sacrifice! Blocks the e-file and seals Black’s doom.' },
  { san: 'Bxe6', cls: 'GOOD', eval: 18.0, exp: 'Forced capture to eliminate the menacing rook.' },
  { san: 'dxe6', cls: 'BEST', eval: 25.0, exp: 'Pawn recaptures, denying the black king any escape via f7.' },
  { san: 'Rf6', cls: 'GOOD', eval: 50.0, exp: 'Desperate sacrifice to delay checkmate.' },
  { san: 'Qh8#', cls: 'BEST', eval: 99.0, exp: 'Checkmate! The queen delivers the final blow with full rook and bishop coordination.' }
];

const operaMoves: MoveSeedDef[] = [
  { san: 'e4', cls: 'BEST', eval: 0.2, exp: 'King pawn opening opening routes for bishop and queen.' },
  { san: 'e5', cls: 'BEST', eval: 0.2, exp: 'Open game classical reply.' },
  { san: 'Nf3', cls: 'BEST', eval: 0.3, exp: 'Develops knight and attacks e5.' },
  { san: 'd6', cls: 'GOOD', eval: 0.2, exp: 'Philidor Defense, solid but slightly passive for Black’s dark-squared bishop.' },
  { san: 'd4', cls: 'BEST', eval: 0.5, exp: 'Morphy immediately strikes in the center to exploit Black’s passive setup.' },
  { san: 'Bg4', cls: 'INACCURACY', eval: 0.9, exp: 'Premature pin before developing kingside pieces.' },
  { san: 'dxe5', cls: 'BEST', eval: 1.0, exp: 'Morphy opens the center to rapidly accelerate piece development.' },
  { san: 'Bxf3', cls: 'GOOD', eval: 0.9, exp: 'Conceding the bishop pair to maintain material balance.' },
  { san: 'Qxf3', cls: 'BEST', eval: 1.1, exp: 'Queen develops with tempo eyeing both d1 and f7.' },
  { san: 'dxe5', cls: 'BEST', eval: 1.1, exp: 'Recaptures central pawn.' },
  { san: 'Bc4', cls: 'BEST', eval: 1.5, exp: 'Direct checkmate threat on f7 (Scholar’s threat motif).' },
  { san: 'Nf6', cls: 'BEST', eval: 1.4, exp: 'Blocks the checkmate threat with kingside knight development.' },
  { san: 'Qb3', cls: 'BEST', eval: 2.2, exp: 'Dual threat attacking both f7 and b7 simultaneously!' },
  { san: 'Qe7', cls: 'GOOD', eval: 2.1, exp: 'Guards f7, but clutters Black’s development and blocks the f8 bishop.' },
  { san: 'Nc3', cls: 'BEST', eval: 2.4, exp: 'Morphy ignores the poisoned b7 pawn to prioritize overwhelming development!' },
  { san: 'c6', cls: 'GOOD', eval: 2.3, exp: 'Guards b7 and controls central squares.' },
  { san: 'Bg5', cls: 'BEST', eval: 3.1, exp: 'Pins the critical knight that defends Black’s position.' },
  { san: 'b5', cls: 'MISTAKE', eval: 4.8, exp: 'Weakens queenside pawns without resolving the uncastled king.' },
  { san: 'Nxb5', cls: 'EXCELLENT', eval: 5.5, exp: 'Knight sacrifice blows open the a4-e8 diagonal directly at Black’s king!' },
  { san: 'cxb5', cls: 'GOOD', eval: 5.4, exp: 'Accepts the sacrifice.' },
  { san: 'Bxb5+', cls: 'BEST', eval: 6.2, exp: 'Bishop check with decisive tempo!' },
  { san: 'Nbd7', cls: 'BEST', eval: 6.2, exp: 'Forced block under heavy pin.' },
  { san: 'O-O-O', cls: 'BEST', eval: 7.5, exp: 'Queenside castling activates the d1 rook with full vertical pressure on d7!' },
  { san: 'Rd8', cls: 'GOOD', eval: 7.6, exp: 'Defending the pinned knight with the rook.' },
  { san: 'Rxd7', cls: 'BEST', eval: 9.8, exp: 'Rook exchange sacrifice demolishing Black’s defensive foundation!' },
  { san: 'Rxd7', cls: 'GOOD', eval: 9.7, exp: 'Recaptures on d7.' },
  { san: 'Rd1', cls: 'BEST', eval: 11.2, exp: 'Brings the final rook into play. The pin on d7 is completely paralyzing.' },
  { san: 'Qe6', cls: 'GOOD', eval: 11.5, exp: 'Attempting to trade queens and escape the vice grip.' },
  { san: 'Bxd7+', cls: 'BEST', eval: 14.0, exp: 'Liquidating defenders with check.' },
  { san: 'Nxd7', cls: 'BEST', eval: 14.1, exp: 'Recaptures knight.' },
  { san: 'Qb8+', cls: 'BEST', eval: 99.0, exp: 'Legendary queen sacrifice! Deflects Black’s knight from guarding the d8 square.' },
  { san: 'Nxb8', cls: 'BEST', eval: 99.0, exp: 'Forced recapture.' },
  { san: 'Rd8#', cls: 'BEST', eval: 99.0, exp: 'Back-rank checkmate! Morphy finishes with every piece contributing to total dominance.' }
];

const inProgressMoves: MoveSeedDef[] = [
  { san: 'e4', cls: 'BEST', eval: 0.2, exp: 'King pawn forward controlling the center.' },
  { san: 'c5', cls: 'BEST', eval: 0.2, exp: 'Sicilian Defense challenging d4.' },
  { san: 'Nf3', cls: 'BEST', eval: 0.3, exp: 'Open Sicilian preparation.' },
  { san: 'd6', cls: 'BEST', eval: 0.3, exp: 'Solid pawn setup.' },
  { san: 'd4', cls: 'BEST', eval: 0.4, exp: 'Central break to open files.' },
  { san: 'cxd4', cls: 'BEST', eval: 0.3, exp: 'Exchanging flank pawn for central pawn.' }
];

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeedDevUser = !isProduction || process.env.SEED_DEV_USER === 'true';

  if (shouldSeedDevUser) {
    console.log('Seeding development user and demo games...');
    // 1. Dev User & Profile
    const devUserId = 'dev-user-123';

  /**
   * Phase 3B: If DEV_SEED_PASSWORD is set in the environment, hash it with bcryptjs
   * and update the dev user's passwordHash so you can log in as dev-user-123 locally.
   *
   * If DEV_SEED_PASSWORD is not set, the user is preserved as-is without
   * introducing a hardcoded plaintext password.
   *
   * To set a seed password:
   *   1. Add DEV_SEED_PASSWORD=yourpassword to backend/.env
   *   2. Run: npm run prisma:seed
   *   3. Log in at http://localhost:5173/login with dev@chesscoach.local
   */
  const devSeedPassword = process.env.DEV_SEED_PASSWORD;
  const devPasswordHash = devSeedPassword
    ? await bcrypt.hash(devSeedPassword, 12)
    : undefined;

  await prisma.user.upsert({
    where: { id: devUserId },
    update: {
      email: 'dev@chesscoach.local',
      displayName: 'Mohan',
      // Only update passwordHash if DEV_SEED_PASSWORD was provided
      ...(devPasswordHash ? { passwordHash: devPasswordHash } : {})
    },
    create: {
      id: devUserId,
      email: 'dev@chesscoach.local',
      // If no password is set during seeding, use a non-authenticatable placeholder.
      // Set DEV_SEED_PASSWORD to enable local login.
      passwordHash: devPasswordHash ?? 'not-a-real-hash-set-DEV_SEED_PASSWORD-to-login',
      displayName: 'Mohan'
    }
  });

  await prisma.playerProfile.upsert({
    where: { userId: devUserId },
    update: {
      rating: 800,
      gamesPlayed: 12,
      gamesWon: 8,
      gamesDrawn: 1,
      gamesLost: 3,
      currentStreak: 5,
      longestStreak: 7
    },
    create: {
      userId: devUserId,
      rating: 800,
      gamesPlayed: 12,
      gamesWon: 8,
      gamesDrawn: 1,
      gamesLost: 3,
      currentStreak: 5,
      longestStreak: 7
    }
  });

  // 2. Completed Game 1: Italian Game (39 plies)
  const game1Id = 'seed-game-italian-victory';
  const game1Replay = replayAndGenerateMoves(italianMoves);

  await prisma.game.upsert({
    where: { id: game1Id },
    update: {
      userId: devUserId,
      opponentName: 'Chess Coach (Intermediate)',
      opponentType: OpponentType.AI,
      playerColor: PlayerColor.WHITE,
      result: GameResult.WIN,
      status: GameStatus.COMPLETED,
      openingName: 'Italian Game: Giuoco Piano, Greco Attack',
      openingEco: 'C53',
      finalFen: game1Replay.finalFen,
      pgn: game1Replay.pgn
    },
    create: {
      id: game1Id,
      userId: devUserId,
      opponentName: 'Chess Coach (Intermediate)',
      opponentType: OpponentType.AI,
      playerColor: PlayerColor.WHITE,
      result: GameResult.WIN,
      status: GameStatus.COMPLETED,
      openingName: 'Italian Game: Giuoco Piano, Greco Attack',
      openingEco: 'C53',
      finalFen: game1Replay.finalFen,
      pgn: game1Replay.pgn
    }
  });

  // Clear existing moves for this game to ensure idempotency
  await prisma.gameMove.deleteMany({ where: { gameId: game1Id } });
  await prisma.gameMove.createMany({
    data: game1Replay.moves.map((m) => ({
      ...m,
      gameId: game1Id
    }))
  });

  await prisma.gameAnalysis.upsert({
    where: { gameId: game1Id },
    update: {
      engineName: 'Stockfish',
      engineVersion: 'Stockfish 19 Lite WASM',
      accuracyWhite: 89.0,
      accuracyBlack: 68.0,
      summary: 'Greek Gift sacrifice led to an unstoppable mating attack on move 20.',
      details: {
        keyLesson: 'Aggressive central pawn dominance and timely piece sacrifices will break through uncastled kings.',
        phaseReviews: {
          opening: { title: 'Opening Mastery', positivePoints: ['Established dominant central pawn duo'], negativePoints: [] },
          middlegame: { title: 'Middlegame Execution', positivePoints: ['Decisive Greek Gift sacrifice on h7'], negativePoints: [] },
          endgame: { title: 'Tactical Finish', positivePoints: ['Flawless mating net execution with Qh8#'], negativePoints: [] }
        }
      }
    },
    create: {
      gameId: game1Id,
      engineName: 'Stockfish',
      engineVersion: 'Stockfish 19 Lite WASM',
      accuracyWhite: 89.0,
      accuracyBlack: 68.0,
      summary: 'Greek Gift sacrifice led to an unstoppable mating attack on move 20.',
      details: {
        keyLesson: 'Aggressive central pawn dominance and timely piece sacrifices will break through uncastled kings.',
        phaseReviews: {
          opening: { title: 'Opening Mastery', positivePoints: ['Established dominant central pawn duo'], negativePoints: [] },
          middlegame: { title: 'Middlegame Execution', positivePoints: ['Decisive Greek Gift sacrifice on h7'], negativePoints: [] },
          endgame: { title: 'Tactical Finish', positivePoints: ['Flawless mating net execution with Qh8#'], negativePoints: [] }
        }
      }
    }
  });

  // 3. Completed Game 2: Morphy's Opera Game (33 plies)
  const game2Id = 'seed-game-opera-brilliancy';
  const game2Replay = replayAndGenerateMoves(operaMoves);

  await prisma.game.upsert({
    where: { id: game2Id },
    update: {
      userId: devUserId,
      opponentName: 'Duke of Brunswick & Count Isouard',
      opponentType: OpponentType.HUMAN,
      playerColor: PlayerColor.WHITE,
      result: GameResult.WIN,
      status: GameStatus.COMPLETED,
      openingName: 'Philidor Defense: Morphy Counter-Attack',
      openingEco: 'C41',
      finalFen: game2Replay.finalFen,
      pgn: game2Replay.pgn
    },
    create: {
      id: game2Id,
      userId: devUserId,
      opponentName: 'Duke of Brunswick & Count Isouard',
      opponentType: OpponentType.HUMAN,
      playerColor: PlayerColor.WHITE,
      result: GameResult.WIN,
      status: GameStatus.COMPLETED,
      openingName: 'Philidor Defense: Morphy Counter-Attack',
      openingEco: 'C41',
      finalFen: game2Replay.finalFen,
      pgn: game2Replay.pgn
    }
  });

  await prisma.gameMove.deleteMany({ where: { gameId: game2Id } });
  await prisma.gameMove.createMany({
    data: game2Replay.moves.map((m) => ({
      ...m,
      gameId: game2Id
    }))
  });

  await prisma.gameAnalysis.upsert({
    where: { gameId: game2Id },
    update: {
      engineName: 'Stockfish',
      engineVersion: 'Stockfish 19 Lite WASM',
      accuracyWhite: 98.0,
      accuracyBlack: 71.0,
      summary: 'Immortal piece development clinic ending in queen sacrifice and Rd8# checkmate.',
      details: {
        keyLesson: 'Rapid piece development, open lines, and pins are vastly superior to premature pawn grabbing.',
        phaseReviews: {
          opening: { title: 'Opening Phase', positivePoints: ['Open center exploitation with threats'], negativePoints: [] },
          middlegame: { title: 'Middlegame Attacks', positivePoints: ['Double rook pin on d-file'], negativePoints: [] },
          endgame: { title: 'Immortal Finish', positivePoints: ['Queen sacrifice deflection leading to Rd8#'], negativePoints: [] }
        }
      }
    },
    create: {
      gameId: game2Id,
      engineName: 'Stockfish',
      engineVersion: 'Stockfish 19 Lite WASM',
      accuracyWhite: 98.0,
      accuracyBlack: 71.0,
      summary: 'Immortal piece development clinic ending in queen sacrifice and Rd8# checkmate.',
      details: {
        keyLesson: 'Rapid piece development, open lines, and pins are vastly superior to premature pawn grabbing.',
        phaseReviews: {
          opening: { title: 'Opening Phase', positivePoints: ['Open center exploitation with threats'], negativePoints: [] },
          middlegame: { title: 'Middlegame Attacks', positivePoints: ['Double rook pin on d-file'], negativePoints: [] },
          endgame: { title: 'Immortal Finish', positivePoints: ['Queen sacrifice deflection leading to Rd8#'], negativePoints: [] }
        }
      }
    }
  });

  // 4. In-Progress Game 3: Sicilian Defense (6 plies)
  const game3Id = 'seed-game-sicilian-in-progress';
  const game3Replay = replayAndGenerateMoves(inProgressMoves);

  await prisma.game.upsert({
    where: { id: game3Id },
    update: {
      userId: devUserId,
      opponentName: 'Chess Coach (Expert)',
      opponentType: OpponentType.AI,
      playerColor: PlayerColor.WHITE,
      result: GameResult.UNKNOWN,
      status: GameStatus.IN_PROGRESS,
      openingName: 'Sicilian Defense: Open',
      openingEco: 'B50',
      finalFen: game3Replay.finalFen,
      pgn: game3Replay.pgn
    },
    create: {
      id: game3Id,
      userId: devUserId,
      opponentName: 'Chess Coach (Expert)',
      opponentType: OpponentType.AI,
      playerColor: PlayerColor.WHITE,
      result: GameResult.UNKNOWN,
      status: GameStatus.IN_PROGRESS,
      openingName: 'Sicilian Defense: Open',
      openingEco: 'B50',
      finalFen: game3Replay.finalFen,
      pgn: game3Replay.pgn
    }
  });

  await prisma.gameMove.deleteMany({ where: { gameId: game3Id } });
  await prisma.gameMove.createMany({
    data: game3Replay.moves.map((m) => ({
      ...m,
      gameId: game3Id
    }))
  });
  }

  // Official production catalog and tactical puzzles
  console.log('Seeding official curriculum catalog and verified tactical puzzles...');
  await seedCurriculum();
  await seedPuzzles(prisma);

  console.log('Idempotent database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
