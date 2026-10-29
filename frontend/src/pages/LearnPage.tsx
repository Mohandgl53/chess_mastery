import React, { useState, useEffect } from 'react';
import { CurriculumModule } from '../types/learning';
import { learningService } from '../services/learningService';
import {
  BookOpen,
  Shield,
  Zap,
  Target,
  Award,
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { RecommendedLessonInfo, CurriculumStats } from '../services/api/curriculumApi';

interface LearnPageProps {
  onSelectLesson: (lessonId: string) => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({ onSelectLesson }) => {
  const [curriculum, setCurriculum] = useState<CurriculumModule[]>([]);
  const [stats, setStats] = useState<CurriculumStats | null>(null);
  const [recommendedLesson, setRecommendedLesson] = useState<RecommendedLessonInfo | null>(null);

  useEffect(() => {
    if (learningService.getDashboardData) {
      learningService.getDashboardData().then((data) => {
        setCurriculum(data.modules);
        setStats(data.stats);
        if (data.recommendedLesson) {
          setRecommendedLesson(data.recommendedLesson);
        }
      });
    } else {
      learningService.getCurriculum().then(setCurriculum);
    }
  }, []);

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-sky-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Target': return <Target className="w-5 h-5 text-rose-400" />;
      case 'Award': return <Award className="w-5 h-5 text-purple-400" />;
      case 'Compass': return <Compass className="w-5 h-5 text-indigo-400" />;
      default: return <BookOpen className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Structured Curriculum
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
            Learn Chess: Master the Fundamentals
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Progressive curriculum engineered to transform beginner intuition into structured chess calculation.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-2 bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-700/60 px-3.5 py-2 rounded-xl shadow-xs shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold block uppercase tracking-wider">Progress</span>
              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                {stats.completedLessons} / {stats.totalLessons} Completed
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Personalized Recommendation Banner */}
      {recommendedLesson && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] text-slate-900 dark:text-white border border-slate-200 dark:border-[#273042] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                Coach Recommendation
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {recommendedLesson.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-xl">
              {recommendedLesson.reason}
            </p>
          </div>
          <button
            onClick={() => onSelectLesson(recommendedLesson.id)}
            className="chess-btn-green px-4 py-2.5 rounded-xl text-white font-black text-xs inline-flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>Start Lesson</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Curriculum Modules Roadmap */}
      <div className="space-y-5">
        {curriculum.map((module) => (
          <div
            key={module.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-slate-200 dark:border-[#273042] shadow-sm space-y-4"
          >
            {/* Module Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#161922] border border-emerald-200 dark:border-[#262B36] flex items-center justify-center shrink-0 shadow-xs">
                  {getModuleIcon(module.iconName)}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {module.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {module.description}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-[#161922] border border-slate-200 dark:border-[#262B36] px-2.5 py-1 rounded-lg shrink-0">
                {module.lessons.length} {module.lessons.length === 1 ? 'Lesson' : 'Lessons'}
              </span>
            </div>

            {/* Lessons List in Module */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {module.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-[#14171E] dark:hover:bg-[#1A1E27] border border-slate-200 dark:border-[#1E222B] hover:border-[#81B64C] dark:hover:border-[#81B64C]/60 transition-all cursor-pointer flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-[#1A1E27] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#262B36] uppercase tracking-wider">
                        {lesson.difficulty}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.durationMinutes}m</span>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#81B64C] transition-colors mb-1">
                      {lesson.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug mb-3">
                      {lesson.description}
                    </p>
                  </div>

                  {/* Progress & CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#1E222B] text-xs">
                    {lesson.completed ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : lesson.progressPercent ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        {lesson.progressPercent}% in progress
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-medium">
                        {lesson.totalSteps} steps
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 group-hover:text-[#81B64C] font-bold text-[11px] group-hover:translate-x-1 transition-all">
                      <span>{lesson.completed ? 'Review' : 'Start'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
