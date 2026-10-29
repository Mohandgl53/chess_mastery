/**
 * Phase 5: Knowledge Base Seeding Script
 *
 * Run with: npx tsx prisma/seed-knowledge.ts
 *
 * Seeds the KnowledgeChunk table with the chess knowledge base.
 * Uses the KnowledgeIngestionService for deduplication and embedding.
 * Safe to run multiple times — duplicate chunks are skipped.
 */

import { knowledgeIngestionService } from '../src/services/knowledge.ingestion.service.js';
import { chessKnowledgeSeed } from './knowledge.seed.js';
import { prisma } from '../src/config/database.js';

async function seedKnowledge() {
  console.log('🧠 Phase 5: Seeding chess knowledge base...');
  console.log(`📚 Total chunks to ingest: ${chessKnowledgeSeed.length}`);
  console.log('');

  const startTime = Date.now();
  const result = await knowledgeIngestionService.ingestBatch(chessKnowledgeSeed);
  const reembedResult = await knowledgeIngestionService.reembedAll();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('✅ Knowledge base seeding complete:');
  console.log(`   Created:     ${result.created}`);
  console.log(`   Skipped:     ${result.skipped} (already existed)`);
  console.log(`   Re-embedded: ${reembedResult.created}`);
  console.log(`   Failed:      ${result.failed + reembedResult.failed}`);
  console.log(`   Time:        ${elapsed}s`);

  const allErrors = [...result.errors, ...reembedResult.errors];
  if (allErrors.length > 0) {
    console.log('');
    console.log('⚠️  Errors:');
    allErrors.forEach((e) => console.log(`   ${e}`));
  }

  // Show total count
  const total = await prisma.knowledgeChunk.count();
  console.log('');
  console.log(`📊 Total knowledge chunks in database: ${total}`);

  await prisma.$disconnect();
}

seedKnowledge().catch((err) => {
  console.error('❌ Knowledge seeding failed:', err);
  process.exit(1);
});
