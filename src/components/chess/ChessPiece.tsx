import React from 'react';
import { PieceColor, PieceType } from '../../types/chess';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

/**
 * High-fidelity Chess.com "Neo" piece set vector rendering.
 * Features the signature smooth contours, expressive Knight silhouette,
 * multi-tier crenellations, and high-contrast outlines of Chess.com.
 */
export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';

  // Chess.com Neo color palette:
  // White pieces: crisp pure white (#FFFFFF) body, dark charcoal (#262421) perimeter & details
  // Black pieces: deep warm charcoal (#262421) body, black (#111110) outline, crisp white & zinc highlight details
  const fill = isWhite ? '#FFFFFF' : '#262421';
  const stroke = isWhite ? '#262421' : '#111110';
  const accent = isWhite ? '#262421' : '#E5E7EB';
  const subAccent = isWhite ? '#262421' : '#9CA3AF';

  return (
    <div className={`flex items-center justify-center select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] ${className}`}>
      {/* PAWN */}
      {type === 'p' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M11 38c0-3 3-5 5.5-6.5h12c2.5 1.5 5.5 3.5 5.5 6.5H11z" />
            {/* Body */}
            <path d="M16.5 31.5c-1-5 2-10 6-12 4 2 7 7 6 12H16.5z" />
            {/* Collar */}
            <path d="M18.5 19.5h8" strokeWidth="2" stroke={stroke} />
            {/* Head */}
            <circle cx="22.5" cy="14" r="5" />
            {/* Head shine on white */}
            {isWhite ? (
              <circle cx="21" cy="12.5" r="1.3" fill="#FFFFFF" stroke="none" />
            ) : (
              <path d="M20 12.5a2.5 2.5 0 0 1 3.5-1" stroke={subAccent} strokeWidth="1" fill="none" />
            )}
          </g>
        </svg>
      )}

      {/* KNIGHT */}
      {type === 'n' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M11 38h23c0-3-2-4.5-4-5.5H15c-2 1-4 2.5-4 5.5z" />
            {/* Head & Neck: Iconic Chess.com Neo curve */}
            <path d="M15 32.5c0-4 1.5-6.5 3.5-9.5-1-1.5-3.5-4-3.5-7.5 0-3 2-5 3.5-5.5 0-1.5 1.5-3.5 3.5-4 1.5 1.5 2 3 2 4.5 1.5-1 3.5-1 5 0 2 1.5 2.5 4 1.5 6.5 2.5 1.5 4 4.5 3.5 8-.5 3-2 5.5-3.5 7.5H15z" />
            {/* Mane ridges */}
            <path d="M26 9.5c2 1 3.5 2.5 4 5" stroke={accent} strokeWidth="1.5" fill="none" />
            <path d="M27.5 17c1.5 1 2.5 2.5 2.8 4.5" stroke={accent} strokeWidth="1.5" fill="none" />
            {/* Eye */}
            <circle cx="19.5" cy="14.5" r="1.5" fill={isWhite ? '#262421' : '#FFFFFF'} stroke="none" />
            {/* Nostril */}
            <circle cx="16" cy="19.5" r="1" fill={accent} stroke="none" />
            {/* Jaw contour line */}
            <path d="M21 21.5c-2 2-3.5 3.5-3.5 6.5" stroke={accent} strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      )}

      {/* BISHOP */}
      {type === 'b' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M11 38c0-3 3-5 5.5-6.5h12c2.5 1.5 5.5 3.5 5.5 6.5H11z" />
            {/* Body */}
            <path d="M16 31.5c-1-3 1-6 2.5-8.5 2.5 1.5 5.5 1.5 8 0 1.5 2.5 3.5 5.5 2.5 8.5H16z" />
            {/* Mitre Head */}
            <path d="M17.5 23c-2.5-4-1.5-9 1-12 1.5-2 3-3 4-3s2.5 1 4 3c2.5 3 3.5 8 1 12-2.5 1.5-7.5 1.5-10 0z" />
            {/* Cross/Ball Finial */}
            <circle cx="22.5" cy="6.5" r="1.8" />
            {/* Mitre diagonal cut slit */}
            <path d="M20 13l5 5" stroke={accent} strokeWidth="1.8" />
            {/* Mitre horizontal ring */}
            <path d="M18.5 20.5c2.5.8 5.5.8 8 0" stroke={accent} strokeWidth="1.6" fill="none" />
          </g>
        </svg>
      )}

      {/* ROOK */}
      {type === 'r' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M10 38c0-2.5 2.5-4.5 5-5.5h15c2.5 1 5 3 5 5.5H10z" />
            {/* Waist */}
            <path d="M15 32.5l1.5-13h12l1.5 13H15z" />
            {/* Battlements / Crenellations */}
            <path d="M13 19.5h19v-7.5h-4v3h-3.5v-3h-4v3H17v-3h-4v7.5z" />
            {/* Window slit */}
            <path d="M22.5 24v4" stroke={accent} strokeWidth="2" strokeLinecap="round" />
            {/* Decorative horizontal lines */}
            <path d="M14 20h17" stroke={accent} strokeWidth="1.4" />
            <path d="M12.5 33h20" stroke={accent} strokeWidth="1.4" />
          </g>
        </svg>
      )}

      {/* QUEEN */}
      {type === 'q' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M10 38c0-3 3-5 5.5-6h14c2.5 1 5.5 3 5.5 6H10z" />
            {/* Body */}
            <path d="M15.5 32c-1-5 1.5-8 4-10.5 1.5.5 4.5.5 6 0 2.5 2.5 5 5.5 4 10.5H15.5z" />
            {/* Crown flare */}
            <path d="M14 18l-3.5-7 6.5 3.5L22.5 8l5.5 6.5 6.5-3.5-3.5 7H14z" />
            {/* Coronet pearls / 5 distinct balls */}
            <circle cx="10.5" cy="11" r="1.5" />
            <circle cx="17" cy="14.5" r="1.5" />
            <circle cx="22.5" cy="8" r="1.5" />
            <circle cx="28" cy="14.5" r="1.5" />
            <circle cx="34.5" cy="11" r="1.5" />
            {/* Decorative belt details */}
            <path d="M15 22.5c4 1.5 11 1.5 15 0" stroke={accent} strokeWidth="1.5" fill="none" />
            <path d="M16 26.5c3.5 1.2 9.5 1.2 13 0" stroke={accent} strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      )}

      {/* KING */}
      {type === 'k' && (
        <svg viewBox="0 0 45 45" className="w-full h-full transition-transform duration-75">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Base */}
            <path d="M10 38c0-3 3-5 5.5-6h14c2.5 1 5.5 3 5.5 6H10z" />
            {/* Waist */}
            <path d="M15.5 32c-1.5-4 1-7.5 3-10 2.5 1 5.5 1 8 0 2 2.5 4.5 6 3 10H15.5z" />
            {/* Shoulders & Crown */}
            <path d="M13.5 20c-1.5-2.5-1.5-5 0-7 2.5-3 5.5-3.5 9-3.5s6.5.5 9 3.5c1.5 2 1.5 4.5 0 7-3 1.5-15 1.5-18 0z" />
            {/* Crown Finial / Cross */}
            <path d="M22.5 5.5v4.5M20 7.5h5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            {/* Royal details */}
            <circle cx="22.5" cy="14" r="1.8" fill={accent} stroke="none" />
            <path d="M15.5 22c4 1.8 10 1.8 14 0" stroke={accent} strokeWidth="1.5" fill="none" />
            <path d="M16.5 26.5c3.5 1.4 8.5 1.4 12 0" stroke={accent} strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      )}
    </div>
  );
};
