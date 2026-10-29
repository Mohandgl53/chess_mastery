import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  let user = await prisma.user.findUnique({ where: { email: 'dev@chesscoach.local' } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash }
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: 'dev@chesscoach.local',
        displayName: 'Mohan',
        passwordHash: hash
      }
    });
  }

  const profile = await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      rating: 1200,
      gamesPlayed: 10,
      gamesWon: 6,
      gamesLost: 4,
      gamesDrawn: 0,
      gamesAnalyzed: 5
    }
  });

  // Ensure an active PIN weakness exists so adaptive training targets PIN
  await prisma.weakness.upsert({
    where: { id: 'dev-weakness-pin' },
    update: { status: 'ACTIVE' },
    create: {
      id: 'dev-weakness-pin',
      playerId: profile.id,
      category: 'TACTICS',
      theme: 'PIN',
      title: 'Pin Exploitation Defense',
      description: 'You frequently miss tactical pins against high-value pieces in recent games.',
      confidence: 0.85,
      occurrenceCount: 3,
      severity: 'HIGH',
      status: 'ACTIVE'
    }
  });

  console.log('Dev user seeded with dev@chesscoach.local / Password123! and active PIN weakness');
  await prisma.$disconnect();
}

main().catch(console.error);
