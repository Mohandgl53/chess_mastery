import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const content = fs.readFileSync('prisma/migrations/20260927144000_phase7_adaptive_practice_and_mastery/migration.sql', 'utf8');

  // Split into discrete commands (preserving DO $$ blocks)
  const statements: string[] = [];
  let buffer = '';
  let inDollarBlock = false;

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue; // skip comments

    if (trimmed.includes('$$')) {
      inDollarBlock = !inDollarBlock;
    }

    buffer += line + '\n';

    if (!inDollarBlock && trimmed.endsWith(';')) {
      statements.push(buffer.trim());
      buffer = '';
    }
  }
  if (buffer.trim()) {
    statements.push(buffer.trim());
  }

  for (const stmt of statements) {
    if (!stmt) continue;
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err: any) {
      console.warn('Statement warning/error:', err.message, '\nStatement was:\n', stmt);
      throw err;
    }
  }

  console.log(`Executed ${statements.length} Phase 7 migration statements successfully!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
