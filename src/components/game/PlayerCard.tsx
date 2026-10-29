import React from 'react';
import { PieceColor, PieceType } from '../../types/chess';
import { CapturedPieces } from '../chess/CapturedPieces';
import { Bot, User, Clock } from 'lucide-react';

interface PlayerCardProps {
  name: string;
  rating: number;
  color: PieceColor;
  isAi?: boolean;
  isActiveTurn: boolean;
  timeRemainingSeconds?: number;
  capturedPieces: PieceType[];
  materialAdvantage?: number;
  statusText?: string;
  avatar?: string;
  className?: string;
}

/**
 * Chess.com-style live player card with high-contrast digital clock,
 * captured pieces display, rating chip, and active turn highlights.
 */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  rating,
  color,
  isAi = false,
  isActiveTurn,
  timeRemainingSeconds,
  capturedPieces,
  materialAdvantage,
  statusText,
  avatar,
  className = ''
}) => {
  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemainingSeconds !== undefined && timeRemainingSeconds < 30;

  return (
    <div
      className={`flex items-center justify-between px-3.5 py-1.5 rounded-xl border transition-all duration-150 min-h-[50px] h-[50px] shrink-0 overflow-hidden ${
        isActiveTurn
          ? 'bg-emerald-50/80 dark:bg-[#1E2533] border-emerald-500/80 dark:border-emerald-500/70 shadow-md ring-2 ring-emerald-500/20'
          : 'bg-white dark:bg-[#161B26] border-slate-200 dark:border-[#273042] text-slate-600 dark:text-zinc-400 shadow-xs'
      } ${className}`}
    >
      {/* Left: Avatar & Player Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden ${
            isAi
              ? 'bg-gradient-to-tr from-[#81B64C] to-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-blue-600 text-white shadow-blue-500/20'
          }`}
        >
          {avatar ? (
            avatar.startsWith('http') || avatar.startsWith('data:') ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base">{avatar}</span>
            )
          ) : isAi ? (
            <Bot className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
              {name}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#252C3D] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#323B50]">
              {rating}
            </span>
          </div>

          {/* Captured pieces & material delta */}
          <div className="flex items-center gap-2 mt-0.5">
            <CapturedPieces
              captured={capturedPieces}
              pieceColor={color}
              materialAdvantage={materialAdvantage}
            />
            {statusText && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                {statusText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Chess.com style digital clock */}
      {timeRemainingSeconds !== undefined && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors tabular-nums ${
            isLowTime
              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
              : isActiveTurn
              ? 'bg-slate-900 dark:bg-[#222938] text-white border-slate-900 dark:border-zinc-500/40 shadow-xs'
              : 'bg-slate-100 dark:bg-[#141822] text-slate-700 dark:text-zinc-400 border-slate-200 dark:border-[#273042]'
          }`}
        >
          <Clock className={`w-3 h-3 ${isActiveTurn ? 'text-white' : 'text-slate-500 dark:text-zinc-400'}`} />
          <span>{formatTime(timeRemainingSeconds)}</span>
        </div>
      )}
    </div>
  );
};
