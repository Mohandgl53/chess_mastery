import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { PlayerProfile } from '../../types/user';
import { useTheme } from '../../context/ThemeContext';
import { ChessMasteryLogo } from '../brand/ChessMasteryLogo';
import { useAuth } from '../../auth/AuthProvider';
import {
  Menu,
  X,
  Home,
  Play,
  BookOpen,
  Target,
  Zap,
  BarChart2,
  TrendingUp,
  Settings,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';

interface AppLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  userProfile: PlayerProfile;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  userProfile,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleMobileNav = (route: string) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#12151B] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop Sidebar (Left) */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        userProfile={userProfile}
        className="hidden md:flex shrink-0 z-30"
      />

      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#151922] border-b border-slate-200 dark:border-[#242A36] px-4 flex items-center justify-between z-40 shadow-xs transition-colors">
        <div onClick={() => handleMobileNav('/')} className="cursor-pointer">
          <ChessMasteryLogo size="md" showText={true} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1F2533] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1F2533] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-[#151922] border-r border-slate-200 dark:border-[#242A36] h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#242A36] mb-4">
                <div onClick={() => handleMobileNav('/')} className="cursor-pointer">
                  <ChessMasteryLogo size="sm" showText={true} />
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'Dashboard', icon: Home, route: '/' },
                  { label: 'Play Coach', icon: Play, route: '/play' },
                  { label: 'Curriculum', icon: BookOpen, route: '/learn' },
                  { label: 'Practice Drills', icon: Target, route: '/practice' },
                  { label: 'Tactical Puzzles', icon: Zap, route: '/puzzles' },
                  { label: 'Analysis Board', icon: BarChart2, route: '/analyze' },
                  { label: 'Mastery & Stats', icon: TrendingUp, route: '/progress' },
                  { label: 'Settings', icon: Settings, route: '/settings' },
                ].map((item) => (
                  <button
                    key={item.route}
                    onClick={() => handleMobileNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer ${
                      currentRoute === item.route
                        ? 'bg-[#81B64C]/15 text-[#588329] dark:bg-[#81B64C]/20 dark:text-[#9DD362] border-l-3 border-[#81B64C]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1D222E]'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* User Info -> Profile */}
            <div
              onClick={() => handleMobileNav('/profile')}
              className="p-3 bg-slate-50 dark:bg-[#1A1F2B] hover:bg-slate-100 dark:hover:bg-[#222938] rounded-xl border border-slate-200 dark:border-[#273042] cursor-pointer flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
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
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{userProfile.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Elo {userProfile.rating}</div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
                onNavigate('/landing');
              }}
              className="w-full mt-2 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-colors cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200/60 dark:border-red-800/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 h-full overflow-y-auto pt-16 md:pt-0 pb-16 md:pb-0 bg-[#F0F2F5] dark:bg-[#12151B] transition-colors duration-200">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-15 bg-white/95 dark:bg-[#151922]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#242A36] px-2 flex items-center justify-around z-40 shadow-lg transition-colors">
        {[
          { label: 'Home', icon: Home, route: '/' },
          { label: 'Play', icon: Play, route: '/play' },
          { label: 'Puzzles', icon: Zap, route: '/puzzles' },
          { label: 'Learn', icon: BookOpen, route: '/learn' },
          { label: 'Stats', icon: TrendingUp, route: '/progress' },
        ].map((tab) => {
          const active = currentRoute === tab.route;
          const Icon = tab.icon;
          return (
            <button
              key={tab.route}
              onClick={() => handleMobileNav(tab.route)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                active
                  ? 'text-[#689E39] dark:text-[#81B64C]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] mt-0.5 ${active ? 'font-black' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
