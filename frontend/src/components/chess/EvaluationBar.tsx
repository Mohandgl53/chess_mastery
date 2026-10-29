import React from 'react';
import { EvaluationData } from '../../types/chess';

interface EvaluationBarProps {
  evaluation: EvaluationData;
  orientation?: 'white' | 'black';
  className?: string;
}

/**
 * Chess.com-style vertical evaluation bar.
 * Features high-contrast white & dark charcoal partitions with smooth transitions
 * and clear numerical evaluation display.
 */
export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  evaluation,
  orientation = 'white',
  className = ''
}) => {
  const { score, isMate, mateIn, label } = evaluation;

  // Clamp evaluation between -10 and +10 for visual bar calculation
  let clampedScore = Math.max(-10, Math.min(10, score));
  if (isMate) {
    clampedScore = score > 0 ? 10 : -10;
  }

  // Percentage for white (50% is equal)
  // Score +10 => 96%, Score -10 => 4%, Score 0 => 50%
  const whitePercent = Math.max(4, Math.min(96, 50 + (clampedScore / 10) * 46));
  const blackPercent = 100 - whitePercent;

  const displayScore = isMate
    ? `M${mateIn || 1}`
    : score > 0
    ? `+${score.toFixed(1)}`
    : score === 0
    ? '0.0'
    : score.toFixed(1);

  return (
    <div className={`flex flex-col items-center select-none shrink-0 ${className}`}>
      {/* Label Badge */}
      <div className="mb-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#161922] text-zinc-300 border border-[#262B36] shrink-0">
        {label}
      </div>

      {/* Vertical Bar - Chess.com dimensions & styling */}
      <div className="relative w-5 flex-1 min-h-[340px] rounded-md overflow-hidden bg-[#262421] border border-[#262B36] shadow-xl flex flex-col justify-between">
        {/* Black side (top if white orientation) */}
        <div
          className="w-full bg-[#262421] transition-all duration-400 ease-out"
          style={{
            height: `${orientation === 'white' ? blackPercent : whitePercent}%`
          }}
        />

        {/* White side (bottom if white orientation) */}
        <div
          className="w-full bg-[#FFFFFF] transition-all duration-400 ease-out"
          style={{
            height: `${orientation === 'white' ? whitePercent : blackPercent}%`
          }}
        />

        {/* Score text overlay with adaptive contrast */}
        <div
          className={`absolute left-0 right-0 text-[10px] font-mono font-black text-center pointer-events-none transition-all duration-400 tabular-nums ${
            score >= 0 ? 'bottom-2 text-[#262421]' : 'top-2 text-white'
          }`}
        >
          {displayScore}
        </div>
      </div>

      {/* Engine Source Badge */}
      <div
        className={`mt-1.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded border transition-colors ${
          evaluation.source === 'heuristic'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}
        title={
          evaluation.source === 'heuristic'
            ? 'Positional heuristic active while Stockfish initializes'
            : `Stockfish 16 Lite Active (Depth ${evaluation.depth ?? 12})`
        }
        data-testid="engine-source-pill"
      >
        {evaluation.source === 'heuristic' ? '⚡ Heuristic' : '🐟 Stockfish'}
      </div>
    </div>
  );
};
