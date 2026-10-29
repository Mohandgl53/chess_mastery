import React, { useState } from 'react';
import { RotateCcw, Lightbulb, ArrowUpDown, PlusCircle, Flag, Settings as SettingsIcon } from 'lucide-react';

interface GameControlsProps {
  canUndo: boolean;
  isAiThinking: boolean;
  onUndo: () => void;
  onHint: () => void;
  onFlipBoard: () => void;
  onNewGame: () => void;
  onResign: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

/**
 * Chess.com-style game controls toolbar.
 */
export const GameControls: React.FC<GameControlsProps> = ({
  canUndo,
  isAiThinking,
  onUndo,
  onHint,
  onFlipBoard,
  onNewGame,
  onResign,
  onOpenSettings,
  className = ''
}) => {
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  return (
    <div className={`flex items-center justify-between gap-1.5 p-1.5 bg-white dark:bg-[#1A1F2B] rounded-xl border border-slate-200 dark:border-[#273042] shadow-sm ${className}`}>
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isAiThinking}
        title="Undo Move"
        aria-label="Undo Move"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252C3D] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Undo</span>
      </button>

      {/* Hint Button */}
      <button
        onClick={onHint}
        disabled={isAiThinking}
        title="Get AI Coach Hint"
        aria-label="Get AI Coach Hint"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 transition-all shadow-xs"
      >
        <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
        <span>Hint</span>
      </button>

      {/* Flip Board */}
      <button
        onClick={onFlipBoard}
        title="Flip Board Orientation"
        aria-label="Flip Board Orientation"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252C3D] transition-all"
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Flip</span>
      </button>

      {/* Resign (with safety confirmation) */}
      {showResignConfirm ? (
        <div className="flex items-center gap-1 animate-in fade-in duration-150">
          <button
            onClick={() => {
              onResign();
              setShowResignConfirm(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowResignConfirm(false)}
            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252C3D] transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowResignConfirm(true)}
          disabled={isAiThinking}
          title="Resign Game"
          aria-label="Resign Game"
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Resign</span>
        </button>
      )}

      {/* New Game */}
      <button
        onClick={onNewGame}
        title="Start New Game"
        aria-label="Start New Game"
        className="chess-btn-green flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>New Game</span>
      </button>

      {/* Settings trigger */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          title="Game Settings"
          aria-label="Game Settings"
          className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252C3D] transition-all"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
