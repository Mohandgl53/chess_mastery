import React from 'react';
import { GameStatus, OpeningInfo } from '../../types/game';
import { PieceColor } from '../../types/chess';
import { Bot, AlertCircle, Trophy, BookOpen } from 'lucide-react';

interface GameStatusBannerProps {
  status: GameStatus;
  turn: PieceColor;
  playerColor: PieceColor;
  isAiThinking: boolean;
  opening?: OpeningInfo;
  className?: string;
}

export const GameStatusBanner: React.FC<GameStatusBannerProps> = ({
  status,
  turn,
  playerColor,
  isAiThinking,
  opening,
  className = ''
}) => {
  const isPlayerTurn = turn === playerColor;

  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm ${className}`}>
      {/* Left: Dynamic Game Status */}
      <div className="flex items-center gap-2">
        {isAiThinking ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs animate-pulse">
            <Bot className="w-4 h-4 animate-bounce" />
            <span>Chess Coach is thinking...</span>
          </div>
        ) : status === 'CHECK' ? (
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 animate-ping" />
            <span>Check!</span>
          </div>
        ) : status === 'CHECKMATE' ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Checkmate! Game Complete</span>
          </div>
        ) : status === 'STALEMATE' || status === 'DRAW_MATERIAL' || status === 'DRAW_REPETITION' ? (
          <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-semibold text-xs">
            <span>Draw ({status.replace('DRAW_', '').toLowerCase()})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPlayerTurn ? 'bg-[#81B64C] ring-4 ring-emerald-500/20' : 'bg-slate-400 dark:bg-zinc-600'
              }`}
            />
            <span>{isPlayerTurn ? 'Your Turn' : "Coach's Turn"}</span>
          </div>
        )}
      </div>

      {/* Right: Opening info pill */}
      {opening && (
        <div
          title={opening.description || opening.name}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-[#161B24] hover:bg-emerald-100 dark:hover:bg-[#1C2230] border border-emerald-200 dark:border-[#263345] text-emerald-800 dark:text-zinc-300 text-[11px] font-semibold transition-colors cursor-help max-w-[220px] truncate"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{opening.name}</span>
          {opening.variation && (
            <span className="text-slate-500 dark:text-zinc-500 text-[10px] hidden sm:inline truncate">
              • {opening.variation}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
