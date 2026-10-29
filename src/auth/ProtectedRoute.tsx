import React from 'react';
import { useAuth } from './AuthProvider';

const dataMode = import.meta.env.VITE_DATA_MODE || 'api';

/**
 * Validates that a redirect target is a safe internal path.
 * Prevents open redirect to external URLs.
 */
function isSafeRedirect(path: string): boolean {
  if (!path) return false;
  // Must start with / but not // (protocol-relative) and not contain ://
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('://')) return false;
  return true;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

/**
 * ProtectedRoute — guards product routes behind authentication.
 *
 * API mode:
 *   - Shows loading spinner while session is being restored.
 *   - Redirects to /login?redirect=<currentRoute> if unauthenticated.
 *   - Renders children when authenticated.
 *
 * Mock mode:
 *   - Always renders children (no authentication required).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentRoute,
  onNavigate
}) => {
  const { user, isLoading } = useAuth();

  // In mock mode, always allow access
  if (dataMode === 'mock') {
    return <>{children}</>;
  }

  // In API mode, show spinner while session is restoring
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-surface-500 font-medium">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to landing page
  if (!user) {
    // Trigger navigation to landing on next tick to avoid render-during-render
    setTimeout(() => onNavigate('/landing'), 0);
    return null;
  }

  return <>{children}</>;
};
