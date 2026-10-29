import React from 'react';
import { ChessPiece } from './ChessPiece';
import { PieceType } from '../../types/chess';

interface CapturedPiecesProps {
  captured: PieceType[]; // Pieces captured by this player (opponent's lost pieces)
  pieceColor: 'w' | 'b';
  materialAdvantage?: number; // e.g. +2
  className?: string;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  captured,
  pieceColor,
  materialAdvantage,
  className = ''
}) => {
  // Order pieces by standard value: p, n, b, r, q
  const pieceOrder: Record<PieceType, number> = {
    p: 1,
    n: 2,
    b: 3,
    r: 4,
    q: 5,
    k: 6
  };

  const sortedPieces = [...captured].sort((a, b) => pieceOrder[a] - pieceOrder[b]);

  return (
    <div className={`flex items-center gap-1 min-h-[24px] ${className}`}>
      <div className="flex items-center -space-x-1.5 flex-wrap">
        {sortedPieces.map((type, idx) => (
          <div key={idx} className="w-5 h-5 flex items-center justify-center">
            {/* The color of captured piece is OPPOSITE of player's color */}
            <ChessPiece type={type} color={pieceColor === 'w' ? 'b' : 'w'} className="w-4.5 h-4.5" />
          </div>
        ))}
      </div>

      {materialAdvantage !== undefined && materialAdvantage > 0 && (
        <span className="text-[11px] font-bold text-surface-600 ml-1">
          +{materialAdvantage}
        </span>
      )}
    </div>
  );
};
