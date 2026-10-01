import React from 'react';
import { Sheet } from '../../ui/Sheet';
import { useStats } from '../../store/selectors';
import { Flame, BookOpen, Calendar, TrendingUp, Award, Sparkles } from 'lucide-react';

interface InsightsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsightsSheet: React.FC<InsightsSheetProps> = ({ isOpen, onClose }) => {
  const stats = useStats();

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Journal Insights" maxHeight="85vh">
      <div className="space-y-4 pb-6 select-none text-app-text-primary">
        {/* Streak Hero Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-orange-500/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Current Streak</span>
            </span>
            <span className="text-xs text-app-text-secondary font-medium">Daily Target</span>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold tracking-tight text-app-text-primary">
              {stats.currentStreak}
            </span>
            <span className="text-base font-semibold text-app-text-secondary">Days in a row</span>
          </div>

          <p className="text-xs text-app-text-secondary">
            Keep journaling today to maintain your momentum. Longest streak:{' '}
            <strong className="text-app-text-primary">{stats.longestDaily?.count || stats.currentStreak} days</strong>.
          </p>
        </div>

        {/* 2-Column Bento Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Words Written Card */}
          <div className="p-4 rounded-2xl bg-app-card border border-app-card-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 mb-2.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-app-text-secondary block mb-0.5">
                Words Written
              </span>
              <span className="text-2xl font-bold text-app-text-primary tracking-tight">
                {stats.wordsAllTime.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-app-hairline text-[11px] text-app-text-secondary flex justify-between">
              <span>This Month:</span>
              <strong className="text-app-text-primary">{stats.wordsThisMonth.toLocaleString()}</strong>
            </div>
          </div>

          {/* Days Journaled Card */}
          <div className="p-4 rounded-2xl bg-app-card border border-app-card-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-500 mb-2.5">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-app-text-secondary block mb-0.5">
                Days Journaled
              </span>
              <span className="text-2xl font-bold text-app-text-primary tracking-tight">
                {stats.daysJournaledAllTime}
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-app-hairline text-[11px] text-app-text-secondary flex justify-between">
              <span>Consistency:</span>
              <strong className="text-app-text-primary">{stats.consistencyScore || 94}%</strong>
            </div>
          </div>
        </div>

        {/* Writing Milestone & Consistency */}
        <div className="p-4 rounded-2xl bg-app-card border border-app-card-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-app-text-primary truncate">
              Reflection Habit
            </div>
            <div className="text-xs text-app-text-secondary truncate mt-0.5">
              Active journaling routine across your personal spaces
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Great</span>
            </span>
          </div>
        </div>

        {/* Milestone Badge */}
        <div className="p-4 rounded-2xl bg-app-card border border-app-card-border shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-500 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-app-text-primary truncate">
              {stats.longestDaily?.rangeFormatted ? `Peak: ${stats.longestDaily.rangeFormatted}` : '30-Day Milestone'}
            </div>
            <div className="text-xs text-app-text-secondary truncate mt-0.5">
              {stats.currentStreak >= 30 ? '30+ Days Club unlocked!' : `${Math.max(1, 30 - stats.currentStreak)} days until 30-Day Club`}
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
