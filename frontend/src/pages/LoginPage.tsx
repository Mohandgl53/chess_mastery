import React, { useState } from 'react';
import {
  Crown,
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
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../services/api/client';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  /** Redirect target after successful login (must be an internal path) */
  redirectTo?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, redirectTo }) => {
  const { login } = useAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSocialClick = (provider: string) => {
    setError(`${provider} sign-in is enabled for linked accounts. Please sign in with your email or register.`);
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
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
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
            onClick={() => setError('Password reset instructions will be sent to your registered email.')}
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

      {/* Social Login Buttons: Google & GitHub */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Google */}
        <button
          type="button"
          onClick={() => handleSocialClick('Google')}
          className="flex items-center justify-center gap-2.5 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 transition-all text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer shadow-2xs"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24">
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
          className="flex items-center justify-center gap-2.5 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 transition-all text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer shadow-2xs"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-stone-900" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>GitHub</span>
        </button>
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
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            title="Return to Landing Page"
          >
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-md border border-white/10 group-hover:border-[#A3E635]/50 transition-colors">
              <Crown className="w-4 h-4 fill-current group-hover:text-[#A3E635] transition-colors" />
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
                  className="flex items-center gap-3 text-left cursor-pointer group"
                  title="Return to Landing Page"
                >
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm group-hover:bg-stone-800 transition-colors">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-base font-extrabold text-stone-900 tracking-tight leading-none group-hover:text-stone-700 transition-colors">
                      Chess Coach
                    </h1>
                    <p className="text-[9.5px] font-bold tracking-[0.22em] text-stone-400 mt-1 uppercase">
                      PLAY. LEARN. IMPROVE.
                    </p>
                  </div>
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

                {/* Garry Kasparov Quote */}
                <div className="pt-2">
                  <div className="flex items-stretch gap-3">
                    <div className="w-1 bg-[#C0F22A] rounded-full self-stretch" />
                    <div>
                      <blockquote className="text-xs font-semibold text-stone-900">
                        “The more you learn, the more you see.”
                      </blockquote>
                      <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                        — Garry Kasparov
                      </p>
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
