import React from 'react';

interface ChessMasteryLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  lightText?: boolean;
}

/**
 * Chess Mastery Bespoke Brand Emblem
 * 
 * A handcrafted geometric vector crest combining an architectural knight silhouette
 * and crown crenellations with dual-tone emerald & titanium facets.
 * Free of generic emojis or standard AI iconography.
 */
export const ChessMasteryLogo: React.FC<ChessMasteryLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  lightText = false
}) => {
  const sizeMap = {
    xs: { icon: 20, font: 'text-xs', sub: 'text-[8px]', gap: 'gap-1.5' },
    sm: { icon: 26, font: 'text-sm', sub: 'text-[9px]', gap: 'gap-2' },
    md: { icon: 34, font: 'text-base', sub: 'text-[10px]', gap: 'gap-2.5' },
    lg: { icon: 44, font: 'text-xl', sub: 'text-xs', gap: 'gap-3' },
    xl: { icon: 58, font: 'text-2xl', sub: 'text-sm', gap: 'gap-3.5' }
  };

  const config = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${config.gap} select-none ${className}`}>
      {/* Precision Geometric SVG Crest */}
      <svg
        width={config.icon}
        height={config.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        aria-label="Chess Mastery Logo"
      >
        <defs>
          {/* Emerald Deep Gradient */}
          <linearGradient id="cm-shield-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* Facet Highlighting Gradient */}
          <linearGradient id="cm-facet-light" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.6" />
          </linearGradient>

          {/* Gold Apex Accent */}
          <linearGradient id="cm-gold-accent" x1="18" y1="8" x2="30" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Subtle Ambient Drop Glow */}
          <filter id="cm-glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#059669" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Outer Hexagonal Shield Foundation */}
        <path
          d="M24 2.5L42.5 10.5V26.5C42.5 36.2 34.6 44 24 46.5C13.4 44 5.5 36.2 5.5 26.5V10.5L24 2.5Z"
          fill="url(#cm-shield-grad)"
          filter="url(#cm-glow)"
        />

        {/* Inner Geometric Shading / Left Dark Facet */}
        <path
          d="M24 3.5V45.5C14.5 43.2 7 35.8 7 26.5V11.5L24 3.5Z"
          fill="#022C22"
          fillOpacity="0.45"
        />

        {/* Stylized Modern Monarch-Knight Geometry */}
        {/* Crest Apex Crown Spikes */}
        <path
          d="M17 14L20.5 18L24 13L27.5 18L31 14L29.5 22H18.5L17 14Z"
          fill="url(#cm-gold-accent)"
        />

        {/* Sleek Forward-Facing Knight Head Profile */}
        <path
          d="M24 15.5C21.5 15.5 19.8 17.2 19.8 19.5C19.8 20.8 20.4 21.8 21.2 22.5L17 26.5H23V31L25 33V26.5H28.5L30.5 22.5L28.2 19C28.2 17 26.2 15.5 24 15.5Z"
          fill="#FFFFFF"
        />

        {/* Knight Eye Facet (Electric Mint) */}
        <circle cx="23" cy="19.5" r="1.2" fill="#047857" />

        {/* Plinth Base Pedestal */}
        <path
          d="M16 34.5H32L34 38.5H14L16 34.5Z"
          fill="url(#cm-facet-light)"
          fillOpacity="0.85"
        />

        {/* Outer Shield Edge Rim Accent */}
        <path
          d="M24 4.5L40.5 11.5V26.5C40.5 34.8 33.6 42 24 44.5C14.4 42 7.5 34.8 7.5 26.5V11.5L24 4.5Z"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>

      {/* Brand Name Typography */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span
              className={`font-black tracking-tight uppercase font-display ${config.font} ${
                lightText
                  ? 'text-white'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              CHESS
            </span>
            <span
              className={`font-black tracking-tight uppercase font-display bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent ${config.font}`}
            >
              MASTERY
            </span>
          </div>
          <span className={`font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase ${config.sub}`}>
            Grandmaster AI
          </span>
        </div>
      )}
    </div>
  );
};
