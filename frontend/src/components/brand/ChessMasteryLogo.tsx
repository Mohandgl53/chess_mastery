import React from 'react';

interface ZugoraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  lightText?: boolean;
}

/**
 * Zugora Official Brand Logo Component
 * Incorporates the high-resolution bespoke emerald knight emblem & typographic wordmark.
 * Tagline: "THINK AHEAD. PLAY BETTER."
 */
export const ChessMasteryLogo: React.FC<ZugoraLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  lightText = false
}) => {
  const sizeMap = {
    xs: { height: 'h-6', iconSize: 22, font: 'text-xs', sub: 'text-[7.5px]', gap: 'gap-1.5' },
    sm: { height: 'h-8', iconSize: 28, font: 'text-sm', sub: 'text-[8.5px]', gap: 'gap-2' },
    md: { height: 'h-10', iconSize: 36, font: 'text-base', sub: 'text-[9.5px]', gap: 'gap-2.5' },
    lg: { height: 'h-12', iconSize: 44, font: 'text-lg', sub: 'text-[11px]', gap: 'gap-3' },
    xl: { height: 'h-16', iconSize: 58, font: 'text-2xl', sub: 'text-xs', gap: 'gap-3.5' }
  };

  const config = sizeMap[size];

  // When text is explicitly requested or when in header/banner positions, render the full brand emblem
  if (showText) {
    return (
      <div className={`inline-flex items-center select-none cursor-pointer ${className}`}>
        <img
          src="/zugora-logo.png"
          alt="Zugora — Think Ahead. Play Better."
          className={`${config.height} w-auto object-contain transition-transform duration-200 hover:scale-[1.02]`}
        />
      </div>
    );
  }

  // When collapsed or icon-only mode is required (e.g., collapsed sidebar)
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <div
        className="relative overflow-hidden rounded-xl shrink-0 flex items-center justify-center bg-black/40 border border-emerald-500/30 shadow-md"
        style={{ width: config.iconSize, height: config.iconSize }}
      >
        <img
          src="/zugora-logo.png"
          alt="Zugora Logo"
          className="w-[280%] max-w-none object-cover object-left"
          style={{ transform: 'translateX(-2%)' }}
        />
      </div>
    </div>
  );
};
