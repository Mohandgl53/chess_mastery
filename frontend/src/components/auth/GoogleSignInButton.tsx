import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../auth/AuthProvider';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  className?: string;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = 'signin_with',
  className = '',
  disabled = false,
}) => {
  const { googleLogin } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGisReady, setIsGisReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        onError('No authentication credential received from Google.');
        return;
      }

      try {
        setIsProcessing(true);
        await googleLogin(response.credential);
        onSuccess();
      } catch (err: any) {
        onError(err?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [googleLogin, onSuccess, onError]
  );

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds total

    const checkAndInitGis = () => {
      attempts++;
      if (window.google?.accounts?.id && containerRef.current) {
        if (intervalId) clearInterval(intervalId);

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: text === 'signup_with' ? 'signup' : 'signin'
          });

          // Clear any previous rendered button if re-rendering
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
            const clientW = containerRef.current.clientWidth;
            const buttonWidth = clientW > 0 ? Math.min(400, Math.max(200, clientW)) : 220;
            window.google.accounts.id.renderButton(containerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: text === 'signup_with' ? 'signup_with' : 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: buttonWidth
            });
          }

          setIsGisReady(true);

          // Prompt One Tap / floating popup if supported
          window.google.accounts.id.prompt();
        } catch (err) {
          console.warn('[GIS] Initialization warning:', err);
        }
      } else if (attempts >= maxAttempts) {
        if (intervalId) clearInterval(intervalId);
      }
    };

    checkAndInitGis();
    intervalId = setInterval(checkAndInitGis, 100);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [clientId, handleCredentialResponse, text]);

  const handleFallbackClick = () => {
    if (!clientId) {
      onError('Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err: any) {
        onError(err?.message || 'Failed to open Google sign-in prompt.');
      }
    } else {
      onError('Google Sign-In service could not be loaded. Please check your internet connection or ad blocker.');
    }
  };

  return (
    <div className={`relative flex items-center justify-center w-full min-h-[46px] ${className}`}>
      {/* Official GIS Rendered Container */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center ${isGisReady && clientId ? 'block' : 'hidden'}`}
      />

      {/* Fallback button when GIS is loading, not yet ready, or client ID is missing */}
      {(!isGisReady || !clientId) && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={disabled || isProcessing}
          className="w-full flex items-center justify-center gap-2.5 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 transition-all text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isProcessing ? 'Connecting...' : 'Google'}</span>
        </button>
      )}
    </div>
  );
};

