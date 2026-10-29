import React, { useState } from 'react';
import { CoachMessage, CoachMode, CoachPromptOption } from '../../types/coach';
import { MoveRecord } from '../../types/chess';
import { OpeningInfo } from '../../types/game';
import { CoachMessageCard } from './CoachMessageCard';
import { CoachModeSelector } from './CoachModeSelector';
import { CoachChatInput } from './CoachChatInput';
import { MoveHistory } from '../game/MoveHistory';
import { Sparkles, MessageSquare, History, Bot, BookOpen } from 'lucide-react';

interface CoachPanelProps {
  currentMessage: CoachMessage | null;
  messageHistory: CoachMessage[];
  coachMode: CoachMode;
  onChangeCoachMode: (mode: CoachMode) => void;
  presetPrompts: CoachPromptOption[];
  onAskCoach: (query: string) => void;
  moves: MoveRecord[];
  activeMoveIndex?: number;
  onSelectMove?: (index: number) => void;
  opening?: OpeningInfo;
  isAiThinking?: boolean;
  onStartPractice?: (theme: string, themeTitle: string) => void;
  className?: string;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  currentMessage,
  messageHistory,
  coachMode,
  onChangeCoachMode,
  presetPrompts,
  onAskCoach,
  moves,
  activeMoveIndex,
  onSelectMove,
  opening,
  isAiThinking = false,
  onStartPractice,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'moves'>('coach');

  return (
    <div className={`flex flex-col bg-white dark:bg-[#1A1F2B] rounded-2xl border border-slate-200 dark:border-[#273042] shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-[#273042] bg-slate-50/80 dark:bg-[#14171E]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#81B64C] to-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                  AI Chess Coach
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-[#81B64C]" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                Personalized tactical & strategic mentor
              </p>
            </div>
          </div>
        </div>

        {/* Coach Mode Selector */}
        <CoachModeSelector mode={coachMode} onChangeMode={onChangeCoachMode} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#273042] text-xs font-semibold bg-slate-100/60 dark:bg-[#12151C]">
        <button
          onClick={() => setActiveTab('coach')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
            activeTab === 'coach'
              ? 'border-[#81B64C] text-[#81B64C] dark:text-emerald-400 font-bold bg-white dark:bg-[#1A1F2B]'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Live Coach</span>
        </button>

        <button
          onClick={() => setActiveTab('moves')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
            activeTab === 'moves'
              ? 'border-[#81B64C] text-[#81B64C] dark:text-emerald-400 font-bold bg-white dark:bg-[#1A1F2B]'
              : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Move History ({moves.length})</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-3.5 overflow-y-auto min-h-[220px] max-h-[380px] space-y-3">
        {activeTab === 'coach' ? (
          <div className="space-y-3">
            {/* Thinking indicator */}
            {isAiThinking && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <span className="font-semibold text-[11px]">Grandmaster Coach is evaluating...</span>
              </div>
            )}

            {/* Real-time Coach Message */}
            {currentMessage ? (
              <CoachMessageCard message={currentMessage} onStartPractice={onStartPractice} />
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-dashed border-slate-300 dark:border-[#262B36] text-center">
                <Bot className="w-7 h-7 text-slate-400 dark:text-zinc-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-300">
                  Ready to assist your game
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                  Make your move on the board or ask a question below.
                </p>
              </div>
            )}

            {/* Opening summary card if available */}
            {opening && (
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Opening: {opening.name}</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {opening.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <MoveHistory
            moves={moves}
            activeMoveIndex={activeMoveIndex}
            onSelectMove={onSelectMove}
          />
        )}
      </div>

      {/* Bottom Conversational Query Input */}
      <div className="p-3 bg-slate-50/80 dark:bg-[#14171E] border-t border-slate-200 dark:border-[#273042]">
        <CoachChatInput
          presetPrompts={presetPrompts}
          onSendQuery={onAskCoach}
          disabled={isAiThinking}
        />
      </div>
    </div>
  );
};
