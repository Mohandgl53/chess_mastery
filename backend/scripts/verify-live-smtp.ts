import { EmailService } from '../src/services/email.service.js';

async function main() {
  // Explicitly enable live email sending for this verification script
  process.env.LIVE_EMAIL_TEST = 'true';
  const emailService = new EmailService();

  console.log('Verifying SMTP connection...');
  const conn = await emailService.verifyConnection();
  console.log(`Connection Status: ${conn.message}`);
  if (!conn.ok) {
    process.exit(1);
  }

  const recipients = [
    { email: 'mohandgl53@gmail.com', name: 'Mohan' },
    { email: 'tomhollderdgl53@gmail.com', name: 'Tom' }
  ];

  for (const { email, name } of recipients) {
    console.log(`\n======================================================`);
    console.log(`Sending Genuine Verification Email to ${email}...`);
    const regResult = await emailService.sendVerificationEmail(
      email,
      name,
      'a1b2c3d4e5f678901234567890abcdef'
    );
    console.log('Verification Email Result:', regResult);

    console.log(`Sending Genuine Password Reset Email to ${email}...`);
    const resetResult = await emailService.sendPasswordResetEmail(
      email,
      name,
      '9876543210fedcba0987654321fedcba'
    );
    console.log('Password Reset Result:', resetResult);
  }
}

main().catch(console.error);
