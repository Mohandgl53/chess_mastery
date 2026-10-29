import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { Lesson, LessonStep } from '../types/learning';
import { learningService } from '../services/learningService';
import { ChessBoard } from '../components/chess/ChessBoard';
import { sounds } from '../utils/soundEffects';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../auth/AuthProvider';

interface LessonPageProps {
  lessonId: string;
  onBackToCurriculum: () => void;
  returnTo?: string;
}

export const LessonPage: React.FC<LessonPageProps> = ({ lessonId, onBackToCurriculum, returnTo }) => {
  const { refreshProfile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [chess] = useState<Chess>(() => new Chess());
  const [, setRenderTrigger] = useState(0);

  // Interaction feedback states
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isCorrect: boolean } | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);

  const updateBoard = useCallback(() => {
    setRenderTrigger((p) => p + 1);
  }, []);

  // Load lesson and restore persisted step progress
  useEffect(() => {
    learningService.getLessonById(lessonId).then((l) => {
      if (l) {
        setLesson(l);
        // If incomplete, resume from saved currentStep; if completed, start from step 1
        const resumeIndex = l.completed ? 0 : Math.max(0, (l.currentStep || 1) - 1);
        setCurrentStepIndex(resumeIndex);
      }
    });
  }, [lessonId]);

  const currentStep: LessonStep | undefined = lesson?.steps[currentStepIndex];

  // Initialize board for active step
  useEffect(() => {
    if (currentStep) {
      chess.load(currentStep.fen);
      setIsStepCompleted(false);
      setFeedbackMessage(null);
      setSelectedOptionId(null);
      setHighlightedSquares(currentStep.highlightSquares || []);
      updateBoard();
    }
  }, [currentStep, chess, updateBoard]);

  // Move handler for interactive step with authoritative validation
  const handleBoardMove = async ({ from, to }: { from: string; to: string }) => {
    if (!currentStep || currentStep.type !== 'interactive_move' || isStepCompleted || !lesson) {
      return false;
    }

    try {
      const move = chess.move({ from: from as Square, to: to as Square });
      if (!move) return false;

      updateBoard();

      // Validate move authoritatively
      const res = await learningService.validateStep(lesson.id, {
        stepNumber: currentStep.stepNumber,
        moveSan: move.san,
        moveFrom: from,
        moveTo: to
      });

      if (res.correct) {
        sounds.playVictory();
        setIsStepCompleted(true);
        setFeedbackMessage({
          text: `Excellent! You played ${move.san}. ${res.feedback}`,
          isCorrect: true
        });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

        if (res.isLessonCompleted) {
          lesson.completed = true;
          lesson.progressPercent = 100;
          await refreshProfile();
        }
      } else {
        sounds.playCheck();
        setFeedbackMessage({
          text: res.feedback || `You played ${move.san}. Not quite the best move. Try again!`,
          isCorrect: false
        });
        // Reset board back to step FEN on incorrect move
        setTimeout(() => {
          chess.load(currentStep.fen);
          updateBoard();
        }, 900);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Multiple Choice Option selection with backend validation
  const handleSelectOption = async (option: { id: string; text: string; isCorrect: boolean; feedback: string }) => {
    if (isStepCompleted || !lesson || !currentStep) return;
    setSelectedOptionId(option.id);

    const res = await learningService.validateStep(lesson.id, {
      stepNumber: currentStep.stepNumber,
      selectedOptionId: option.id
    });

    if (res.correct) {
      sounds.playVictory();
      setIsStepCompleted(true);
      setFeedbackMessage({ text: res.feedback, isCorrect: true });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });

      if (res.isLessonCompleted) {
        lesson.completed = true;
        lesson.progressPercent = 100;
        await refreshProfile();
      }
    } else {
      setFeedbackMessage({ text: res.feedback, isCorrect: false });
    }
  };

  const handleNextStep = async () => {
    if (!lesson || !currentStep) return;
    if (currentStepIndex < lesson.steps.length - 1) {
      // If advancing from a concept step, record progress
      if (currentStep.type === 'concept') {
        await learningService.validateStep(lesson.id, {
          stepNumber: currentStep.stepNumber
        });
      }
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completing the final step
      const res = await learningService.validateStep(lesson.id, {
        stepNumber: currentStep.stepNumber
      });
      if (res.isLessonCompleted) {
        lesson.completed = true;
        lesson.progressPercent = 100;
        await refreshProfile();
      }
      onBackToCurriculum();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleResetLesson = async () => {
    if (!lesson) return;
    await learningService.resetLesson(lesson.id);
    setCurrentStepIndex(0);
    setIsStepCompleted(false);
    setFeedbackMessage(null);
    setSelectedOptionId(null);
    if (lesson.steps[0]) {
      chess.load(lesson.steps[0].fen);
      updateBoard();
    }
  };

  if (!lesson || !currentStep) {
    return (
      <div className="p-8 text-center text-surface-500">
        Loading lesson...
      </div>
    );
  }

  const isLastStep = currentStepIndex === lesson.steps.length - 1;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 text-zinc-100">
      {/* Back to Curriculum Button & Progress */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1E222B]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCurriculum}
            className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {lesson.categoryTitle}</span>
          </button>
          {returnTo && (
            <button
              onClick={onBackToCurriculum}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Game Review</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-200 bg-[#161922] border border-[#262B36] px-2.5 py-1 rounded-lg tabular-nums">
            Step {currentStepIndex + 1} of {lesson.totalSteps}
          </span>
          <button
            onClick={handleResetLesson}
            title="Reset progress to Step 1"
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#1A1E27]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Lesson Interface: Live Board (Left) + Step Lesson Notes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.3fr)_minmax(320px,_1fr)] gap-6 items-start">
        {/* Left: Board Demonstration Area */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-[540px]">
            <ChessBoard
              chess={chess}
              isInteractive={currentStep.type === 'interactive_move' && !isStepCompleted}
              highlightedSquares={highlightedSquares}
              onMovePiece={handleBoardMove}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${currentStep.turn === 'w' ? 'bg-white' : 'bg-zinc-700'}`} />
            <span>Turn: {currentStep.turn === 'w' ? 'White to Move' : 'Black to Move'}</span>
          </div>
        </div>

        {/* Right: Lesson Instructions & Interactive Questions */}
        <div className="space-y-4 bg-white dark:bg-[#1A1F2B] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          {/* Step Category & Title */}
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wider">
              {currentStep.type.replace('_', ' ')}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5 font-display">
              {currentStep.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
              {currentStep.instruction}
            </p>
          </div>

          {/* Explanation Text */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171E] border border-slate-200 dark:border-[#1E222B] text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-normal shadow-xs">
            {currentStep.explanation}
          </div>

          {/* Multiple Choice Options (If question step) */}
          {currentStep.type === 'question' && currentStep.options && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Select the correct answer:
              </span>
              <div className="space-y-1.5">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-3.5 rounded-xl border text-xs font-bold text-left transition-all shadow-xs cursor-pointer ${
                      selectedOptionId === opt.id
                        ? opt.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-[#81B64C] text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-300 ring-2 ring-rose-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#14171E] dark:hover:bg-[#1A1E27] border-slate-200 dark:border-[#222733] text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Interactive Feedback */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                feedbackMessage.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-300'
              }`}
            >
              {feedbackMessage.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-semibold">{feedbackMessage.text}</div>
            </div>
          )}

          {/* AI Coach Pedagogical Tip */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Coach Pedagogical Note</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
              {currentStep.coachTip}
            </p>
          </div>

          {/* Step Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#1E222B]">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              Previous Step
            </button>

            {currentStep.type === 'concept' || isStepCompleted ? (
              <button
                onClick={isLastStep ? onBackToCurriculum : handleNextStep}
                className="chess-btn-green flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-black transition-all shadow-xs cursor-pointer"
              >
                <span>{isLastStep ? 'Complete Lesson' : 'Next Step'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium italic">
                {currentStep.type === 'interactive_move'
                  ? 'Make the move on the board to proceed'
                  : 'Select an answer to proceed'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
