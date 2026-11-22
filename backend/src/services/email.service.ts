import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  type: 'VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED';
  token?: string;
  sentAt: Date;
}

export type EmailProviderType = 'smtp' | 'resend' | 'mock';

export class EmailService {
  private provider: EmailProviderType;
  private smtpTransporter: Transporter | null = null;
  private resend: Resend | null = null;
  private readonly clientUrl: string;
  private readonly isMockMode: boolean;

  // In-memory record of sent emails for automated test assertions & dev inspection
  public sentEmails: SentEmailRecord[] = [];

  constructor() {
    const isTest = process.env.NODE_ENV === 'test';
    const isLiveEmailRequested = process.env.LIVE_EMAIL_TEST === 'true';

    // Mock mode in tests unless live test is explicitly requested
    this.isMockMode = isTest && !isLiveEmailRequested;
    this.provider = this.isMockMode ? 'mock' : (env.EMAIL_PROVIDER as EmailProviderType) || 'smtp';

    // Resolve client URL for email action links (verification, password reset).
    // In production env.validation guarantees PUBLIC_CLIENT_URL is a real HTTPS
    // URL; CLIENT_URL is only a local-development fallback.
    this.clientUrl = (env.PUBLIC_CLIENT_URL?.trim() || env.CLIENT_URL).replace(/\/$/, '');

    if (!this.isMockMode) {
      if (this.provider === 'smtp') {
        this.initSmtpTransporter();
      } else if (this.provider === 'resend') {
        this.initResendClient();
      }
    }
  }

  /**
   * Initialize Nodemailer SMTP Transporter
   */
  private initSmtpTransporter(): void {
    if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_USER.trim() && !env.SMTP_USER.startsWith('your_')) {
      try {
        const cleanPass = env.SMTP_PASS.replace(/\s+/g, '');
        this.smtpTransporter = nodemailer.createTransport({
          host: env.SMTP_HOST || 'smtp.gmail.com',
          port: env.SMTP_PORT || 587,
          secure: env.SMTP_SECURE ?? false, // false for port 587 STARTTLS
          auth: {
            user: env.SMTP_USER.trim(),
            pass: cleanPass
          },
          connectionTimeout: 10000,
          socketTimeout: 15000
        });
      } catch (err: any) {
        console.warn('[EmailService] Failed to initialize Nodemailer SMTP transporter:', this.sanitizeLogMessage(err?.message || ''));
        this.smtpTransporter = null;
      }
    } else {
      this.smtpTransporter = null;
    }
  }

  /**
   * Initialize Resend Client for backward compatibility / fallback
   */
  private initResendClient(): void {
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim() && !env.RESEND_API_KEY.startsWith('your_')) {
      try {
        this.resend = new Resend(env.RESEND_API_KEY);
      } catch (err: any) {
        console.warn('[EmailService] Failed to initialize Resend client:', err?.message);
        this.resend = null;
      }
    } else {
      this.resend = null;
    }
  }

  /**
   * Verify SMTP connection health (can be called at startup or on-demand)
   */
  public async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    if (this.isMockMode) {
      return { ok: true, message: 'Mock email provider active' };
    }

    if (this.provider === 'smtp') {
      if (!this.smtpTransporter) {
        return { ok: false, message: 'SMTP transporter is unconfigured or credentials missing.' };
      }
      try {
        await this.smtpTransporter.verify();
        return { ok: true, message: 'SMTP connection verified successfully.' };
      } catch (err: any) {
        const sanitized = this.sanitizeLogMessage(err?.message || 'SMTP verification failed');
        console.warn('[EmailService] SMTP verification failed:', sanitized);
        return { ok: false, message: sanitized };
      }
    }

    if (this.provider === 'resend') {
      if (!this.resend) {
        return { ok: false, message: 'Resend client is unconfigured or RESEND_API_KEY missing.' };
      }
      return { ok: true, message: 'Resend client initialized.' };
    }

    return { ok: true, message: 'Email provider ready' };
  }

  /**
   * Accessible, responsive, client-safe HTML email wrapper using inlined CSS.
   * Engineered for high deliverability across Gmail, Outlook, and mobile clients.
   */
  private buildHtmlWrapper(title: string, bodyContent: string): string {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f17; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Container Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #151b26; border: 1px solid #232d3d; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 28px 24px 20px 24px; border-bottom: 1px solid #232d3d;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase;">
                    <span style="color: #81b64c;">ZUGORA</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 12px; color: #94a3b8; padding-top: 4px; font-weight: 500;">
                    AI-Powered Chess Coach
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #10151f; border-top: 1px solid #1f2736; text-align: center; font-size: 12px; line-height: 1.5; color: #64748b;">
              <p style="margin: 0 0 6px 0;">This email was sent to confirm your Zugora account activity.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Zugora. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Dispatch registration email verification link
   */
  async sendVerificationEmail(to: string, displayName: string, token: string): Promise<EmailResult> {
    const verificationUrl = `${this.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your Zugora account';

    const bodyContent = `
      <h1 style="margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #ffffff;">Welcome to Zugora, ${displayName}!</h1>
      <p style="margin: 0 0 18px 0;">Thank you for registering. Please confirm your email address to complete your account setup and activate your player profile.</p>
      
      <!-- Bulletproof Button -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 26px auto 26px auto;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #81b64c;">
            <a href="${verificationUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 13px 28px; display: inline-block; border-radius: 8px; border: 1px solid #81b64c;">
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>

      <div style="background-color: #1a2230; border-left: 3px solid #81b64c; padding: 12px 14px; border-radius: 4px; font-size: 13px; color: #94a3b8; margin: 20px 0;">
        This verification link expires in 24 hours and can only be used once.
      </div>

      <p style="margin: 20px 0 6px 0; font-size: 13px; color: #94a3b8;">If the button does not open, copy and paste this link into your browser:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;"><a href="${verificationUrl}" target="_blank" style="color: #81b64c; text-decoration: underline;">${verificationUrl}</a></p>

      <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">If you did not sign up for Zugora, no further action is needed and you can safely ignore this message.</p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Welcome to Zugora, ${displayName}!\n\nPlease verify your email address to complete your account setup:\n${verificationUrl}\n\nThis verification link is valid for 24 hours.\n\nIf you did not register for Zugora, you can safely ignore this email.`;

    const isProd = process.env.NODE_ENV === 'production';
    this.recordSentEmail({
      to,
      subject,
      type: 'VERIFICATION',
      token: isProd ? undefined : token,
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Dispatch password reset email link
   */
  async sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<EmailResult> {
    const resetUrl = `${this.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your Zugora password';

    const bodyContent = `
      <h1 style="margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #ffffff;">Password Reset Request</h1>
      <p style="margin: 0 0 18px 0;">Hello ${displayName},</p>
      <p style="margin: 0 0 18px 0;">We received a request to reset the password for your Zugora account. Click the button below to choose a new password:</p>
      
      <!-- Bulletproof Button -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 26px auto 26px auto;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #81b64c;">
            <a href="${resetUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 13px 28px; display: inline-block; border-radius: 8px; border: 1px solid #81b64c;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>

      <div style="background-color: #1a2230; border-left: 3px solid #81b64c; padding: 12px 14px; border-radius: 4px; font-size: 13px; color: #94a3b8; margin: 20px 0;">
        For your security, this link is single-use and expires in 1 hour. Active sessions on other devices will be ended when your password is updated.
      </div>

      <p style="margin: 20px 0 6px 0; font-size: 13px; color: #94a3b8;">If the button does not open, copy and paste this link into your browser:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;"><a href="${resetUrl}" target="_blank" style="color: #81b64c; text-decoration: underline;">${resetUrl}</a></p>

      <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">If you did not request a password reset, your password remains secure and no action is required.</p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Hello ${displayName},\n\nA password reset request was received for your Zugora account.\n\nReset your password using this link:\n${resetUrl}\n\nThis link is single-use and expires in 1 hour.\n\nIf you did not request this, your password remains secure and you can ignore this email.`;

    const isProd = process.env.NODE_ENV === 'production';
    this.recordSentEmail({
      to,
      subject,
      type: 'PASSWORD_RESET',
      token: isProd ? undefined : token,
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Dispatch security alert when password has been successfully updated
   */
  async sendPasswordChangedNotification(to: string, displayName: string): Promise<EmailResult> {
    const subject = 'Security Alert: Your Zugora password was changed';
    const resetUrl = `${this.clientUrl}/forgot-password?email=${encodeURIComponent(to)}`;

    const bodyContent = `
      <h1 style="margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #ffffff;">Password Changed Successfully</h1>
      <p style="margin: 0 0 18px 0;">Hello ${displayName},</p>
      <p style="margin: 0 0 18px 0;">This email confirms that the password for your Zugora account (${to}) was recently updated.</p>
      
      <div style="background-color: #1a2230; border-left: 3px solid #38bdf8; padding: 12px 14px; border-radius: 4px; font-size: 13px; color: #94a3b8; margin: 20px 0;">
        <strong>Time of Update:</strong> ${new Date().toUTCString()}
      </div>

      <p style="margin: 20px 0 0 0; font-size: 13px; color: #94a3b8;">
        If you performed this change, no further action is needed. If you did not make this change, please <a href="${resetUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">reset your password immediately</a> to protect your account.
      </p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Hello ${displayName},\n\nYour Zugora account password was successfully updated at ${new Date().toUTCString()}.\n\nIf you did not make this change, please reset your password immediately at:\n${resetUrl}`;

    this.recordSentEmail({
      to,
      subject,
      type: 'PASSWORD_CHANGED',
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Safely record sent emails in memory for test assertions without memory growth
   */
  private recordSentEmail(record: SentEmailRecord): void {
    this.sentEmails.push(record);
    if (this.sentEmails.length > 100) {
      this.sentEmails.shift();
    }
  }

  /**
   * Sanitize log messages by redacting personal email addresses, tokens, and credentials
   */
  public sanitizeLogMessage(message: string): string {
    return message
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/(token|secret|key|password|pass|auth)\s*[:=]\s*[^,\s;&]+/gi, '$1=[REDACTED]');
  }

  /**
   * Internal helper that sends via active provider (Nodemailer SMTP or Resend SDK)
   * with safe error handling, RFC transactional headers, and retry for transient glitches.
   */
  private async dispatchEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult> {
    // 1. Mock Mode (Automated Tests or MOCK provider)
    if (this.isMockMode || this.provider === 'mock') {
      return {
        success: true,
        messageId: `mock-email-${Date.now()}`
      };
    }

    // 2. SMTP Provider (Gmail / Custom SMTP)
    if (this.provider === 'smtp') {
      if (!this.smtpTransporter) {
        console.error('[EmailService] SMTP Dispatch failed: transporter is unconfigured or credentials missing.');
        return {
          success: false,
          error: 'Email delivery infrastructure is unconfigured. Missing SMTP credentials.'
        };
      }

      const senderEmail = env.SMTP_USER || 'zugora.app@gmail.com';
      const fromAddress = `"${env.SMTP_FROM_NAME || 'Zugora'}" <${senderEmail}>`;
      let lastError: string | undefined;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const info = await this.smtpTransporter.sendMail({
            from: fromAddress,
            to: options.to,
            replyTo: senderEmail,
            subject: options.subject,
            html: options.html,
            text: options.text,
            headers: {
              'Auto-Submitted': 'auto-generated',
              'X-Auto-Response-Suppress': 'All',
              'X-Entity-Ref-ID': `zugora-${Date.now()}`
            }
          });

          return {
            success: true,
            messageId: info.messageId
          };
        } catch (err: any) {
          lastError = err?.message || 'Failed to dispatch email via SMTP';
          const isTransient = /timeout|connect|network|busy|421|451/i.test(lastError || '');

          if (attempt === 1 && isTransient) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }

          console.warn('[EmailService] SMTP dispatch error:', this.sanitizeLogMessage(lastError || ''));
          return {
            success: false,
            error: lastError
          };
        }
      }

      return {
        success: false,
        error: lastError || 'Failed to dispatch email via SMTP after retry'
      };
    }

    // 3. Resend Provider (Fallback)
    if (this.provider === 'resend') {
      if (!this.resend) {
        console.error('[EmailService] Dispatch failed: Resend client is unconfigured or RESEND_API_KEY is missing.');
        return {
          success: false,
          error: 'Email delivery infrastructure is unconfigured. Missing RESEND_API_KEY.'
        };
      }

      let lastError: string | undefined;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const fromAddress = env.RESEND_FROM_EMAIL.includes('<') && env.RESEND_FROM_EMAIL.includes('>')
            ? env.RESEND_FROM_EMAIL
            : `Zugora <${env.RESEND_FROM_EMAIL}>`;

          const response = await this.resend.emails.send({
            from: fromAddress,
            to: options.to,
            replyTo: env.SMTP_USER || 'zugora.app@gmail.com',
            subject: options.subject,
            html: options.html,
            text: options.text,
            headers: {
              'Auto-Submitted': 'auto-generated',
              'X-Auto-Response-Suppress': 'All'
            }
          });

          if (response.error) {
            lastError = response.error.message;
            const isTransient =
              response.error.name === 'rate_limit_exceeded' ||
              response.error.name === 'internal_server_error';

            if (attempt === 1 && isTransient) {
              await new Promise((resolve) => setTimeout(resolve, 600));
              continue;
            }

            console.warn(
              `[EmailService] Resend API reported an issue (${response.error.name}): ${this.sanitizeLogMessage(response.error.message || '')}`
            );
            return {
              success: false,
              error: response.error.message
            };
          }

          return {
            success: true,
            messageId: response.data?.id
          };
        } catch (err: any) {
          lastError = err?.message || 'Failed to dispatch email via Resend';
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }

          console.warn('[EmailService] Resend dispatch caught an error:', this.sanitizeLogMessage(lastError || ''));
          return {
            success: false,
            error: lastError
          };
        }
      }

      return {
        success: false,
        error: lastError || 'Failed to dispatch email after retry'
      };
    }

    return {
      success: false,
      error: `Unknown email provider: ${this.provider}`
    };
  }
}

export const emailService = new EmailService();
