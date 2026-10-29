import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '../../types/chess';
import { CheckCircle2, AlertCircle, AlertTriangle, BookOpen } from 'lucide-react';

interface MoveHistoryProps {
  moves: MoveRecord[];
  activeMoveIndex?: number;
  onSelectMove?: (index: number) => void;
  className?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  activeMoveIndex,
  onSelectMove,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs (White move, Black move)
  const movePairs: { moveNumber: number; white?: MoveRecord; black?: MoveRecord }[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const pairIndex = Math.floor(i / 2);
    if (!movePairs[pairIndex]) {
      movePairs[pairIndex] = {
        moveNumber: pairIndex + 1,
        white: undefined,
        black: undefined
      };
    }
    if (move.color === 'w') {
      movePairs[pairIndex].white = move;
    } else {
      movePairs[pairIndex].black = move;
    }
  }

  // Auto-scroll to bottom on new moves
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length, activeMoveIndex]);

  const getBadgeIcon = (cls?: MoveRecord['classification']) => {
    switch (cls) {
      case 'BEST':
      case 'EXCELLENT':
        return <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />;
      case 'BOOK':
        return <BookOpen className="w-2.5 h-2.5 text-sky-400" />;
      case 'INACCURACY':
        return <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />;
      case 'MISTAKE':
      case 'BLUNDER':
        return <AlertCircle className="w-2.5 h-2.5 text-rose-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto max-h-56 pr-1 font-mono text-xs select-none ${className}`}
    >
      {movePairs.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-zinc-500 text-xs font-sans">
          No moves played yet.
        </div>
      ) : (
        <div className="space-y-0.5">
          {movePairs.map((pair, index) => {
            const whiteIndex = index * 2;
            const blackIndex = index * 2 + 1;
            const isWhiteActive = activeMoveIndex === whiteIndex;
            const isBlackActive = activeMoveIndex === blackIndex;

            return (
              <div
                key={pair.moveNumber}
                className="grid grid-cols-[2rem_1fr_1fr] items-center px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A1E27] transition-colors"
              >
                {/* Move Number */}
                <span className="text-slate-400 dark:text-zinc-500 font-semibold text-[11px] tabular-nums">
                  {pair.moveNumber}.
                </span>

                {/* White Move */}
                {pair.white ? (
                  <button
                    onClick={() => onSelectMove && onSelectMove(whiteIndex)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-left font-semibold transition-colors ${
                      isWhiteActive
                        ? 'bg-[#81B64C] text-white font-black shadow-xs'
                        : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-[#252A36]'
                    }`}
                  >
                    <span>{pair.white.san}</span>
                    {getBadgeIcon(pair.white.classification)}
                  </button>
                ) : (
                  <span />
                )}

                {/* Black Move */}
                {pair.black ? (
                  <button
                    onClick={() => onSelectMove && onSelectMove(blackIndex)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-left font-semibold transition-colors ${
                      isBlackActive
                        ? 'bg-[#81B64C] text-white font-black shadow-xs'
                        : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-[#252A36]'
                    }`}
                  >
                    <span>{pair.black.san}</span>
                    {getBadgeIcon(pair.black.classification)}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
