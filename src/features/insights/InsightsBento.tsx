import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { useStats } from '../../store/selectors';
import { haptics } from '../../lib/haptics';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const InsightsBento: React.FC = () => {
  const stats = useStats();

  const [expandedStreak, setExpandedStreak] = useState<'none' | 'current' | 'daily' | 'weekly'>('none');
  const [expandedStat, setExpandedStat] = useState<'none' | 'entries' | 'words' | 'days' | 'calendar'>('none');
  const [entriesScope, setEntriesScope] = useState<'year' | 'all'>('year');

  const springTransition = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 34,
  };

  const handleToggleStreak = (id: 'current' | 'daily' | 'weekly') => {
    haptics.light();
    setExpandedStreak((prev) => (prev === id ? 'none' : id));
  };

  const handleToggleStat = (id: 'entries' | 'words' | 'days' | 'calendar') => {
    haptics.light();
    setExpandedStat((prev) => (prev === id ? 'none' : id));
  };

  const maxMonthCount = Math.max(1, ...stats.monthlyCounts);

  return (
    <div className="space-y-6">
      {/* 1. STREAKS GROUP */}
      <section>
        <h2 className="text-[22px] font-semibold text-app-text-primary tracking-tight mb-3 px-1">
          Streaks
        </h2>

        {/* Default Layout: 2 columns, Left: Current Streak square, Right: 2 stacked small cards */}
        {expandedStreak === 'none' && (
          <div className="grid grid-cols-2 gap-3.5">
            {/* Left: Current Streak (Square Maroon Gradient) */}
            <motion.div
              layout
              transition={springTransition}
              onClick={() => handleToggleStreak('current')}
              className="relative overflow-hidden rounded-[20px] aspect-square p-4 sm:p-5 flex flex-col justify-between cursor-pointer shadow-md bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white select-none active:scale-[0.98] transition-transform"
            >
              {/* Decorative confetti/ribbon art */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <svg className="w-full h-full" viewBox="0 0 160 160" fill="none">
                  <circle cx="140" cy="20" r="45" fill="url(#streak-ribbon)" opacity="0.6" />
                  <path
                    d="M-20 120 C 30 90, 80 140, 140 100"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 160 C 50 110, 110 130, 180 80"
                    stroke="rgba(244,114,182,0.25)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="streak-ribbon" x1="0" y1="0" x2="160" y2="160">
                      <stop stopColor="#F472B6" stopOpacity="0.4" />
                      <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white/80 tracking-wide uppercase">
                  Current Streak
                </span>
              </div>

              <div className="relative z-10 my-auto py-1">
                <span className="text-[76px] sm:text-[88px] font-black tracking-tighter leading-none block text-white drop-shadow-sm">
                  {stats.currentStreak}
                </span>
                <span className="text-[15px] font-medium text-white/80 capitalize mt-1 block">
                  {stats.streakUnit}
                </span>
              </div>
            </motion.div>

            {/* Right: Two Stacked Cards */}
            <div className="flex flex-col gap-3.5">
              {/* Longest Daily */}
              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('daily')}
                className="flex-1 rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform select-none"
              >
                <p className="text-[13px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Daily</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <div className="mt-2">
                  <span className="text-[26px] font-bold text-[#FF3B30] tracking-tight">
                    {stats.longestDaily.count}{' '}
                  </span>
                  <span className="text-[17px] font-medium text-app-text-secondary">Days</span>
                </div>
              </motion.div>

              {/* Longest Weekly */}
              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('weekly')}
                className="flex-1 rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform select-none"
              >
                <p className="text-[13px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Weekly</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <div className="mt-2">
                  <span className="text-[26px] font-bold text-[#5856D6] dark:text-[#8A87F8] tracking-tight">
                    {stats.longestWeekly.count}{' '}
                  </span>
                  <span className="text-[17px] font-medium text-app-text-secondary">Weeks</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Current Streak Expanded: Full-width top card, two side-by-side bottom cards */}
        {expandedStreak === 'current' && (
          <div className="space-y-3.5">
            <motion.div
              layout
              transition={springTransition}
              onClick={() => handleToggleStreak('current')}
              className="relative overflow-hidden rounded-[22px] p-6 cursor-pointer shadow-lg bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white select-none"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-white/80 uppercase tracking-wider">
                  Current Streak
                </span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-[88px] font-black tracking-tighter leading-none text-white">
                  {stats.currentStreak}
                </span>
                <span className="text-2xl font-bold text-white/80 capitalize">
                  {stats.streakUnit}
                </span>
              </div>

              <p className="text-[15px] text-white/90 font-medium mt-3 leading-relaxed">
                You’ve journaled every day since {stats.currentStreakSince}.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3.5">
              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('daily')}
                className="rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between select-none"
              >
                <p className="text-[13px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Daily</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <div className="mt-2">
                  <span className="text-[24px] font-bold text-[#FF3B30]">
                    {stats.longestDaily.count}{' '}
                  </span>
                  <span className="text-[15px] font-medium text-app-text-secondary">Days</span>
                </div>
              </motion.div>

              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('weekly')}
                className="rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between select-none"
              >
                <p className="text-[13px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Weekly</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <div className="mt-2">
                  <span className="text-[24px] font-bold text-[#5856D6] dark:text-[#8A87F8]">
                    {stats.longestWeekly.count}{' '}
                  </span>
                  <span className="text-[15px] font-medium text-app-text-secondary">Weeks</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Longest Daily Streak Expanded: Tall card on the right, Current top-left, Weekly bottom-left */}
        {expandedStreak === 'daily' && (
          <div className="grid grid-cols-2 gap-3.5">
            {/* Left Column: Current Streak (top) + Longest Weekly (bottom) */}
            <div className="flex flex-col gap-3.5">
              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('current')}
                className="rounded-[18px] p-4 cursor-pointer shadow-md bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white select-none flex-1 flex flex-col justify-between"
              >
                <span className="text-[12px] font-semibold text-white/70 uppercase">Current</span>
                <div>
                  <span className="text-4xl font-black text-white">{stats.currentStreak}</span>
                  <span className="text-xs text-white/70 ml-1.5 capitalize">{stats.streakUnit}</span>
                </div>
              </motion.div>

              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('weekly')}
                className="rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer select-none"
              >
                <p className="text-[12px]">
                  <span className="text-app-text-secondary">Longest </span>
                  <span className="text-app-text-primary font-semibold">Weekly</span>
                </p>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-[#5856D6] dark:text-[#8A87F8]">
                    {stats.longestWeekly.count}{' '}
                  </span>
                  <span className="text-xs text-app-text-secondary">Weeks</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Tall Expanded Longest Daily Card */}
            <motion.div
              layout
              transition={springTransition}
              onClick={() => handleToggleStreak('daily')}
              className="rounded-[20px] p-4 sm:p-5 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between select-none"
            >
              <div>
                <p className="text-[13px] leading-snug">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Daily</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>

                <div className="mt-2">
                  <span className="text-[34px] font-black text-[#FF3B30] tracking-tight">
                    {stats.longestDaily.count}{' '}
                  </span>
                  <span className="text-[17px] font-medium text-app-text-secondary">Days</span>
                </div>

                <p className="text-[13px] font-medium text-app-text-secondary mt-1">
                  {stats.longestDaily.rangeFormatted}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-app-hairline">
                <p className="text-[12px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Previous </span>
                  <span className="text-app-text-primary font-semibold">Daily</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <p className="text-[15px] font-bold text-app-text-primary mt-1">
                  {stats.previousDaily.count} Days
                </p>
                <p className="text-[12px] text-app-text-secondary mt-0.5">
                  {stats.previousDaily.rangeFormatted}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Longest Weekly Streak Expanded: Tall card on the right, Daily top-left, Current bottom-left */}
        {expandedStreak === 'weekly' && (
          <div className="grid grid-cols-2 gap-3.5">
            {/* Left Column: Longest Daily (top) + Current Streak (bottom) */}
            <div className="flex flex-col gap-3.5">
              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('daily')}
                className="rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer select-none"
              >
                <p className="text-[12px]">
                  <span className="text-app-text-secondary">Longest </span>
                  <span className="text-app-text-primary font-semibold">Daily</span>
                </p>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-[#FF3B30]">
                    {stats.longestDaily.count}{' '}
                  </span>
                  <span className="text-xs text-app-text-secondary">Days</span>
                </div>
              </motion.div>

              <motion.div
                layout
                transition={springTransition}
                onClick={() => handleToggleStreak('current')}
                className="rounded-[18px] p-4 cursor-pointer shadow-md bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white select-none flex-1 flex flex-col justify-between"
              >
                <span className="text-[12px] font-semibold text-white/70 uppercase">Current</span>
                <div>
                  <span className="text-4xl font-black text-white">{stats.currentStreak}</span>
                  <span className="text-xs text-white/70 ml-1.5 capitalize">{stats.streakUnit}</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Tall Expanded Longest Weekly Card */}
            <motion.div
              layout
              transition={springTransition}
              onClick={() => handleToggleStreak('weekly')}
              className="rounded-[20px] p-4 sm:p-5 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer flex flex-col justify-between select-none"
            >
              <div>
                <p className="text-[13px] leading-snug">
                  <span className="text-app-text-secondary font-normal">Longest </span>
                  <span className="text-app-text-primary font-semibold">Weekly</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>

                <div className="mt-2">
                  <span className="text-[34px] font-black text-[#5856D6] dark:text-[#8A87F8] tracking-tight">
                    {stats.longestWeekly.count}{' '}
                  </span>
                  <span className="text-[17px] font-medium text-app-text-secondary">Weeks</span>
                </div>

                <p className="text-[13px] font-medium text-app-text-secondary mt-1">
                  {stats.longestWeekly.rangeFormatted}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-app-hairline">
                <p className="text-[12px] leading-tight">
                  <span className="text-app-text-secondary font-normal">Previous </span>
                  <span className="text-app-text-primary font-semibold">Weekly</span>
                  <span className="text-app-text-secondary font-normal"> Streak</span>
                </p>
                <p className="text-[15px] font-bold text-app-text-primary mt-1">
                  {stats.previousWeekly.count} Weeks
                </p>
                <p className="text-[12px] text-app-text-secondary mt-0.5">
                  {stats.previousWeekly.rangeFormatted}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* 2. STATS GROUP */}
      <section>
        <h2 className="text-[22px] font-semibold text-app-text-primary tracking-tight mb-3 px-1">
          Stats
        </h2>

        {/* Top Full-Width Periwinkle Gradient Card: Entries This Year */}
        <motion.div
          layout
          transition={springTransition}
          onClick={() => handleToggleStat('entries')}
          className="rounded-[20px] p-5 sm:p-6 bg-gradient-to-r from-[#5362DE] via-[#6576EA] to-[#7E8DFA] text-white cursor-pointer shadow-md select-none active:scale-[0.99] transition-transform"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-[44px] sm:text-[52px] font-black tracking-tight leading-none block">
                {entriesScope === 'year' ? stats.entriesThisYear : stats.entriesAllTime}
              </span>
              <span className="text-[15px] font-medium text-white/85 mt-1.5 block">
                {entriesScope === 'year' ? 'Entries This Year' : 'Entries All Time'}
              </span>
            </div>

            {/* J–D Bar Chart */}
            <div className="w-full sm:w-64 pt-2 sm:pt-0">
              <div className="flex items-end justify-between h-20 gap-1.5">
                {stats.monthlyCounts.map((count, idx) => {
                  const heightPercent = Math.max(8, (count / maxMonthCount) * 100);
                  const isCurrent = new Date().getMonth() === idx;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isCurrent
                            ? 'bg-white shadow'
                            : count > 0
                            ? 'bg-white/70'
                            : 'bg-white/20'
                        }`}
                      />
                      <span className="text-[10px] font-semibold text-white/75">
                        {MONTH_LABELS[idx]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* If Entries Card is expanded: show segmented toggle and extra breakdown */}
          {expandedStat === 'entries' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-5 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex bg-black/20 p-1 rounded-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEntriesScope('year')}
                  className={`px-4 py-1.5 rounded-full transition ${
                    entriesScope === 'year' ? 'bg-white text-[#5362DE] shadow-sm' : 'text-white/80'
                  }`}
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => setEntriesScope('all')}
                  className={`px-4 py-1.5 rounded-full transition ${
                    entriesScope === 'all' ? 'bg-white text-[#5362DE] shadow-sm' : 'text-white/80'
                  }`}
                >
                  All Time
                </button>
              </div>

              <div className="flex items-center gap-6 text-xs text-white/90">
                <div>
                  <span className="font-bold text-white text-sm block">
                    {Math.round((stats.entriesThisYear / Math.max(1, new Date().getMonth() + 1)) * 10) / 10}
                  </span>
                  <span>Avg / Month</span>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div>
                  <span className="font-bold text-white text-sm block">{stats.daysJournaled}</span>
                  <span>Active Days</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Bento Grid: Words Written & Journaling Days */}
        <div className="grid grid-cols-2 gap-3.5 mt-3.5">
          {/* Words Written Card */}
          <motion.div
            layout
            transition={springTransition}
            onClick={() => handleToggleStat('words')}
            className={`rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer select-none ${
              expandedStat === 'words' ? 'col-span-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] text-app-text-secondary font-medium">Words Written</span>
            </div>

            <div className="mt-1">
              <span className="text-[26px] sm:text-[28px] font-bold text-app-text-primary tracking-tight">
                {stats.wordsAllTime.toLocaleString()}
              </span>
              <span className="text-[14px] text-app-text-secondary ml-1.5 font-medium">Words</span>
            </div>

            {expandedStat === 'words' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-3 border-t border-app-hairline grid grid-cols-3 gap-2 text-center"
              >
                <div className="p-2 rounded-xl bg-app-bg/50">
                  <span className="text-base font-bold text-app-text-primary block">
                    {stats.wordsThisYear.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-app-text-secondary font-medium uppercase">This Year</span>
                </div>
                <div className="p-2 rounded-xl bg-app-bg/50">
                  <span className="text-base font-bold text-app-text-primary block">
                    {stats.wordsThisMonth.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-app-text-secondary font-medium uppercase">This Month</span>
                </div>
                <div className="p-2 rounded-xl bg-app-bg/50">
                  <span className="text-base font-bold text-app-text-primary block">
                    {stats.avgWordsPerEntry}
                  </span>
                  <span className="text-[11px] text-app-text-secondary font-medium uppercase">Avg / Entry</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Journaling Days Card */}
          <motion.div
            layout
            transition={springTransition}
            onClick={() => handleToggleStat('days')}
            className={`rounded-[18px] p-4 bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] cursor-pointer select-none ${
              expandedStat === 'days' ? 'col-span-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] text-app-text-secondary font-medium">Journaling Days</span>
            </div>

            <div className="mt-1">
              <span className="text-[26px] sm:text-[28px] font-bold text-app-text-primary tracking-tight">
                {stats.daysJournaled}
              </span>
              <span className="text-[14px] text-app-text-secondary ml-1.5 font-medium">Days</span>
            </div>

            {expandedStat === 'days' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 pt-3 border-t border-app-hairline flex items-center justify-around text-center"
              >
                <div>
                  <span className="text-lg font-bold text-[#5856D6] dark:text-[#8A87F8] block">
                    {stats.percentOfYearJournaled}%
                  </span>
                  <span className="text-[11px] text-app-text-secondary uppercase font-medium">Of Year</span>
                </div>
                <div className="w-px h-8 bg-app-hairline" />
                <div>
                  <span className="text-lg font-bold text-app-text-primary block">
                    {stats.daysJournaledAllTime}
                  </span>
                  <span className="text-[11px] text-app-text-secondary uppercase font-medium">All Time</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};
