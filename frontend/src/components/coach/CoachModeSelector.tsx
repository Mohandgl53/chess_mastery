import React from 'react';
import { CoachMode } from '../../types/coach';

interface CoachModeSelectorProps {
  mode: CoachMode;
  onChangeMode: (mode: CoachMode) => void;
  className?: string;
}

export const CoachModeSelector: React.FC<CoachModeSelectorProps> = ({
  mode,
  onChangeMode,
  className = ''
}) => {
  const modes: { id: CoachMode; label: string; description: string }[] = [
    { id: 'FULL_COACHING', label: 'Full Coaching', description: 'Real-time feedback on every key move' },
    { id: 'IMPORTANT_MISTAKES', label: 'Mistakes Only', description: 'Alerts only on blunders and inaccuracies' },
    { id: 'HINTS_ONLY', label: 'Hints Only', description: 'Silent unless you ask for assistance' },
    { id: 'POST_GAME_ONLY', label: 'Post-Game', description: 'Full game review after completion' }
  ];

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#12151B] rounded-xl border border-slate-200 dark:border-[#222733] ${className}`}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChangeMode(m.id)}
          title={m.description}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center truncate ${
            mode === m.id
              ? 'bg-white dark:bg-[#273042] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-transparent'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};
