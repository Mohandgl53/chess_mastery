import { PrismaClient } from '@prisma/client';
import { Chess, Square } from 'chess.js';

const prisma = new PrismaClient();

async function verifyAllCurriculumSteps() {
  console.log('--- AUDITING ALL SEEDED CURRICULUM POSITIONS WITH CHESS.JS ---');

  const steps = await prisma.lessonStep.findMany({
    include: { lesson: true },
    orderBy: [{ lessonId: 'asc' }, { stepNumber: 'asc' }]
  });

  let totalSteps = steps.length;
  let passedSteps = 0;
  let failedSteps = 0;

  for (const step of steps) {
    console.log(`\nChecking [${step.lesson.title}] Step ${step.stepNumber} (${step.type}):`);
    console.log(`  FEN: ${step.fen}`);

    let chess: Chess;
    try {
      chess = new Chess(step.fen);
      console.log(`  ✓ FEN is syntactically valid in chess.js`);
    } catch (err) {
      console.error(`  ❌ FEN failed to load in chess.js:`, err);
      failedSteps++;
      continue;
    }

    if (step.type === 'interactive_move') {
      console.log(`  Expected Move: SAN="${step.expectedMoveSan}", From="${step.expectedMoveFrom}", To="${step.expectedMoveTo}"`);

      if (!step.expectedMoveSan && !step.expectedMoveFrom) {
        console.error(`  ❌ Interactive move step lacks expectedMove definitions!`);
        failedSteps++;
        continue;
      }

      // Test move legality in chess.js
      let move = null;
      try {
        if (step.expectedMoveSan) {
          move = chess.move(step.expectedMoveSan);
        } else if (step.expectedMoveFrom && step.expectedMoveTo) {
          move = chess.move({
            from: step.expectedMoveFrom as Square,
            to: step.expectedMoveTo as Square
          });
        }
      } catch (err) {
        console.error(`  ❌ Move execution threw error in chess.js:`, err);
        failedSteps++;
        continue;
      }

      if (!move) {
        console.error(`  ❌ Move is ILLEGAL from position: ${step.fen}`);
        failedSteps++;
        continue;
      }

      console.log(`  ✓ Move ${move.san} is 100% LEGAL! Piece: ${move.piece.toUpperCase()}, From: ${move.from}, To: ${move.to}`);

      if (step.expectedMoveSan?.includes('#')) {
        const isMate = chess.isCheckmate();
        console.log(`  ✓ Checkmate verification: ${isMate ? 'CONFIRMED CHECKMATE' : 'NOT CHECKMATE'}`);
        if (!isMate) {
          console.error(`  ❌ Move SAN indicated checkmate (#) but board is not in checkmate!`);
          failedSteps++;
          continue;
        }
      }

      passedSteps++;
    } else if (step.type === 'question') {
      const options = step.options as any[];
      if (!Array.isArray(options) || options.length === 0) {
        console.error(`  ❌ Question step missing options!`);
        failedSteps++;
        continue;
      }
      const correctOpts = options.filter(o => o.isCorrect);
      if (correctOpts.length !== 1) {
        console.error(`  ❌ Question step must have exactly 1 correct option, found: ${correctOpts.length}`);
        failedSteps++;
        continue;
      }
      console.log(`  ✓ Question has ${options.length} options with 1 verified correct answer: "${correctOpts[0].text}"`);
      passedSteps++;
    } else {
      // Concept / theory step
      console.log(`  ✓ Concept step verified with valid board context.`);
      passedSteps++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`AUDIT RESULTS: ${passedSteps}/${totalSteps} STEPS PASSED VERIFICATION (${failedSteps} FAILS)`);
  console.log(`======================================================`);

  await prisma.$disconnect();
  if (failedSteps > 0) process.exit(1);
}

verifyAllCurriculumSteps().catch(e => {
  console.error(e);
  process.exit(1);
});
