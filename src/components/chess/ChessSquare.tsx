import React from 'react';
import { ChessPiece } from './ChessPiece';
import { PieceColor, PieceType, SquareName } from '../../types/chess';

interface ChessSquareProps {
  square: SquareName;
  isLight: boolean;
  piece?: { type: PieceType; color: PieceColor } | null;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCaptureTarget: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isInCheck: boolean;
  isHighlightedByCoach?: boolean;
  showFileCoordinate?: string;
  showRankCoordinate?: string;
  onSquareClick: (square: SquareName) => void;
  onSquareDragStart: (e: React.DragEvent, square: SquareName) => void;
  onSquareDragOver: (e: React.DragEvent) => void;
  onSquareDrop: (e: React.DragEvent, square: SquareName) => void;
}

/**
 * Chess.com standard Green & Cream square with precision indicators,
 * authentic legal move dots, capture rings, and opposing square-colored coordinates.
 */
export const ChessSquare: React.FC<ChessSquareProps> = ({
  square,
  isLight,
  piece,
  isSelected,
  isLegalTarget,
  isCaptureTarget,
  isLastMoveFrom,
  isLastMoveTo,
  isInCheck,
  isHighlightedByCoach,
  showFileCoordinate,
  showRankCoordinate,
  onSquareClick,
  onSquareDragStart,
  onSquareDragOver,
  onSquareDrop
}) => {
  // Chess.com standard Green & Cream tournament board
  let bgClass = isLight ? 'bg-[#EBECD0]' : 'bg-[#779556]';

  // Chess.com standard Move Highlights (warm olive & light lemon)
  if (isLastMoveFrom || isLastMoveTo) {
    bgClass = isLight ? 'bg-[#F5F682]' : 'bg-[#B9CA43]';
  }

  // Selected square highlight
  if (isSelected) {
    bgClass = isLight ? 'bg-[#F5F682]' : 'bg-[#B9CA43]';
  }

  // Coach / Tactical Highlight
  if (isHighlightedByCoach) {
    bgClass = 'bg-[#52D1B2]';
  }

  return (
    <div
      data-square={square}
      onClick={() => onSquareClick(square)}
      onDragOver={onSquareDragOver}
      onDrop={(e) => onSquareDrop(e, square)}
      className={`relative w-full h-full flex items-center justify-center cursor-pointer select-none transition-colors duration-75 ${bgClass}`}
      style={{ aspectRatio: '1/1' }}
      aria-label={`Square ${square}${piece ? `, containing ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
    >
      {/* Selected square inner accent indicator */}
      {isSelected && (
        <div className="absolute inset-0 ring-2 ring-inset ring-black/15 pointer-events-none z-10" />
      )}

      {/* King check danger (Chess.com red radial burst) */}
      {isInCheck && piece?.type === 'k' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.95)_0%,_rgba(220,38,38,0.7)_40%,_transparent_78%)] pointer-events-none z-15 animate-pulse" />
      )}

      {/* Rank coordinate (Chess.com: Top-left inside square with opposing square color) */}
      {showRankCoordinate && (
        <span
          className={`absolute top-0.5 left-1 text-[11px] font-bold select-none leading-none font-sans z-10 ${
            isLight ? 'text-[#779556]' : 'text-[#EBECD0]'
          }`}
        >
          {showRankCoordinate}
        </span>
      )}

      {/* File coordinate (Chess.com: Bottom-right inside square with opposing square color) */}
      {showFileCoordinate && (
        <span
          className={`absolute bottom-0.5 right-1 text-[11px] font-bold select-none leading-none font-sans z-10 ${
            isLight ? 'text-[#779556]' : 'text-[#EBECD0]'
          }`}
        >
          {showFileCoordinate}
        </span>
      )}

      {/* Piece */}
      {piece && (
        <div
          draggable
          onDragStart={(e) => onSquareDragStart(e, square)}
          className="w-[88%] h-[88%] flex items-center justify-center cursor-grab active:cursor-grabbing z-20 hover:scale-[1.03] active:scale-110 transition-transform duration-75"
        >
          <ChessPiece type={piece.type} color={piece.color} />
        </div>
      )}

      {/* Legal Move Dot (Empty Square) - Chess.com 33% dark circular dot */}
      {isLegalTarget && !isCaptureTarget && !piece && (
        <div className="absolute w-[33%] h-[33%] bg-black/20 rounded-full pointer-events-none z-30" />
      )}

      {/* Capture Target Ring (Occupied Square) - Chess.com 4-5px dark hollow ring */}
      {(isCaptureTarget || (isLegalTarget && piece)) && (
        <div className="absolute inset-[3px] rounded-full border-[5px] border-black/20 pointer-events-none z-30" />
      )}
    </div>
  );
};
