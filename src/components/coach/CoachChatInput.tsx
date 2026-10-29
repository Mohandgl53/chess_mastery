import React, { useState } from 'react';
import { CoachPromptOption } from '../../types/coach';
import { Send } from 'lucide-react';

interface CoachChatInputProps {
  presetPrompts: CoachPromptOption[];
  onSendQuery: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CoachChatInput: React.FC<CoachChatInputProps> = ({
  presetPrompts,
  onSendQuery,
  disabled = false,
  className = ''
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim() && !disabled) {
      onSendQuery(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Quick Prompt Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {presetPrompts.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onSendQuery(p.query)}
            className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-[#1A1F2B] hover:bg-slate-200 dark:hover:bg-[#252C3D] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#273042] transition-colors disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={disabled}
          placeholder="Ask Coach (e.g. 'Why is this move bad?')..."
          className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-[#12151B] border border-slate-200 dark:border-[#262B36] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || disabled}
          aria-label="Send query to coach"
          className="absolute right-1.5 p-1.5 rounded-lg text-white bg-[#81B64C] hover:bg-[#73A444] disabled:opacity-40 transition-colors shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
