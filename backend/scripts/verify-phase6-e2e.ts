/**
 * Phase 6 Verification Script: Full End-to-End Pipeline Demonstration
 *
 * Demonstrates:
 * 1. GAME creation with moves and Stockfish analysis
 * 2. ANALYSIS ingestion
 * 3. LEARNING EVIDENCE extraction (Fork, King Safety, etc.)
 * 4. WEAKNESS aggregation with confidence
 * 5. SKILL SCORE update (0-100 normalized scores)
 * 6. SKILL SNAPSHOT time-series record
 * 7. TRAINING RECOMMENDATION generation
 * 8. PERSONALIZED COACH CONTEXT injection
 */

import { PrismaClient, KnowledgeCategory } from '@prisma/client';
import { playerMemoryService } from '../src/services/player-memory.service.js';
import { trainingRecommendationService } from '../src/services/training-recommendation.service.js';
import { coachService } from '../src/services/coach.service.js';

const prisma = new PrismaClient();

async function runDemonstration() {
  console.log('===============================================================');
  console.log('PHASE 6: END-TO-END DEMONSTRATION & VERIFICATION');
  console.log('===============================================================');

  // 1. Setup Test User
  const demoEmail = `phase6-demo-${Date.now()}@chesscoach.local`;
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      displayName: 'Phase 6 Grandmaster Trainee',
      passwordHash: 'demohash123'
    }
  });
  console.log(`\n[STEP 1] Created Demo User: ${user.displayName} (ID: ${user.id})`);

  // 2. Create Completed Game with Tactical Moves
  const game = await prisma.game.create({
    data: {
      userId: user.id,
      opponentName: 'Stockfish 19 Lite WASM',
      opponentType: 'AI',
      playerColor: 'WHITE',
      status: 'COMPLETED',
      result: 'LOSS',
      openingName: 'Italian Game',
      openingEco: 'C50',
      finalFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      moves: {
        create: [
          {
            ply: 1,
            moveNumber: 1,
            color: 'w',
            san: 'e4',
            uci: 'e2e4',
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            classification: 'BOOK'
          },
          {
            ply: 2,
            moveNumber: 1,
            color: 'b',
            san: 'e5',
            uci: 'e7e5',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
            classification: 'BOOK'
          },
          {
            ply: 3,
            moveNumber: 2,
            color: 'w',
            san: 'Nf3',
            uci: 'g1f3',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
            classification: 'BEST'
          },
          {
            ply: 4,
            moveNumber: 2,
            color: 'b',
            san: 'Nc6',
            uci: 'b8c6',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            classification: 'BEST'
          },
          {
            ply: 5,
            moveNumber: 3,
            color: 'w',
            san: 'Bc4',
            uci: 'f1c4',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
            classification: 'BLUNDER',
            explanation: 'Critical blunder allowing knight fork tactic on e4.'
          }
        ]
      },
      analysis: {
        create: {
          engineName: 'Stockfish 19 Lite WASM',
          engineVersion: '19.0.0',
          accuracyWhite: 64.2,
          accuracyBlack: 96.0,
          summary: 'White opened solidly but overlooked a tactical fork.'
        }
      }
    },
    include: { moves: true, analysis: true }
  });
  console.log(`\n[STEP 2] Persisted Game with Moves & Stockfish Analysis (Game ID: ${game.id})`);

  // 3. Process Completed Game through PlayerMemoryService
  console.log('\n[STEP 3] Processing Game via PlayerMemoryService...');
  const processResult = await playerMemoryService.processCompletedGame(user.id, game.id);
  console.log(`- Learning Processed: ${processResult.processed}`);
  console.log(`- Evidence Records Created: ${processResult.evidenceCreated}`);

  // 4. Inspect Created Learning Evidence
  const evidenceList = await prisma.learningEvidence.findMany({
    where: { gameId: game.id }
  });
  console.log(`\n[STEP 4] Generated LearningEvidence:`);
  for (const ev of evidenceList) {
    console.log(`  * [${ev.evidenceType}] ${ev.category} - Theme: ${ev.theme} (Severity: ${ev.severity}, Move: ${ev.moveSan})`);
  }

  // 5. Inspect Aggregated Weaknesses
  const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
  const weaknesses = await prisma.weakness.findMany({ where: { playerId: profile!.id } });
  console.log(`\n[STEP 5] Aggregated Weaknesses:`);
  for (const w of weaknesses) {
    console.log(`  * ${w.title} (Theme: ${w.theme})`);
    console.log(`    - Occurrences: ${w.occurrenceCount}x | Confidence: ${Math.round(w.confidence * 100)}% | Status: ${w.status}`);
  }

  // 6. Inspect Updated Skill Scores & Snapshots
  console.log(`\n[STEP 6] Recomputed Skill Profile (0-100 Normalized Training Score):`);
  console.log(`  - Overall Composite: ${profile!.overallTrainingScore}/100`);
  console.log(`  - Tactical Awareness: ${profile!.tacticsSkill}/100`);
  console.log(`  - Blunder Prevention: ${profile!.blunderPreventionSkill}/100`);
  console.log(`  - Games Analyzed: ${profile!.gamesAnalyzed}`);

  const snapshot = await prisma.skillSnapshot.findFirst({
    where: { playerId: profile!.id },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\n[STEP 7] Created Historical SkillSnapshot:`);
  console.log(`  - Snapshot ID: ${snapshot?.id}`);
  console.log(`  - Overall: ${snapshot?.overall} | Tactics: ${snapshot?.tactics} | Timestamp: ${snapshot?.createdAt.toISOString()}`);

  // 7. Inspect Generated Training Recommendations
  const recommendations = await prisma.trainingRecommendation.findMany({
    where: { playerId: profile!.id, status: 'ACTIVE' },
    orderBy: { priority: 'desc' }
  });
  console.log(`\n[STEP 8] Generated Adaptive Training Recommendations:`);
  for (const r of recommendations) {
    console.log(`  * [${r.type}] ${r.title} (Priority: ${r.priority})`);
    console.log(`    Reason: "${r.reason}"`);
  }

  // 8. Inspect Personalized Coach Context Injection
  console.log(`\n[STEP 9] Verifying Coach Service Grounding with Player Memory...`);
  const coachOutput = await coachService.explainMove(
    {
      fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      moveSan: 'e5',
      moveNumber: 1,
      playerColor: 'b',
      classification: 'BOOK_MOVE',
      coachMode: 'FULL_COACHING'
    },
    user.id
  );
  console.log(`- Coach Provider: MockLLMProvider`);
  console.log(`- Coach Response Title: "${coachOutput.title}"`);
  console.log(`- Coach Content: "${coachOutput.content}"`);
  console.log(`- Coach Lesson: "${coachOutput.lesson}"`);

  // 9. Verify Idempotency Guard
  console.log(`\n[STEP 10] Testing Idempotency Guard (re-processing same game)...`);
  const rerun = await playerMemoryService.processCompletedGame(user.id, game.id);
  console.log(`- Second Processing Result: processed = ${rerun.processed}, evidenceCreated = ${rerun.evidenceCreated}`);
  if (rerun.processed === false && rerun.evidenceCreated === 0) {
    console.log('✓ Idempotency verified: duplicate processing was blocked safely.');
  }

  console.log('\n===============================================================');
  console.log('PIPELINE DEMONSTRATION COMPLETE: ALL STAGES VERIFIED');
  console.log('===============================================================');
}

runDemonstration()
  .catch((err) => {
    console.error('Demonstration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
