import React from 'react';
import {
  Home,
  Play,
  BookOpen,
  Target,
  Zap,
  BarChart2,
  TrendingUp,
  Settings,
  LogOut,
  Flame,
  Volume2,
  VolumeX,
  Sun,
  Moon
} from 'lucide-react';
import { ChessMasteryLogo } from '../brand/ChessMasteryLogo';
import { PlayerProfile } from '../../types/user';
import { useAuth } from '../../auth/AuthProvider';
import { useTheme } from '../../context/ThemeContext';
import { sounds } from '../../utils/soundEffects';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  userProfile: PlayerProfile;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  userProfile,
  className = ''
}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setSoundEnabled(next);
    if (next) sounds.playMove();
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('/login');
  };

  const primaryNavItems = [
    { id: 'home', label: 'Dashboard', icon: Home, route: '/' },
    { id: 'play', label: 'Play Coach', icon: Play, route: '/play', badge: 'Live AI', badgeColor: 'bg-[#81B64C] text-white' },
    { id: 'learn', label: 'Curriculum', icon: BookOpen, route: '/learn' },
    { id: 'practice', label: 'Weakness Drills', icon: Target, route: '/practice' },
    { id: 'puzzles', label: 'Tactical Puzzles', icon: Zap, route: '/puzzles', badge: 'Daily', badgeColor: 'bg-amber-500 text-black' },
    { id: 'analyze', label: 'Analysis Board', icon: BarChart2, route: '/analyze' },
    { id: 'progress', label: 'Mastery & Stats', icon: TrendingUp, route: '/progress' },
  ];

  const secondaryNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
  ];

  const isActive = (route: string) => {
    if (route === '/' && currentRoute === '/') return true;
    if (route !== '/' && currentRoute.startsWith(route)) return true;
    return false;
  };

  return (
    <aside
      className={`w-18 lg:w-64 bg-white dark:bg-[#151922] border-r border-slate-200 dark:border-[#242A36] flex flex-col justify-between select-none transition-colors duration-200 ${className}`}
    >
      {/* Brand Header */}
      <div>
        <div
          onClick={() => onNavigate('/')}
          className="p-3 lg:p-4 flex items-center justify-center lg:justify-start cursor-pointer hover:opacity-95 transition-opacity"
          title="Chess Mastery - Grandmaster AI Platform"
        >
          {/* Mobile/Collapsed icon view */}
          <div className="lg:hidden">
            <ChessMasteryLogo size="md" showText={false} />
          </div>
          {/* Desktop expanded view */}
          <div className="hidden lg:block">
            <ChessMasteryLogo size="md" showText={true} />
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="px-2 lg:px-3 space-y-1 mt-2">
          {primaryNavItems.map((item) => {
            const active = isActive(item.route);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                title={item.label}
                className={`w-full flex items-center justify-center lg:justify-between px-2.5 lg:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#81B64C]/15 text-[#588329] dark:bg-[#81B64C]/20 dark:text-[#9DD362] border-l-4 border-[#81B64C] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1D222E]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 lg:w-4 lg:h-4 shrink-0 transition-colors ${
                      active ? 'text-[#81B64C]' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`hidden lg:inline text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.badgeColor || (active ? 'bg-[#81B64C] text-white' : 'bg-slate-200 dark:bg-[#252C3B] text-slate-700 dark:text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Theme Switcher, Audio, Profile Card */}
      <div className="p-2 lg:p-3 border-t border-slate-200 dark:border-[#242A36] space-y-2 bg-slate-50/80 dark:bg-[#12151C] transition-colors">
        
        {/* Quick Preference Bar: Theme Switcher & Audio */}
        <div className="flex flex-col lg:flex-row items-center justify-between p-1 bg-white dark:bg-[#1A1F2B] rounded-xl border border-slate-200 dark:border-[#273042] shadow-2xs gap-1">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242C3D] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          >
            {theme === 'light' ? (
              <>
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span className="hidden lg:inline text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400 shrink-0" />
                <span className="hidden lg:inline text-[11px]">Dark</span>
              </>
            )}
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="w-full lg:w-auto flex items-center justify-center p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242C3D] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#81B64C] shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Secondary Navigation (Settings) */}
        {secondaryNavItems.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.route)}
              title={item.label}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#81B64C]/15 text-[#588329] dark:bg-[#81B64C]/20 dark:text-[#9DD362] font-bold border-l-3 border-[#81B64C]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1D222E]'
              }`}
            >
              <Icon className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}

        {/* User Card -> Profile */}
        <div
          id="sidebar-user-profile"
          onClick={() => onNavigate('/profile')}
          title={`${userProfile.name} (Elo ${userProfile.rating})`}
          className={`flex items-center justify-center lg:justify-between p-2 lg:p-2.5 rounded-xl cursor-pointer transition-all border ${
            currentRoute === '/profile'
              ? 'bg-[#81B64C]/15 border-[#81B64C] shadow-sm'
              : 'bg-white dark:bg-[#1A1F2B] border-slate-200 dark:border-[#273042] hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0 overflow-hidden">
              {userProfile.avatarUrl ? (
                userProfile.avatarUrl.startsWith('http') || userProfile.avatarUrl.startsWith('data:') ? (
                  <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{userProfile.avatarUrl}</span>
                )
              ) : (
                userProfile.name[0]
              )}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                {userProfile.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Elo <span className="font-bold text-[#81B64C] dark:text-[#9DD362] tabular-nums">{userProfile.rating}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="tabular-nums">{userProfile.streakDays}d</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          id="sidebar-logout"
          onClick={handleLogout}
          title="Sign out"
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 lg:w-3.5 lg:h-3.5 shrink-0" />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
};
