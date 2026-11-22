import { prisma } from '../../src/config/database.js';
import { emailService } from '../../src/services/email.service.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_COST = 10; // Slightly faster for test fixtures

/**
 * Controlled test fixture helper.
 *
 * STRICT SAFETY RESTRICTIONS:
 * - Excluded from production builds (lives in tests/ directory).
 * - Immediately throws a runtime error if NODE_ENV === 'production'.
 * - Operates only on test database records.
 */

function assertNotProduction(functionName: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[SECURITY ALERT] ${functionName} cannot be invoked in production!`);
  }
}

/**
 * Safely marks a test user as email-verified in the test database.
 */
export async function verifyTestAccount(emailOrUserId: string): Promise<void> {
  assertNotProduction('verifyTestAccount');

  await prisma.user.updateMany({
    where: {
      OR: [
        { email: emailOrUserId.toLowerCase().trim() },
        { id: emailOrUserId }
      ]
    },
    data: { emailVerified: true }
  });
}

/**
 * Retrieve the latest single-use verification token captured in-memory for a test account.
 */
export function getLatestTestVerificationToken(email: string): string | undefined {
  assertNotProduction('getLatestTestVerificationToken');

  const normalized = email.toLowerCase().trim();
  const record = emailService.sentEmails
    .slice()
    .reverse()
    .find((e) => e.to.toLowerCase() === normalized && e.type === 'VERIFICATION');

  return record?.token;
}

/**
 * Retrieve the latest single-use password reset token captured in-memory for a test account.
 */
export function getLatestTestPasswordResetToken(email: string): string | undefined {
  assertNotProduction('getLatestTestPasswordResetToken');

  const normalized = email.toLowerCase().trim();
  const record = emailService.sentEmails
    .slice()
    .reverse()
    .find((e) => e.to.toLowerCase() === normalized && e.type === 'PASSWORD_RESET');

  return record?.token;
}

/**
 * Create a verified test user with active profile in the test database.
 * Used by integration tests (curriculum, coach, practice) to obtain a verified account
 * without disabling application security or verification requirements.
 */
export async function createVerifiedTestUser(options: {
  email: string;
  displayName?: string;
  password?: string;
}): Promise<{ id: string; email: string; displayName: string }> {
  assertNotProduction('createVerifiedTestUser');

  const email = options.email.toLowerCase().trim();
  const displayName = options.displayName || 'Test Player';
  const password = options.password || 'Password123!Secure';
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      emailVerified: true, // Verified test account
      profile: {
        create: {
          rating: 400
        }
      }
    }
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
}
