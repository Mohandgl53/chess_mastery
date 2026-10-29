import React from 'react';
import { CoachMessage, CoachMessageType } from '../../types/coach';
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Lightbulb, BookOpen, Target, WifiOff, Brain, ArrowRight } from 'lucide-react';

interface CoachMessageCardProps {
  message: CoachMessage;
  onApplySuggestedMove?: (san: string) => void;
  onStartPractice?: (theme: string, themeTitle: string) => void;
  className?: string;
}

export const CoachMessageCard: React.FC<CoachMessageCardProps> = ({
  message,
  onApplySuggestedMove,
  onStartPractice,
  className = ''
}) => {
  const getStyle = (type: CoachMessageType) => {
    switch (type) {
      case 'GOOD_MOVE':
      case 'EXCELLENT_MOVE':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
          container: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40',
          titleColor: 'text-emerald-900 dark:text-emerald-300',
          accent: 'border-l-4 border-l-[#81B64C]'
        };
      case 'BOOK_MOVE':
      case 'OPENING_PRINCIPLE':
        return {
          icon: <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
          container: 'bg-sky-50/80 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800/40',
          titleColor: 'text-sky-900 dark:text-sky-300',
          accent: 'border-l-4 border-l-sky-500'
        };
      case 'INACCURACY':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
          container: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40',
          titleColor: 'text-amber-900 dark:text-amber-300',
          accent: 'border-l-4 border-l-amber-500'
        };
      case 'BLUNDER':
      case 'MISTAKE':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
          container: 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40',
          titleColor: 'text-rose-900 dark:text-rose-300',
          accent: 'border-l-4 border-l-rose-500'
        };
      case 'TACTICAL_OPPORTUNITY':
        return {
          icon: <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
          container: 'bg-purple-50/80 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/40',
          titleColor: 'text-purple-900 dark:text-purple-300',
          accent: 'border-l-4 border-l-purple-500'
        };
      case 'HINT':
        return {
          icon: <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500/20" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
          container: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40',
          titleColor: 'text-amber-900 dark:text-amber-300',
          accent: 'border-l-4 border-l-amber-500'
        };
      case 'COACH_UNAVAILABLE':
        return {
          icon: <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
          container: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40',
          titleColor: 'text-amber-900 dark:text-amber-300',
          accent: 'border-l-4 border-l-amber-500'
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-[#1C202B] dark:text-zinc-300 dark:border-[#2D3344]',
          container: 'bg-white border-slate-200 dark:bg-[#14171E] dark:border-[#222733]',
          titleColor: 'text-slate-900 dark:text-white',
          accent: 'border-l-4 border-l-[#81B64C]'
        };
    }
  };

  const style = getStyle(message.type);

  return (
    <div
      className={`p-3.5 rounded-xl border shadow-sm transition-all duration-200 ${style.container} ${style.accent} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <h4 className={`text-xs font-bold tracking-tight ${style.titleColor}`}>
            {message.title}
          </h4>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${style.badge}`}
        >
          {message.type.replace('_', ' ')}
        </span>
      </div>

      {/* Content */}
      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed mb-2 font-normal">
        {message.content}
      </p>

      {/* Lesson / Educational Takeaway */}
      {message.lesson && (
        <div className="mt-2 pt-2 text-[11px] text-slate-700 dark:text-zinc-300 bg-white/70 dark:bg-[#0E1015] p-2.5 rounded-lg border border-slate-200/80 dark:border-[#222733] shadow-xs">
          <span className="font-bold text-slate-900 dark:text-white">Takeaway: </span>
          <span>{message.lesson}</span>
        </div>
      )}

      {/* Suggested Alternative / Action */}
      {(message.suggestedMove || message.bestAlternative) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-600 dark:text-zinc-400">
            Suggested move: <span className="font-mono font-bold text-slate-900 dark:text-white">{message.suggestedMove || message.bestAlternative}</span>
          </span>
          {onApplySuggestedMove && (message.suggestedMove || message.bestAlternative) && (
            <button
              onClick={() => onApplySuggestedMove(message.suggestedMove || message.bestAlternative!)}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2"
            >
              Show line
            </button>
          )}
        </div>
      )}

      {/* Coach → Practice Bridge: Practice this theme */}
      {message.practiceTheme && onStartPractice && (
        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={() => {
              const theme = message.practiceTheme!;
              const title = message.practiceThemeTitle || theme;
              onStartPractice(theme, title);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:border dark:border-white/20 transition-colors shadow-xs"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Practice "{message.practiceThemeTitle || message.practiceTheme}"</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
