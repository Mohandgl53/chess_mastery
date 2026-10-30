import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ZugoraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  lightText?: boolean;
  variant?: 'light' | 'dark' | 'auto';
}

/**
 * Zugora Official Brand Logo Component
 * Automatically switches between transparent/light-optimized and dark-background
 * variants based on context (dark theme, dark landing pages, dark cards).
 */
export const ChessMasteryLogo: React.FC<ZugoraLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  lightText = false,
  variant = 'auto'
}) => {
  // Use current theme to pick correct asset when set to auto
  let isDark = lightText;
  try {
    const { theme } = useTheme();
    if (variant === 'dark') isDark = true;
    else if (variant === 'light') isDark = false;
    else isDark = lightText || theme === 'dark';
  } catch {
    if (variant === 'dark') isDark = true;
    else if (variant === 'light') isDark = false;
    else isDark = lightText;
  }

  const logoSrc = isDark ? '/zugora-logo-dark.png' : '/zugora-logo-light.png';

  const sizeMap = {
    xs: { height: 'h-6 sm:h-7', iconSize: 26 },
    sm: { height: 'h-7 sm:h-8', iconSize: 32 },
    md: { height: 'h-9 sm:h-10', iconSize: 40 },
    lg: { height: 'h-12 sm:h-13', iconSize: 50 },
    xl: { height: 'h-15 sm:h-16', iconSize: 62 }
  };

  const config = sizeMap[size];

  // Full wordmark logo view
  if (showText) {
    return (
      <div className={`inline-flex items-center select-none cursor-pointer ${className}`}>
        <img
          src={logoSrc}
          alt="Zugora"
          className={`${config.height} w-auto object-contain transition-transform duration-200 hover:scale-[1.02] rounded-md`}
        />
      </div>
    );
  }

  // Collapsed / icon-only emblem view (e.g. collapsed sidebar)
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <div
        className="relative overflow-hidden rounded-xl shrink-0 flex items-center justify-center bg-black/60 border border-emerald-500/30 shadow-md"
        style={{ width: config.iconSize, height: config.iconSize }}
      >
        <img
          src={logoSrc}
          alt="Zugora Emblem"
          className="w-[280%] max-w-none object-cover object-left"
          style={{ transform: 'translateX(-2%)' }}
        />
      </div>
    </div>
  );
};
