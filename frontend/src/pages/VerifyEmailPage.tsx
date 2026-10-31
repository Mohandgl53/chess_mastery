import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { ChessMasteryLogo } from '../components/brand/ChessMasteryLogo';
import { authApi } from '../services/api/authApi';
import { ApiError } from '../services/api/client';

interface VerifyEmailPageProps {
  onNavigate: (route: string) => void;
  token?: string;
  initialEmail?: string;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate, token, initialEmail }) => {
  const [status, setStatus] = useState<'VERIFYING' | 'SUCCESS' | 'ERROR' | 'PROMPT'>(
    token ? 'VERIFYING' : 'PROMPT'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState(initialEmail || '');
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('PROMPT');
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        await authApi.verifyEmail(token!);
        if (isMounted) {
          setStatus('SUCCESS');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('ERROR');
          setErrorMessage(err?.message || 'Verification token is invalid or has expired.');
        }
      }
    }

    verify();
    return () => { isMounted = false; };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendSuccess(null);
    setErrorMessage(null);

    try {
      const res = await authApi.resendVerification(resendEmail.trim());
      setResendSuccess(res.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0F141C] text-white">
      <div className="w-full max-w-md bg-[#161D28] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center">
          <ChessMasteryLogo size="md" lightText={true} />
        </div>

        {/* State: Verifying in progress */}
        {status === 'VERIFYING' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-[#81B64C] border-t-transparent animate-spin mx-auto" />
            <h2 className="text-lg font-bold">Verifying Your Email...</h2>
            <p className="text-xs text-slate-400">Please wait while we confirm your single-use verification token.</p>
          </div>
        )}

        {/* State: Verified successfully */}
        {status === 'SUCCESS' && (
          <div className="text-center py-6 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">Email Verified Successfully!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account is verified and ready. You can now sign in and enjoy all Zugora features.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/login')}
              className="w-full py-3 rounded-xl bg-[#81B64C] hover:bg-[#689E39] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State: Token Error or Expired */}
        {status === 'ERROR' && (
          <div className="text-center py-4 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">Verification Failed</h2>
              <p className="text-xs text-rose-300">
                {errorMessage || 'This verification link is invalid, expired, or has already been used.'}
              </p>
            </div>

            {/* Resend Verification Form */}
            <form onSubmit={handleResend} className="space-y-3 text-left pt-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Enter your email to request a new link
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                />
              </div>

              {resendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {resendSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isResending}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                <span>Resend Verification Email</span>
              </button>
            </form>

            <button
              onClick={() => onNavigate('/login')}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* State: Prompt (No token provided) */}
        {status === 'PROMPT' && (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-black text-white">Verify Your Email Address</h2>
              <p className="text-xs text-slate-400">
                Check your inbox for a verification link sent via Resend, or request a new one below.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#81B64C]"
                />
              </div>

              {resendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {resendSuccess}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isResending}
                className="w-full py-3 rounded-xl bg-[#81B64C] hover:bg-[#689E39] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isResending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>Send Verification Link</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => onNavigate('/login')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

