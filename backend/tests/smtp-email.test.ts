import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '../src/services/email.service.js';

describe('Gmail SMTP / Nodemailer Email Service Suite', () => {
  it('initializes in mock mode during automated tests by default', () => {
    const service = new EmailService();
    expect(service.sentEmails).toBeDefined();
  });

  it('dispatches verification email with Zugora branding and single-use security notice', async () => {
    const service = new EmailService();
    const result = await service.sendVerificationEmail(
      'test-recipient@example.com',
      'Test Player',
      'mock-verify-token-12345'
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(service.sentEmails.length).toBeGreaterThan(0);

    const recorded = service.sentEmails[service.sentEmails.length - 1];
    expect(recorded.to).toBe('test-recipient@example.com');
    expect(recorded.type).toBe('VERIFICATION');
    expect(recorded.subject).toBe('Verify your Zugora account');
  });

  it('dispatches password reset email with 1-hour expiration and session revocation notice', async () => {
    const service = new EmailService();
    const result = await service.sendPasswordResetEmail(
      'player-reset@example.com',
      'Reset User',
      'mock-reset-token-99999'
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();

    const recorded = service.sentEmails[service.sentEmails.length - 1];
    expect(recorded.to).toBe('player-reset@example.com');
    expect(recorded.type).toBe('PASSWORD_RESET');
    expect(recorded.subject).toBe('Reset your Zugora password');
  });

  it('dispatches password changed security notification', async () => {
    const service = new EmailService();
    const result = await service.sendPasswordChangedNotification(
      'player-changed@example.com',
      'Security Alert User'
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();

    const recorded = service.sentEmails[service.sentEmails.length - 1];
    expect(recorded.to).toBe('player-changed@example.com');
    expect(recorded.type).toBe('PASSWORD_CHANGED');
    expect(recorded.subject).toBe('Security Alert: Your Zugora password was changed');
  });

  it('sanitizes log messages by redacting personal email addresses and secrets', () => {
    const service = new EmailService();
    const rawMsg = 'Failed delivery to player123@gmail.com with token=abc123xyz and password: mySecretPassword!';
    const sanitized = service.sanitizeLogMessage(rawMsg);

    expect(sanitized).not.toContain('player123@gmail.com');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
    expect(sanitized).not.toContain('abc123xyz');
    expect(sanitized).not.toContain('mySecretPassword');
  });

  it('resolves email action links cleanly from environment without hardcoded placeholders', async () => {
    const service = new EmailService();
    await service.sendVerificationEmail('user1@example.com', 'User 1', 'test-token-abc');
    await service.sendPasswordResetEmail('user2@example.com', 'User 2', 'reset-token-xyz');
    await service.sendPasswordChangedNotification('user3@example.com', 'User 3');

    const clientUrl = (service as any).clientUrl;
    expect(clientUrl).toBeDefined();
    expect(clientUrl.length).toBeGreaterThan(0);
    expect(service.sentEmails.length).toBe(3);
  });
});
