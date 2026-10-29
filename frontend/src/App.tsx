import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { loadPlayerProfile } from './services/playerProfileService';
import type { PlayerProfile } from './types/user';

// Code-split ALL heavy pages for fast initial bundle delivery
const PlayPage = lazy(() => import('./pages/PlayPage').then((m) => ({ default: m.PlayPage })));
const PracticePage = lazy(() => import('./pages/PracticePage').then((m) => ({ default: m.PracticePage })));
const PuzzlesPage = lazy(() => import('./pages/PuzzlesPage').then((m) => ({ default: m.PuzzlesPage })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then((m) => ({ default: m.AnalyzePage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] p-8" role="status" aria-label="Loading page">
    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
  </div>
);

// ---------------------------------------------------------------------------
// Parse redirect query param safely (prevents open redirect)
// ---------------------------------------------------------------------------
function getSafeRedirect(): string | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('://')) {
      return redirect;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Inner app — rendered inside AuthProvider, can use useAuth()
// ---------------------------------------------------------------------------
function AppInner() {
  const { user, profile } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    // Check if we're on a specific hash path from initial load
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('/')) return hash;
    }
    return '/landing';
  });
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  // Keep React state in sync with the URL hash so hash-only navigation
  // (e.g. setting window.location.hash or page.goto to a new hash) re-renders
  // the correct page instead of staying on the route from initial mount.
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        if (hash.startsWith('/')) {
          setCurrentRoute(hash);
        }
      } else {
        setCurrentRoute(user ? '/' : '/landing');
      }
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [user]);

  const handleNavigate = (route: string) => {
    if (window.location.hash !== `#${route}`) {
      window.location.hash = route;
    }
    // Parse redirect from /login?redirect=... routes
    if (route.startsWith('/login')) {
      setCurrentRoute(route);
      return;
    }
    if (route.startsWith('/learn/')) {
      const lessonId = route.replace('/learn/', '').split('?')[0];
      setActiveLessonId(lessonId);
      setCurrentRoute(route);
    } else {
      setActiveLessonId(null);
      setCurrentRoute(route);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setCurrentRoute(`/learn/${lessonId}`);
  };

  const handleBackToCurriculum = (targetRoute = '/learn') => {
    setActiveLessonId(null);
    setCurrentRoute(targetRoute);
  };

  const [persistedProfile, setPersistedProfile] = useState<PlayerProfile>(() =>
    loadPlayerProfile(user?.id, { displayName: user?.displayName, email: user?.email, rating: profile?.rating })
  );

  useEffect(() => {
    if (user?.id) {
      try {
        localStorage.setItem('chess_mastery_active_user_id', user.id);
      } catch {}
    }
    setPersistedProfile(
      loadPlayerProfile(user?.id, { displayName: user?.displayName, email: user?.email, rating: profile?.rating })
    );
  }, [user?.id, user?.displayName, user?.email, profile?.rating]);

  useEffect(() => {
    const handleProfileChange = (e: Event) => {
      const customEvent = e as CustomEvent<PlayerProfile>;
      if (customEvent.detail) {
        setPersistedProfile(customEvent.detail);
      }
    };
    window.addEventListener('chess_mastery_profile_changed', handleProfileChange);
    return () => window.removeEventListener('chess_mastery_profile_changed', handleProfileChange);
  }, []);

  // Build PlayerProfile combining persisted customized profile and authoritative auth data
  const userProfile: PlayerProfile = {
    ...persistedProfile,
    id: user?.id || persistedProfile.id,
    name: user?.displayName || persistedProfile.name || (user?.email ? user.email.split('@')[0] : 'Player'),
    username: user?.email ? user.email.split('@')[0] : persistedProfile.username,
    rating: profile?.rating ?? persistedProfile.rating ?? 400,
    rapidRating: profile?.rating ?? persistedProfile.rapidRating ?? 400,
    peakRating: Math.max(persistedProfile.peakRating ?? 400, profile?.rating ?? 400),
    winCount: profile?.gamesWon ?? persistedProfile.winCount ?? 0,
    lossCount: profile?.gamesLost ?? persistedProfile.lossCount ?? 0,
    drawCount: profile?.gamesDrawn ?? persistedProfile.drawCount ?? 0,
    streakDays: profile?.currentStreak ?? persistedProfile.streakDays ?? 0,
    avatarUrl: persistedProfile.avatarUrl || '♞',
  };

  // ---------------------------------------------------------------------------
  // Public routes: Landing, Login, Register (no sidebar, no auth required)
  // ---------------------------------------------------------------------------
  if ((currentRoute === '/' && !user) || currentRoute === '/landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  if (currentRoute === '/register') {
    return <RegisterPage onNavigate={handleNavigate} />;
  }

  if (currentRoute.startsWith('/login')) {
    const redirectTo = getSafeRedirect() ||
      (currentRoute.includes('?redirect=')
        ? decodeURIComponent(currentRoute.split('?redirect=')[1] || '')
        : undefined);
    return (
      <LoginPage
        onNavigate={handleNavigate}
        redirectTo={redirectTo}
      />
    );
  }

// ---------------------------------------------------------------------------
    // Protected product routes (inside AppLayout with Sidebar)
    // ---------------------------------------------------------------------------
    const renderActivePage = () => {
      if (activeLessonId && currentRoute.startsWith('/learn/')) {
        const returnToParam = currentRoute.includes('?returnTo=')
          ? decodeURIComponent(currentRoute.split('?returnTo=')[1].split('&')[0])
          : undefined;
        return (
          <LessonPage
            lessonId={activeLessonId}
            onBackToCurriculum={() => handleBackToCurriculum(returnToParam || '/learn')}
            returnTo={returnToParam}
          />
        );
      }

      const basePath = currentRoute.split('?')[0];

      // Wrap lazy-loaded pages with route-level error boundaries
      const WrappedPracticePage = () => (
        <RouteErrorBoundary routeName="Practice">
          <PracticePage userProfile={userProfile} onNavigate={handleNavigate} currentRoute={currentRoute} />
        </RouteErrorBoundary>
      );

      const WrappedPlayPage = () => (
        <RouteErrorBoundary routeName="Play">
          <PlayPage userProfile={userProfile} onNavigate={handleNavigate} />
        </RouteErrorBoundary>
      );

      const WrappedPuzzlesPage = () => (
        <RouteErrorBoundary routeName="Puzzles">
          <PuzzlesPage onNavigate={handleNavigate} />
        </RouteErrorBoundary>
      );

      const WrappedAnalyzePage = () => (
        <RouteErrorBoundary routeName="Analyze">
          <AnalyzePage onNavigate={handleNavigate} currentRoute={currentRoute} />
        </RouteErrorBoundary>
      );

      const WrappedProgressPage = () => (
        <RouteErrorBoundary routeName="Progress">
          <ProgressPage userProfile={userProfile} onNavigate={handleNavigate} />
        </RouteErrorBoundary>
      );

      const WrappedProfilePage = () => (
        <RouteErrorBoundary routeName="Profile">
          <ProfilePage userProfile={userProfile} onNavigate={handleNavigate} />
        </RouteErrorBoundary>
      );

      const WrappedSettingsPage = () => (
        <RouteErrorBoundary routeName="Settings">
          <SettingsPage onBackToPlay={() => handleNavigate('/play')} />
        </RouteErrorBoundary>
      );

      if (basePath === '/practice') {
        return <WrappedPracticePage />;
      }

      switch (basePath) {
        case '/':
          return <HomePage userProfile={userProfile} onNavigate={handleNavigate} />;
        case '/play':
          return <WrappedPlayPage />;
        case '/learn':
          return <LearnPage onSelectLesson={handleSelectLesson} />;
        case '/puzzles':
          return <WrappedPuzzlesPage />;
        case '/analyze':
          return <WrappedAnalyzePage />;
        case '/progress':
          return <WrappedProgressPage />;
        case '/profile':
          return <WrappedProfilePage />;
        case '/settings':
          return <WrappedSettingsPage />;
        default:
          return <HomePage userProfile={userProfile} onNavigate={handleNavigate} />;
      }
    };

  return (
    <ProtectedRoute currentRoute={currentRoute} onNavigate={handleNavigate}>
      <AppLayout
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        userProfile={userProfile}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          {renderActivePage()}
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// App root — wraps everything in AuthProvider and ErrorBoundary
// ---------------------------------------------------------------------------
export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
