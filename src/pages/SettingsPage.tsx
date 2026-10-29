import React, { useState } from 'react';
import { sounds } from '../utils/soundEffects';
import { CoachMode } from '../types/coach';
import { useTheme } from '../context/ThemeContext';
import {
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Eye,
  Sun,
  Moon,
  Palette
} from 'lucide-react';

interface SettingsPageProps {
  onBackToPlay?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.getSoundEnabled());
  const [coachMode, setCoachMode] = useState<CoachMode>('FULL_COACHING');
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showLegalDots, setShowLegalDots] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setSoundEnabled(next);
    if (next) sounds.playMove();
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-[#1E222B]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-black text-[#81B64C] dark:text-emerald-400 uppercase tracking-wider">
            Preferences & Configuration
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Customize your visual theme, coach interaction depth, and acoustic sound effects.
        </p>
      </div>

      <div className="space-y-5">
        {/* Section 0: Visual Theme (Light / Dark) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#81B64C]" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Interface Theme</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {theme === 'light' ? 'Light Mode Active' : 'Dark Mode Active'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Switch between crisp daytime colors and comfortable warm dark styling.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Light Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                theme === 'light'
                  ? 'bg-emerald-50/80 border-[#81B64C] text-slate-900 ring-2 ring-emerald-500/30 shadow-md'
                  : 'bg-slate-50 dark:bg-[#14171E] border-slate-200 dark:border-[#273042] text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#202738]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 dark:text-white">Vibrant Light Mode</div>
                  {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-[#81B64C]" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                  Clean white & light slate canvas with vivid emerald action buttons and rich gold badges.
                </div>
              </div>
            </button>

            {/* Dark Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                theme === 'dark'
                  ? 'bg-[#1E2533] border-[#81B64C] text-white ring-2 ring-emerald-500/30 shadow-md'
                  : 'bg-slate-50 dark:bg-[#14171E] border-slate-200 dark:border-[#273042] text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#202738]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-900/60 text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 dark:text-white">Warm Charcoal Dark Mode</div>
                  {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-[#81B64C]" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                  Deep slate (#12151B) with emerald glow accents and high-contrast tournament board.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 1: AI Coach Verbosity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#81B64C]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Coach Feedback Intensity</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Control how frequently the AI Coach interrupts with pedagogical comments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {[
              { id: 'FULL_COACHING', title: 'Full Live Coaching', desc: 'Real-time tips, opening principles, and tactical opportunities.' },
              { id: 'IMPORTANT_MISTAKES', title: 'Important Mistakes Only', desc: 'Alerts you only on major blunders and significant inaccuracies.' },
              { id: 'HINTS_ONLY', title: 'Hints on Demand Only', desc: 'Completely silent until you press the Hint button.' },
              { id: 'POST_GAME_ONLY', title: 'Post-Game Review Only', desc: 'Zero in-game commentary; full comprehensive review at the end.' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setCoachMode(m.id as CoachMode)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  coachMode === m.id
                    ? 'bg-emerald-50 dark:bg-[#252C3D] border-[#81B64C] text-slate-900 dark:text-white ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#14171E] border-slate-200 dark:border-[#1E222B] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A1E27]'
                }`}
              >
                <div className="text-xs font-black text-slate-900 dark:text-white mb-0.5">{m.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Audio Settings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#161922] border border-slate-200 dark:border-[#262B36] flex items-center justify-center text-slate-800 dark:text-zinc-200 shadow-xs">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Chess.com Sound Effects</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Acoustic wooden "thock" synthesizer for piece moves, captures, checks, and victories.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#81B64C] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-[#161922] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#262B36] hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? 'Enabled' : 'Muted'}
          </button>
        </div>

        {/* Section 3: Board Display Options */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#81B64C]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Board Display Options</h3>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] cursor-pointer hover:border-slate-400 dark:hover:border-zinc-600 transition-colors">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Show Algebraic Coordinates (1-8, a-h)
              </span>
              <input
                type="checkbox"
                checked={showCoordinates}
                onChange={(e) => setShowCoordinates(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] cursor-pointer hover:border-slate-400 dark:hover:border-zinc-600 transition-colors">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Highlight Legal Move Targets & Captures (Chess.com dots)
              </span>
              <input
                type="checkbox"
                checked={showLegalDots}
                onChange={(e) => setShowLegalDots(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved!</span>
            </span>
          )}
          <button
            onClick={handleSave}
            className="chess-btn-green px-6 py-2.5 rounded-xl text-white text-xs font-black transition-all shadow-xs cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
