import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { ChessMasteryLogo } from '../components/brand/ChessMasteryLogo';
import { authApi } from '../services/api/authApi';

interface ForgotPasswordPageProps {
  onNavigate: (route: string) => void;
  initialEmail?: string;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate, initialEmail }) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(res.message || 'If an account exists, a password reset link has been dispatched.');
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0F141C] text-white">
      <div className="w-full max-w-md bg-[#161D28] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center">
          <ChessMasteryLogo size="md" lightText={true} />
        </div>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Reset Link Dispatched</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {successMessage}
              </p>
              <div className="p-3 mt-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left">
                <strong>Next steps:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check your inbox and spam/junk folder.</li>
                  <li>Click the secure link inside the email to choose a new password.</li>
                  <li>Reset links expire in 1 hour for your security.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="w-full py-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white min-h-[44px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <span>Try Another Email Address</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-1.5 pb-2">
              <h2 className="text-xl font-black text-white">Forgot Password?</h2>
              <p className="text-xs text-slate-400">
                Enter your registered email address below and we will send you a secure password reset link.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="forgot-password-email" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="forgot-password-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#81B64C]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white min-h-[44px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="min-h-[44px] px-2 text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

