import React from 'react';
import { ChessPiece } from './ChessPiece';
import { PieceColor, PieceType } from '../../types/chess';

interface PromotionModalProps {
  color: PieceColor;
  isOpen: boolean;
  onSelectPiece: (piece: PieceType) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  color,
  isOpen,
  onSelectPiece,
  onCancel
}) => {
  if (!isOpen) return null;

  const pieces: { type: PieceType; label: string }[] = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-5 shadow-2xl border border-surface-200 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
        <h3 className="text-base font-bold text-surface-900 text-center mb-1">
          Promote Pawn
        </h3>
        <p className="text-xs text-surface-500 text-center mb-4">
          Choose a piece to replace your pawn
        </p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelectPiece(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-50 border border-surface-200 hover:border-brand-500 hover:bg-brand-50 transition-all hover:scale-105 active:scale-95 group"
            >
              <div className="w-12 h-12 mb-1">
                <ChessPiece type={type} color={color} />
              </div>
              <span className="text-xs font-semibold text-surface-700 group-hover:text-brand-600">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 text-xs font-semibold text-surface-500 hover:text-surface-800 transition-colors text-center"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
