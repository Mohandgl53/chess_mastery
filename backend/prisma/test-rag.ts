/**
 * Quick RAG retrieval smoke test
 * Run: npx tsx prisma/test-rag.ts
 */
import { ragRetrievalService } from '../src/services/rag.retrieval.service.js';
import { prisma } from '../src/config/database.js';

async function testRAG() {
  console.log('🔍 Testing RAG retrieval...\n');

  const queries = [
    { queryText: 'fork knight tactics two pieces', topK: 3 },
    { queryText: 'isolated pawn endgame weakness', topK: 3 },
    { queryText: 'Sicilian defense opening counterplay', topK: 3 },
    { queryText: 'back rank mate rook queen', topK: 3 }
  ];

  for (const query of queries) {
    console.log(`Query: "${query.queryText}"`);
    const results = await ragRetrievalService.retrieve(query);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.retrievalMethod}] ${r.title} (${r.category}) score=${r.score.toFixed(4)}`);
    });
    console.log('');
  }

  await prisma.$disconnect();
}

testRAG().catch(console.error);
