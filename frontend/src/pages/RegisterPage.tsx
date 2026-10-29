import React, { useState } from 'react';
import {
  Crown,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Crosshair,
  BarChart2,
  Users,
  Zap,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../services/api/client';

interface RegisterPageProps {
  onNavigate: (route: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute password strength (0 to 4)
  const getPasswordStrength = (pwd: string): number => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength += 1;
    if (/\d/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) strength += 1;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      onNavigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (err.status === 400) {
          setError(err.message || 'Please check your input and try again.');
        } else if (err.status === 0) {
          setError('Cannot connect to server. Please check your connection.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialClick = async (provider: string) => {
    if (provider === 'Google') {
      try {
        setIsLoading(true);
        setError(null);
        const googleObj = (window as any).google;
        if (googleObj?.accounts?.id) {
          googleObj.accounts.id.prompt();
          return;
        }
        setError('Google Sign-In is enabled on the backend. Please configure your Google Client ID or use email registration.');
      } catch (err: any) {
        setError(err?.message || 'Google sign-up failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(`${provider} sign-up is enabled for linked accounts. Please register using your email address.`);
    }
  };

  // Reusable Register Form Component
  const renderRegisterForm = (isMobile = false) => (
    <div className={`w-full ${isMobile ? 'max-w-[420px] mx-auto' : ''}`}>
      {/* Header Eyebrow & Title */}
      <div className={isMobile ? 'mb-4' : 'mb-6'}>
        <span className="text-[10px] font-bold tracking-[0.25em] text-stone-500 uppercase block mb-1.5">
          CREATE YOUR ACCOUNT
        </span>
        <h2
          className={`font-black text-stone-900 tracking-tight leading-tight ${
            isMobile ? 'text-2xl sm:text-3xl' : 'text-3xl xl:text-[34px]'
          }`}
        >
          Join Chess Coach
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 font-normal">
          Start learning, practicing, and improving with AI-powered chess coaching.
        </p>
      </div>

      {/* Form */}
      <form id="register-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5" noValidate>
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label htmlFor="register-name" className="block text-xs font-bold text-stone-700 mb-1">
            Full Name
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              disabled={isLoading}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="register-email" className="block text-xs font-bold text-stone-700 mb-1">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="register-password" className="block text-xs font-bold text-stone-700 mb-1">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              disabled={isLoading}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="button"
              id="register-show-password"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <div className="flex items-center gap-1 flex-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    passwordStrength >= level
                      ? passwordStrength >= 3
                        ? 'bg-[#84CC16]'
                        : 'bg-amber-400'
                      : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10.5px] font-medium text-stone-400 shrink-0">
              Password strength
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="register-confirm-password" className="block text-xs font-bold text-stone-700 mb-1">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              id="register-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="button"
              id="register-show-confirm"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="register-submit"
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-5 bg-[#181C1A] hover:bg-black disabled:bg-stone-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-3 sm:my-3.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="bg-[#FAF8F5] px-2.5 text-stone-400 font-bold tracking-wider uppercase">
              or continue with
            </span>
          </div>
        </div>

        {/* Social Buttons: Google & GitHub */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleSocialClick('Google')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-white transition-all text-xs font-semibold text-stone-700 cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google</span>
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={() => handleSocialClick('GitHub')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-white transition-all text-xs font-semibold text-stone-700 cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-stone-900" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Terms Checkbox */}
        <div className="pt-1.5 flex items-start gap-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreeTerms}
            onClick={() => setAgreeTerms(!agreeTerms)}
            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              agreeTerms ? 'bg-[#181C1A] text-white' : 'border border-stone-300 bg-white'
            }`}
          >
            {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
          <span className="text-[11px] sm:text-xs text-stone-600 leading-tight">
            I agree to the{' '}
            <span className="underline hover:text-stone-900 cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline hover:text-stone-900 cursor-pointer">Privacy Policy</span>
          </span>
        </div>

        {/* Already have an account? Sign in link right inside the form */}
        <div className="pt-3 text-center border-t border-stone-200/70 mt-3">
          <p className="text-xs sm:text-sm text-stone-600">
            Already have an account?{' '}
            <button
              type="button"
              id="register-signin-link"
              onClick={() => onNavigate('/login')}
              className="font-bold text-stone-900 hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
            >
              Sign in →
            </button>
          </p>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#F3EFE7_0%,#E6E2D8_50%,#DDD8CD_100%)] font-sans selection:bg-[#BEF264] selection:text-black">
      
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< lg): Fit-to-Screen Single Page Experience (NO SCROLL)      */}
      {/* ========================================================================= */}
      <div className="lg:hidden min-h-screen flex flex-col justify-between p-3 sm:p-5 relative overflow-y-auto bg-[#090D0B] text-white">
        
        {/* Background Archway & King Artwork */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="/images/register-king.jpg"
            alt="Chess King Archway"
            className="w-full h-full object-cover object-center brightness-[0.6] contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D0B] via-[#090D0B]/70 to-[#090D0B]/85" />
          <div className="absolute inset-0 bg-radial-at-tr from-[#A3E635]/15 via-transparent to-transparent mix-blend-screen" />
        </div>

        {/* Mobile Top Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 shrink-0 pt-1">
          <button
            type="button"
            onClick={() => onNavigate('/landing')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            title="Return to Landing Page"
          >
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shadow-md group-hover:bg-[#C6F535] transition-colors">
              <Crown className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-none group-hover:text-stone-200 transition-colors">
                Chess Coach
              </h1>
              <p className="text-[8.5px] font-bold tracking-[0.2em] text-[#A3E635] mt-0.5 uppercase">
                Play. Learn. Improve.
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/landing')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-xs text-stone-300 hover:text-white hover:bg-white/15 transition-all text-xs font-medium cursor-pointer"
              title="Return to Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-3.5 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-xs text-white hover:bg-white hover:text-black transition-all text-xs font-semibold cursor-pointer"
            >
              Sign in →
            </button>
          </div>
        </div>

        {/* Centerpiece Form Card on Mobile */}
        <div className="relative z-10 my-auto py-2 flex items-center justify-center w-full">
          <div className="bg-[#FAF8F5] rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl border border-stone-200/90 w-full max-w-[390px] sm:max-w-[420px]">
            {renderRegisterForm(true)}
          </div>
        </div>

        {/* Bottom Benefits Pill on Mobile */}
        <div className="relative z-10 shrink-0 pb-1 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-full py-1 px-3 text-[11px] text-stone-300 shadow-md">
            <Zap className="w-3.5 h-3.5 text-[#C6F535]" />
            <span>AI Coaching • Full Curriculum • Tactical Training</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (≥ lg): Exact Side-by-Side Dual-Card Composition              */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-6 xl:p-9">
        <div className="w-full max-w-[1520px] relative">
          
          <div className="grid grid-cols-12 gap-5 xl:gap-7 min-h-[860px]">
            
            {/* ===================================================================== */}
            {/* CARD 1 (LEFT): Dark Archway King Card (5 cols)                         */}
            {/* ===================================================================== */}
            <div className="col-span-5 bg-[#090D0B] rounded-[32px] p-8 xl:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white">
              
              {/* Background Archway & King Image */}
              <div className="absolute inset-0 pointer-events-none">
                <img
                  src="/images/register-king.jpg"
                  alt="Chess King Archway"
                  className="w-full h-full object-cover object-right scale-105 brightness-[0.88] contrast-105"
                />
                {/* Deep dramatic gradients on the left to guarantee crisp text legibility */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#090D0B] via-[#090D0B]/85 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D0B] via-transparent to-[#090D0B]/70" />
              </div>

              {/* Top Row: Brand Logo on left + Back to Home */}
              <div className="flex items-center justify-between gap-3 relative z-10">
                <button
                  type="button"
                  onClick={() => onNavigate('/landing')}
                  className="flex items-center gap-3 text-left cursor-pointer group"
                  title="Return to Landing Page"
                >
                  <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-md group-hover:bg-[#C6F535] transition-colors">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-base font-extrabold text-white tracking-tight leading-none group-hover:text-stone-200 transition-colors">
                      Chess Coach
                    </h1>
                    <p className="text-[9.5px] font-bold tracking-[0.22em] text-stone-400 mt-1 uppercase">
                      PLAY. LEARN. IMPROVE.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/landing')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-300 hover:text-white hover:bg-white/10 border border-white/15 backdrop-blur-xs transition-all cursor-pointer"
                  title="Return to Landing Page"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Home</span>
                </button>
              </div>

              {/* Left Content: Headlines & Features List */}
              <div className="my-auto max-w-[340px] space-y-6 relative z-10 py-6">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.25em] text-stone-400 uppercase block mb-2">
                    JOIN A COMMUNITY OF LEARNERS
                  </span>
                  <h2 className="text-3xl sm:text-4xl xl:text-[44px] font-black text-white leading-[1.05] tracking-tight">
                    Start Your<br />
                    <span className="text-[#C6F535]">Chess</span> Journey.
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 mt-3 font-normal leading-relaxed">
                    Create your account and get access to personalized learning, tactical training, and AI-powered coaching.
                  </p>
                </div>

                {/* 4 Feature Items */}
                <div className="space-y-3.5 pt-1">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/10">
                      <BookOpen className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-snug">Structured Learning</h3>
                      <p className="text-[11px] text-stone-400">From basics to advanced</p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/10">
                      <Crosshair className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-snug">Tactical Practice</h3>
                      <p className="text-[11px] text-stone-400">Sharpen your instincts</p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/10">
                      <BarChart2 className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-snug">Track Progress</h3>
                      <p className="text-[11px] text-stone-400">See real improvement</p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/10">
                      <Users className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-snug">AI Coach Support</h3>
                      <p className="text-[11px] text-stone-400">Get personalized feedback</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Glassmorphic Quote Box */}
              <div className="relative z-10">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-sm shadow-xl flex items-stretch gap-3">
                  <div className="w-1 bg-[#C0F22A] rounded-full self-stretch" />
                  <div>
                    <blockquote className="text-xs font-semibold text-white/95 leading-snug">
                      “A small step today, a stronger player tomorrow.”
                    </blockquote>
                    <p className="text-[10px] text-stone-400 font-medium mt-1">
                      — Chess Coach
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ===================================================================== */}
            {/* CARD 2 (RIGHT): Warm Cream Card (#FAF8F5) with Form & Benefits (7 col) */}
            {/* ===================================================================== */}
            <div className="col-span-7 bg-[#FAF8F5] rounded-[32px] p-8 xl:p-11 shadow-2xl relative flex flex-col justify-between overflow-hidden">
              
              {/* Top Row on Right Card: "Already have an account? Sign in →" */}
              <div className="flex items-center justify-end gap-2.5 mb-4 relative z-10">
                <span className="text-xs text-stone-500 font-medium">Already have an account?</span>
                <button
                  type="button"
                  id="register-header-signin-btn"
                  onClick={() => onNavigate('/login')}
                  className="px-4 py-1.5 rounded-full border border-stone-800 text-stone-900 hover:bg-stone-900 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Sign in →
                </button>
              </div>

              <div className="grid grid-cols-12 gap-7 xl:gap-8 my-auto">
                
                {/* Left Side: Registration Form (7 of 12 cols) */}
                <div className="col-span-7 pr-1">
                  {renderRegisterForm(false)}
                </div>

                {/* Right Side: "YOUR BENEFITS" Panel (5 of 12 cols) */}
                <div className="col-span-5 bg-[#EFECE5] rounded-[28px] p-6 flex flex-col justify-between border border-stone-200/60 shadow-xs">
                  
                  {/* Benefits Eyebrow */}
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.25em] text-stone-600 uppercase leading-tight mb-5">
                      YOUR<br />
                      BENEFITS
                    </p>

                    {/* 4 Benefits Items */}
                    <div className="space-y-5">
                      {/* Benefit 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E2DFD8] text-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-4 h-4 fill-stone-800" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">Personalized AI Coaching</h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">Get insights based on your games</p>
                        </div>
                      </div>

                      {/* Benefit 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E2DFD8] text-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">Full Curriculum</h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">Learn from opening to endgame</p>
                        </div>
                      </div>

                      {/* Benefit 3 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E2DFD8] text-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <Crosshair className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">Tactical Puzzles</h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">Practice and develop key skills</p>
                        </div>
                      </div>

                      {/* Benefit 4 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E2DFD8] text-stone-800 flex items-center justify-center shrink-0 mt-0.5">
                          <BarChart2 className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">Progress Tracking</h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">Visualize your improvement</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carousel Indicator Dots & Next Arrow */}
                  <div className="flex items-center justify-between pt-6 border-t border-stone-300/40 mt-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-1.5 rounded-full bg-[#84CC16]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                    </div>

                    <button
                      type="button"
                      className="w-8 h-8 rounded-full border border-stone-300 bg-white flex items-center justify-center text-stone-700 hover:bg-stone-50 transition-all cursor-pointer shadow-xs"
                      aria-label="Next benefit"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>

              {/* Bottom Copyright */}
              <div className="text-[11px] text-stone-400 pt-4">
                © {new Date().getFullYear()} Chess Coach AI. All rights reserved.
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
