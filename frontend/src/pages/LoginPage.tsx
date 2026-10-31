import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  BarChart2,
  BookOpen,
  Crosshair,
  Users,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ChessMasteryLogo } from '../components/brand/ChessMasteryLogo';
import { useAuth } from '../auth/AuthProvider';
import { authApi } from '../services/api/authApi';
import { ApiError } from '../services/api/client';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  /** Redirect target after successful login (must be an internal path) */
  redirectTo?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, redirectTo }) => {
  const { login, googleLogin } = useAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      eyebrow: 'THINK\nANALYZE\nIMPROVE\nREPEAT',
      titleFirst: 'Every',
      titleSecond: 'Move',
      titleAccent: 'Matters.',
      description: 'Get real-time feedback, master key concepts, and develop your chess intuition with AI-powered coaching.',
    },
    {
      eyebrow: 'EVALUATE\nCALCULATE\nEXECUTE\nWIN',
      titleFirst: 'Master',
      titleSecond: 'The',
      titleAccent: 'Endgame.',
      description: 'Convert advantages into victories with deep positional precision and targeted blunder mitigation.',
    },
    {
      eyebrow: 'DISCOVER\nPRACTICE\nSHARPEN\nDOMINATE',
      titleFirst: 'Tactical',
      titleSecond: 'Vision',
      titleAccent: 'Unlocked.',
      description: 'Solve thousands of curated tactical motifs derived directly from grandmaster masterclasses.',
    },
    {
      eyebrow: 'LEARN\nADAPT\nEVOLVE\nSUCCEED',
      titleFirst: 'Grandmaster',
      titleSecond: 'AI',
      titleAccent: 'Mentor.',
      description: 'Personalized curriculum curated specifically for your rating tier and tactical blind spots.',
    },
  ];

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);

    if (authMethod === 'phone') {
      if (!phoneNumber.trim()) {
        setError('Phone number is required.');
        return;
      }
      setError('SMS login is currently in beta. Please sign in with your email address.');
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      const target = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      onNavigate(target);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Invalid email or password.');
        } else if (err.code === 'EMAIL_NOT_VERIFIED' || (err.status === 403 && err.message.toLowerCase().includes('verif'))) {
          setIsUnverified(true);
          setError('Your email is not verified yet. Please check your inbox or click "Resend verification" below.');
        } else if (err.status === 0) {
          setError('Cannot connect to server. Please check your connection.');
        } else {
          setError(err.message || 'Sign in failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Please enter your email in the field above, then click Resend.');
      return;
    }
    try {
      setIsResendingVerification(true);
      setError(null);
      setSuccessMessage(null);
      const res = await authApi.resendVerification(email.trim().toLowerCase());
      setSuccessMessage(res.message || 'A fresh verification link has been sent to your email.');
      setIsUnverified(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSocialClick = async (provider: string) => {
    if (provider === 'Google') {
      try {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        const googleObj = (window as any).google;
        if (googleObj?.accounts?.id) {
          googleObj.accounts.id.prompt();
          return;
        }
        setError('Google Sign-In is enabled on the backend. Please configure your Google Client ID or use email login.');
      } catch (err: any) {
        setError(err?.message || 'Google sign-in failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(`${provider} sign-in is enabled for linked accounts. Please sign in with your email or register.`);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email in the field above, then click Forgot password.');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      const res = await authApi.forgotPassword(email);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  // The reusable login card: tailored for mobile compactness (< lg) and large grandeur on desktop (≥ lg)
  const renderLoginCard = (isMobile = false) => (
    <div
      className={`bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_30px_85px_rgba(0,0,0,0.28)] border border-stone-200/90 w-full transition-all ${
        isMobile
          ? 'p-5 sm:p-7 max-w-[380px] sm:max-w-[420px]'
          : 'p-8 sm:p-10 xl:p-12 max-w-[480px] sm:max-w-[510px] xl:max-w-[535px]'
      }`}
    >
      {/* Email / Phone Tab Pill Switcher */}
      <div className={`inline-flex bg-[#F2EFE9] p-1.5 rounded-full ${isMobile ? 'mb-4' : 'mb-7'}`}>
        <button
          type="button"
          onClick={() => {
            setAuthMethod('email');
            setError(null);
          }}
          className={`flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            authMethod === 'email'
              ? 'bg-[#181C1A] text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMethod('phone');
            setError(null);
          }}
          className={`flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
            authMethod === 'phone'
              ? 'bg-[#181C1A] text-white shadow-sm font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Phone</span>
        </button>
      </div>

      {/* Card Title */}
      <div className={isMobile ? 'mb-4' : 'mb-7'}>
        <h2
          className={`font-black text-stone-900 tracking-tight leading-tight ${
            isMobile ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[30px]'
          }`}
        >
          Welcome back
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1.5 font-normal">
          Sign in to continue your chess journey.
        </p>
      </div>

      {/* Login Form */}
      <form id="login-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
            {isUnverified && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/60">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isResendingVerification ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  <span>Resend Verification Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)}
                  className="text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                >
                  Verification Page &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {authMethod === 'email' ? (
          /* Email Address Input */
          <div>
            <label htmlFor="login-email" className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">
              Email address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm xl:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          /* Phone Number Input */
          <div>
            <label htmlFor="login-phone" className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">
              Phone number
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
              <input
                id="login-phone"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm xl:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Password Input */}
        <div>
          <label htmlFor="login-password" className="block text-xs sm:text-sm font-bold text-stone-700 mb-1.5">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="w-full pl-11 pr-11 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-stone-200 bg-[#FAF9F6] text-xs sm:text-sm xl:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="button"
              id="login-show-password"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={rememberMe}
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                rememberMe ? 'bg-[#181C1A] text-white' : 'border border-stone-300 bg-white'
              }`}
            >
              {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span className="text-stone-700 font-medium">Remember me</span>
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-stone-600 hover:text-stone-900 font-semibold transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In Button */}
        <button
          id="login-submit"
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 sm:py-4 px-5 bg-[#181C1A] hover:bg-black disabled:bg-stone-600 text-white text-xs sm:text-sm xl:text-base font-bold rounded-xl sm:rounded-2xl transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-2.5 mt-2 cursor-pointer transform active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className={`relative ${isMobile ? 'my-3.5' : 'my-6'}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-[10.5px]">
          <span className="bg-white px-3 text-stone-400 font-bold tracking-wider uppercase">
            or continue with
          </span>
        </div>
      </div>

      {/* Social Login Buttons: Google only */}
      <div className="flex items-center justify-center">
        {/* Google */}
        <GoogleSignInButton
          text="signin_with"
          disabled={isLoading}
          onSuccess={() => {
            const target = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
            onNavigate(target);
          }}
          onError={(msg) => setError(msg)}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0E1012] font-sans selection:bg-[#BEF264] selection:text-black">
      
      {/* ========================================================================= */}
      {/* MOBILE / TABLET VIEW (< lg): Fit-to-Screen Native Experience (NO SCROLL)  */}
      {/* ========================================================================= */}
      <div className="lg:hidden min-h-screen h-screen flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden bg-[#090D0B] text-white">
        
        {/* Background Cinematic Knight Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="/images/login-knight.jpg"
            alt="Chess Knight"
            className="w-full h-full object-cover object-center scale-105 brightness-[0.75] contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090D0B] via-[#090D0B]/60 to-[#090D0B]/85" />
          <div className="absolute inset-0 bg-radial-at-tr from-[#A3E635]/15 via-transparent to-transparent mix-blend-screen" />
        </div>

        {/* Top Header Row on Mobile */}
        <div className="relative z-10 flex items-center justify-between gap-3 shrink-0 pt-1">
          {/* Logo & Tagline - Clickable to return to Landing */}
          <button
            type="button"
            onClick={() => onNavigate('/landing')}
            className="cursor-pointer group"
            title="Return to Landing Page"
          >
            <ChessMasteryLogo size="sm" lightText={true} />
          </button>

          {/* Actions: Back to Home & Create Account */}
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
              onClick={() => onNavigate('/register')}
              className="px-3.5 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-xs text-white hover:bg-white hover:text-black transition-all text-xs font-semibold cursor-pointer"
            >
              Create account
            </button>
          </div>
        </div>

        {/* Centerpiece: The White Login Card (Centered on Mobile Screen) */}
        <div className="relative z-10 my-auto py-2 flex items-center justify-center w-full">
          {renderLoginCard(true)}
        </div>

        {/* Bottom Social Proof Pill on Mobile */}
        <div className="relative z-10 shrink-0 pb-1 flex justify-center">
          <div className="inline-flex items-center gap-2.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-full py-1.5 px-3 max-w-fit shadow-lg">
            <div className="flex -space-x-1.5">
              <img
                className="inline-block h-5 w-5 rounded-full ring-1.5 ring-black object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"
                alt="Learner avatar"
              />
              <img
                className="inline-block h-5 w-5 rounded-full ring-1.5 ring-black object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces"
                alt="Learner avatar"
              />
              <img
                className="inline-block h-5 w-5 rounded-full ring-1.5 ring-black object-cover"
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces"
                alt="Learner avatar"
              />
            </div>
            <span className="text-[11px] font-medium text-stone-300">
              Join 10K+ chess learners improving daily • <span className="text-[#FBBF24]">4.8 ★</span>
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (≥ lg): Exact Dual-Card Layout with Centered Floating Modal  */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-5 xl:p-8">
        <div className="w-full max-w-[1580px] xl:max-w-[1640px] relative">
          
          <div className="grid grid-cols-2 gap-6 xl:gap-8 min-h-[880px]">
            
            {/* ===================================================================== */}
            {/* CARD 1: Warm Cream Card (#F4F3EE) with rounded-[32px] corners         */}
            {/* ===================================================================== */}
            <div className="bg-[#F4F3EE] rounded-[32px] p-8 xl:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              
              {/* Top Bar: Brand Logo on left, "Back to Home" + "New here? Create account" on right */}
              <div className="flex items-center justify-between gap-4 relative z-10">
                {/* Logo - Clickable to return to Landing */}
                <button
                  type="button"
                  onClick={() => onNavigate('/landing')}
                  className="cursor-pointer group"
                  title="Return to Landing Page"
                >
                  <ChessMasteryLogo size="md" lightText={false} />
                </button>

                {/* Right actions: Back to Home + Create Account */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/landing')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 border border-stone-300/80 transition-all cursor-pointer"
                    title="Return to Landing Page"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Home</span>
                  </button>
                  <div className="h-4 w-px bg-stone-300/80" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-medium">New here?</span>
                    <button
                      type="button"
                      id="login-create-account-btn"
                      onClick={() => onNavigate('/register')}
                      className="px-4 py-1.5 rounded-full border border-stone-800 text-stone-900 hover:bg-stone-900 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                    >
                      Create account
                    </button>
                  </div>
                </div>
              </div>

              {/* Left Content Area */}
              <div className="my-auto max-w-[310px] xl:max-w-[350px] space-y-6 relative z-10">
                
                {/* Eyebrow & Hero Title */}
                <div>
                  <span className="text-[10px] font-bold tracking-[0.25em] text-stone-500 uppercase block mb-2">
                    YOUR AI CHESS MENTOR
                  </span>
                  <h2 className="text-3xl sm:text-4xl xl:text-[44px] font-black text-stone-900 leading-[1.05] tracking-tight">
                    Better<br />
                    Chess<br />
                    Starts Here<span className="text-[#9FE824]">.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 mt-3 font-normal leading-relaxed">
                    Play, learn, solve, and improve with personalized AI coaching.
                  </p>
                </div>

                {/* 4 Feature Items */}
                <div className="space-y-3.5 pt-1">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8E5DD] text-stone-800 flex items-center justify-center shrink-0">
                      <BarChart2 className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 leading-snug">Personalized Learning</h3>
                      <p className="text-[11px] text-stone-500">Tailored to your skill level</p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8E5DD] text-stone-800 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 leading-snug">Tactical Puzzles</h3>
                      <p className="text-[11px] text-stone-500">Sharpen your instincts</p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8E5DD] text-stone-800 flex items-center justify-center shrink-0">
                      <Crosshair className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 leading-snug">Game Analysis</h3>
                      <p className="text-[11px] text-stone-500">Learn from your mistakes</p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8E5DD] text-stone-800 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 leading-snug">Track Your Progress</h3>
                      <p className="text-[11px] text-stone-500">See real improvement</p>
                    </div>
                  </div>
                </div>

                {/* Live Position Calibration Metric */}
                <div className="pt-2">
                  <div className="flex items-center gap-3 bg-stone-200/60 p-3 rounded-2xl border border-stone-300/50">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-black text-xs text-stone-800 shadow-2xs">
                      ELO
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">Dynamic Calibration</div>
                      <div className="text-[11px] text-stone-500 font-medium">Adapts move evaluation to your current tier</div>
                    </div>
                  </div>
                </div>

                {/* 3 Pagination Dots */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-stone-900" />
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                </div>
              </div>

              {/* Bottom Left Copyright */}
              <div className="text-[11px] text-stone-400 relative z-10">
                © {new Date().getFullYear()} Chess Coach AI. All rights reserved.
              </div>
            </div>

            {/* ===================================================================== */}
            {/* CARD 2: Dark Cinematic Knight Card (#090D0B) with rounded-[32px]      */}
            {/* ===================================================================== */}
            <div className="bg-[#090D0B] rounded-[32px] p-8 xl:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden text-white">
              
              {/* Background Knight Image & Volumetric Light Overlays */}
              <div className="absolute inset-0 pointer-events-none">
                <img
                  src="/images/login-knight.jpg"
                  alt="Chess Knight"
                  className="w-full h-full object-cover object-center scale-105 transform brightness-[0.88] contrast-110"
                />
                {/* Dark atmospheric gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D0B] via-[#080D0B]/35 to-[#080D0B]/70" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080D0B]/80 via-transparent to-transparent" />
              </div>

              {/* Top Row: Micro-copy on left, 01 / 04 and Arrows on right */}
              <div className="relative z-10 flex items-start justify-between">
                {/* Micro-copy */}
                <div>
                  <p className="text-[9.5px] font-extrabold tracking-[0.25em] text-white/90 leading-tight uppercase">
                    THINK<br />
                    ANALYZE<br />
                    IMPROVE<br />
                    REPEAT
                  </p>
                  <div className="w-10 h-[1.5px] bg-white/70 mt-2" />
                </div>

                {/* Slider Counter & Navigation Arrows */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium text-white/70 tracking-wider">
                    0{currentSlide + 1} / 0{slides.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="w-7 h-7 rounded-full border border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white/80 hover:text-white hover:border-white/50 transition-all cursor-pointer"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="w-7 h-7 rounded-full border border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white/80 hover:text-white hover:border-white/50 transition-all cursor-pointer"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Hero Headline & Description */}
              <div className="relative z-10 my-auto py-8 xl:py-12 space-y-3.5 max-w-[320px] xl:max-w-[360px] ml-auto">
                <h2 className="text-3xl sm:text-4xl xl:text-[44px] font-black leading-[1.05] tracking-tight text-white">
                  {slides[currentSlide].titleFirst}<br />
                  {slides[currentSlide].titleSecond}<br />
                  <span className="text-[#C6F535]">{slides[currentSlide].titleAccent}</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
                  {slides[currentSlide].description}
                </p>
              </div>

              {/* Bottom Right Section: Glassmorphic Stats Card + Avatars Social Proof Pill */}
              <div className="relative z-10 space-y-3.5 max-w-[360px] ml-auto w-full">
                
                {/* Glassmorphic Stats Card */}
                <div className="bg-[#111A14]/75 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-white/90">
                    <BarChart2 className="w-3.5 h-3.5 text-[#A3E635]" />
                    <span className="tracking-wide text-[11.5px]">Join a growing community</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 divide-x divide-white/10 text-left">
                    <div className="pr-2">
                      <div className="text-base sm:text-lg font-black text-white leading-none">10K+</div>
                      <div className="text-[10px] text-stone-400 mt-1 font-medium">Active Learners</div>
                    </div>
                    <div className="px-2">
                      <div className="text-base sm:text-lg font-black text-white leading-none">500K+</div>
                      <div className="text-[10px] text-stone-400 mt-1 font-medium">Puzzles Solved</div>
                    </div>
                    <div className="pl-2">
                      <div className="text-base sm:text-lg font-black text-white leading-none flex items-center gap-1">
                        <span>4.8</span>
                        <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                      </div>
                      <div className="text-[10px] text-stone-400 mt-1 font-medium">User Rating</div>
                    </div>
                  </div>
                </div>

                {/* Avatars Social Proof Pill */}
                <div className="inline-flex items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-1.5 px-3 max-w-fit">
                  <div className="flex -space-x-2">
                    <img
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#090D0B] object-cover"
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"
                      alt="Learner avatar"
                    />
                    <img
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#090D0B] object-cover"
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces"
                      alt="Learner avatar"
                    />
                    <img
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-[#090D0B] object-cover"
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces"
                      alt="Learner avatar"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-stone-300 pr-1">
                    Join thousands of chess learners improving every day.
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* DESKTOP (≥ lg): FLOATING LOGIN CARD DEAD CENTER BETWEEN BOTH CARDS */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            {renderLoginCard(false)}
          </div>

        </div>
      </div>

    </div>
  );
};
