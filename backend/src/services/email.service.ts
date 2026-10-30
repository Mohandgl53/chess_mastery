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

export class EmailService {
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly clientUrl: string;

  // In-memory record of sent emails for automated test assertions & dev inspection
  public sentEmails: SentEmailRecord[] = [];

  constructor() {
    this.fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    this.clientUrl = env.CLIENT_URL || 'http://localhost:5173';

    if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim() && !env.RESEND_API_KEY.startsWith('your_')) {
      try {
        this.resend = new Resend(env.RESEND_API_KEY);
      } catch (err: any) {
        console.warn('[EmailService] Failed to initialize Resend client:', err?.message);
        this.resend = null;
      }
    }
  }

  /**
   * Helper to build consistent Chess Mastery branded HTML email layout
   */
  private buildHtmlWrapper(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0F141C;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background: #171D28;
      border: 1px solid #283344;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .header {
      background: linear-gradient(135deg, #1B2332 0%, #222C3F 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #283344;
    }
    .logo-badge {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #689E39 0%, #81B64C 100%);
      font-size: 24px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(129, 182, 76, 0.3);
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 30px;
      font-size: 15px;
      line-height: 1.6;
      color: #CBD5E1;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #81B64C;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(129, 182, 76, 0.35);
      letter-spacing: 0.3px;
    }
    .notice {
      background: #1F2838;
      border-left: 4px solid #81B64C;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      margin: 20px 0;
      color: #94A3B8;
    }
    .raw-link {
      word-break: break-all;
      color: #81B64C;
      font-size: 12px;
    }
    .footer {
      background-color: #121721;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #202938;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">👑</div>
      <h1>Chess Mastery</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} Chess Mastery — AI-Powered Chess Coach & Analysis</p>
      <p style="margin: 0;">Sent via Resend Secure Infrastructure</p>
    </div>
  </div>
</body>
</html>
`;
  }

  /**
   * Dispatch registration email verification link
   */
  async sendVerificationEmail(to: string, displayName: string, token: string): Promise<EmailResult> {
    const verificationUrl = `${this.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your Chess Mastery account';

    const bodyContent = `
      <h2 style="margin-top: 0; color: #FFFFFF; font-size: 18px;">Welcome to Chess Mastery, ${displayName}!</h2>
      <p>Thank you for creating your account. Please verify your email address to activate your full player profile, start rated matches, and unlock personalized AI coaching.</p>
      
      <div class="button-container">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>

      <div class="notice">
        <strong>Security Notice:</strong> This verification link is single-use and will expire in 24 hours.
      </div>

      <p style="font-size: 13px; color: #94A3B8;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><a href="${verificationUrl}" class="raw-link">${verificationUrl}</a></p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Welcome to Chess Mastery, ${displayName}!\n\nPlease verify your email address by opening this link in your browser:\n${verificationUrl}\n\nThis link is single-use and expires in 24 hours.\n\nIf you did not register for Chess Mastery, please ignore this email.`;

    this.sentEmails.push({
      to,
      subject,
      type: 'VERIFICATION',
      token,
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Dispatch password reset email link
   */
  async sendPasswordResetEmail(to: string, displayName: string, token: string): Promise<EmailResult> {
    const resetUrl = `${this.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your Chess Mastery password';

    const bodyContent = `
      <h2 style="margin-top: 0; color: #FFFFFF; font-size: 18px;">Password Reset Request</h2>
      <p>Hello ${displayName},</p>
      <p>We received a request to reset the password for your Chess Mastery account. Click the button below to set a new secure password:</p>
      
      <div class="button-container">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>

      <div class="notice">
        <strong>Single-Use Security Notice:</strong> This link expires in <strong>1 hour</strong>. Once used, all other active sessions across your devices will be securely terminated.
      </div>

      <p style="font-size: 13px; color: #94A3B8;">If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
      <p><a href="${resetUrl}" class="raw-link">${resetUrl}</a></p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Hello ${displayName},\n\nA password reset request was made for your Chess Mastery account.\nReset your password here:\n${resetUrl}\n\nThis link expires in 1 hour.\nIf you did not make this request, you can safely ignore this email.`;

    this.sentEmails.push({
      to,
      subject,
      type: 'PASSWORD_RESET',
      token,
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Dispatch security alert when password has been successfully updated
   */
  async sendPasswordChangedNotification(to: string, displayName: string): Promise<EmailResult> {
    const subject = 'Security Alert: Your Chess Mastery password was changed';

    const bodyContent = `
      <h2 style="margin-top: 0; color: #FFFFFF; font-size: 18px;">Password Changed Successfully</h2>
      <p>Hello ${displayName},</p>
      <p>This is a confirmation that the password for your Chess Mastery account (${to}) was recently changed.</p>
      
      <div class="notice" style="border-left-color: #38BDF8;">
        <strong>Time of Change:</strong> ${new Date().toUTCString()}
      </div>

      <p style="color: #F87171; font-size: 13px;">
        <strong>Did not make this change?</strong> Please reset your password immediately or contact our security team.
      </p>
    `;

    const html = this.buildHtmlWrapper(subject, bodyContent);
    const text = `Hello ${displayName},\n\nYour Chess Mastery password was changed at ${new Date().toUTCString()}.\n\nIf you did not make this change, please reset your password immediately.`;

    this.sentEmails.push({
      to,
      subject,
      type: 'PASSWORD_CHANGED',
      sentAt: new Date()
    });

    return this.dispatchEmail({ to, subject, html, text });
  }

  /**
   * Internal helper that sends via Resend SDK with safe error handling
   */
  private async dispatchEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailResult> {
    if (!this.resend) {
      // In offline / test mode or unconfigured API key: simulate successful queueing
      return {
        success: true,
        messageId: `mock-email-${Date.now()}`
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: `Chess Mastery <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      if (response.error) {
        console.warn(
          `[EmailService] Resend API reported an issue (${response.error.name}): ${response.error.message}`
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
      // Handle recipient restrictions (e.g., onboarding@resend.dev sandbox can only send to verified account owner)
      console.warn('[EmailService] Resend dispatch caught an error:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Failed to dispatch email via Resend'
      };
    }
  }
}

export const emailService = new EmailService();

