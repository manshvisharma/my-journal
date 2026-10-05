import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Flame,
  Calendar as CalendarIcon,
  Smile,
  ImageIcon,
  Music,
  MapPin,
  Bookmark,
} from 'lucide-react';
import { format } from 'date-fns';
import { useStats } from '../../store/selectors';
import { useJournalStore } from '../../store/useJournalStore';
import type { StreakSchedule } from '../../types';
import { haptics } from '../../lib/haptics';

interface InsightsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDateFilter?: (dateKey: string) => void;
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const springTransition = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 32,
};

export const InsightsSheet: React.FC<InsightsSheetProps> = ({
  isOpen,
  onClose,
  onSelectDateFilter,
}) => {
  const stats = useStats();
  const entriesMap = useJournalStore((state) => state.entries);
  const settings = useJournalStore((state) => state.settings);
  const updateSettings = useJournalStore((state) => state.updateSettings);

  // Interaction States
  // Streaks: 'none' (State A), 'daily' (State B), 'weekly' (State C)
  const [focusedStreak, setFocusedStreak] = useState<'none' | 'daily' | 'weekly'>('none');
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);

  // Stats: 'none' (State A), 'entries' (State B), 'journaled' (State C), 'written' (State D)
  const [focusedStat, setFocusedStat] = useState<'none' | 'entries' | 'journaled' | 'written'>('none');
  const [selectedYearScope, setSelectedYearScope] = useState<string>('all'); // 'all' or specific year '2026'

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Available years from entries
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    entriesMap.forEach((e) => {
      if (!e.deletedAt) {
        yearsSet.add(new Date(e.entryDate).getFullYear().toString());
      }
    });
    const currentY = new Date().getFullYear().toString();
    yearsSet.add(currentY);
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [entriesMap]);

  // Dynamic breakdown counts (all-time or year-scoped)
  const breakdown = useMemo(() => {
    let moodsCount = 0;
    let photosCount = 0;
    let songsCount = 0;
    let placesCount = 0;
    let bookmarkedCount = 0;
    let entriesCount = 0;
    const monthlyCounts = new Array(12).fill(0);

    entriesMap.forEach((e) => {
      if (e.deletedAt) return;
      const d = new Date(e.entryDate);
      const y = d.getFullYear().toString();
      const m = d.getMonth();

      if (selectedYearScope !== 'all' && y !== selectedYearScope) {
        return;
      }

      entriesCount++;
      monthlyCounts[m]++;
      if (e.mood) moodsCount++;
      if (e.media && e.media.length > 0) photosCount += e.media.length;
      if (e.songs && e.songs.length > 0) songsCount += e.songs.length;
      if (e.location && e.location.name) placesCount++;
      if (e.bookmarked) bookmarkedCount++;
    });

    return {
      entriesCount,
      monthlyCounts,
      moodsCount,
      photosCount,
      songsCount,
      placesCount,
      bookmarkedCount,
    };
  }, [entriesMap, selectedYearScope]);

  const maxMonthlyBar = Math.max(1, ...breakdown.monthlyCounts);

  // Calendar Helpers
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    haptics.selection();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    haptics.selection();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleStreakSchedule = (sched: StreakSchedule) => {
    haptics.selection();
    updateSettings({ streakSchedule: sched });
    setShowScheduleMenu(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Main Sheet Container */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 w-full max-h-[92vh] flex flex-col rounded-t-[32px] bg-app-bg text-app-text-primary border-t border-app-card-border shadow-2xl overflow-hidden select-none"
      >
        {/* Safe-Area Top & Header */}
        <div className="pt-safe px-5 pt-3 pb-3 border-b border-app-hairline shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-app-text-primary tracking-tight">
              Insights
            </h1>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/15 hover:bg-black/15 dark:hover:bg-white/20 text-app-text-primary flex items-center justify-center transition active:scale-95"
              aria-label="Close Insights"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Scrollable Body: Single Column */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 pb-safe space-y-7">
          {/* ========================================================================= */}
          {/* 1. STREAKS SECTION */}
          {/* ========================================================================= */}
          <section>
            <div className="text-[13px] font-semibold text-app-text-secondary uppercase tracking-wider mb-2.5 px-0.5">
              Streaks
            </div>

            {/* State A: Default (Nothing focused) */}
            {focusedStreak === 'none' && (
              <div className="space-y-3">
                {/* Top Card: Current Streak (Hero gradient card) */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.light();
                    // Gentle press animation or toggle
                  }}
                  className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white shadow-lg cursor-pointer active:scale-[0.99] transition-transform"
                >
                  {/* Decorative confetti/ribbon art */}
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
                      <circle cx="170" cy="30" r="50" fill="url(#streak-glow)" opacity="0.6" />
                      <path
                        d="M-20 150 C 40 100, 100 170, 180 120"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M20 190 C 70 120, 130 150, 220 90"
                        stroke="rgba(244,114,182,0.3)"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="streak-glow" x1="0" y1="0" x2="200" y2="200">
                          <stop stopColor="#F472B6" stopOpacity="0.4" />
                          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-white/70">Current Streak</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.selection();
                        setShowScheduleMenu((v) => !v);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/15 text-white/80 transition"
                      title="Set Schedule"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Schedule menu dropdown */}
                  {showScheduleMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative z-20 my-2 p-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 flex gap-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(['daily', 'weekdays', 'weekly'] as StreakSchedule[]).map((sched) => (
                        <button
                          key={sched}
                          type="button"
                          onClick={() => handleStreakSchedule(sched)}
                          className={`flex-1 py-1.5 rounded-xl capitalize font-semibold transition ${
                            settings.streakSchedule === sched
                              ? 'bg-white text-black shadow'
                              : 'text-white/75 hover:text-white'
                          }`}
                        >
                          {sched}
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {stats.currentStreak > 0 ? (
                    <div className="relative z-10 my-3 text-center">
                      <span className="text-[68px] sm:text-[76px] font-black tracking-tighter leading-none block text-white drop-shadow-sm">
                        {stats.currentStreak}
                      </span>
                      <span className="text-[16px] font-medium text-white/80 capitalize mt-1 block">
                        {stats.streakUnit === 'weeks' ? 'Weeks' : 'Days'}
                      </span>
                      <p className="text-[13px] text-white/60 font-normal mt-3">
                        {stats.currentStreakSince
                          ? `You've journaled every day since ${stats.currentStreakSince}.`
                          : "You're on a journaling roll!"}
                      </p>
                    </div>
                  ) : (
                    <div className="relative z-10 my-4 text-center">
                      <p className="text-[17px] font-semibold text-white">No Current Streak</p>
                      <p className="text-[13px] text-white/60 mt-1">
                        Journal at least once a week to build a streak.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          haptics.selection();
                          setShowScheduleMenu((v) => !v);
                        }}
                        className="mt-3 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition"
                      >
                        Set Schedule
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* Bottom Row: Longest Daily & Longest Weekly side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Longest Daily */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('daily');
                    }}
                    className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-sm cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform"
                  >
                    <p className="text-[13px] leading-tight text-app-text-secondary">
                      Longest <strong className="text-app-text-primary font-semibold">Daily</strong> Streak
                    </p>
                    <div className="mt-3 text-right">
                      <span className="text-[32px] font-black text-[#FF3B30] tracking-tight leading-none block">
                        {stats.longestDaily.count}
                      </span>
                      <span className="text-[13px] font-medium text-[#FF3B30] mt-0.5 block">
                        Days
                      </span>
                    </div>
                  </motion.div>

                  {/* Longest Weekly */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('weekly');
                    }}
                    className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-sm cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform"
                  >
                    <p className="text-[13px] leading-tight text-app-text-secondary">
                      Longest <strong className="text-app-text-primary font-semibold">Weekly</strong> Streak
                    </p>
                    <div className="mt-3 text-right">
                      <span className="text-[32px] font-black text-[#5856D6] dark:text-[#8A87F8] tracking-tight leading-none block">
                        {stats.longestWeekly.count}
                      </span>
                      <span className="text-[13px] font-medium text-[#5856D6] dark:text-[#8A87F8] mt-0.5 block">
                        Weeks
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* State B: "Longest Daily Streak" tapped -> Tall card on right */}
            {focusedStreak === 'daily' && (
              <div className="grid grid-cols-2 gap-3">
                {/* Left Column: Stacked Current (top) + Longest Weekly (bottom) */}
                <div className="flex flex-col gap-3">
                  {/* Compact Current Streak */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('none');
                    }}
                    className="flex-1 p-4 rounded-[20px] bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white shadow-sm cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-[12px] font-medium text-white/70">Current Streak</span>
                    <div>
                      <span className="text-[36px] font-black text-white leading-none block">
                        {stats.currentStreak}
                      </span>
                      <span className="text-[12px] font-medium text-white/70 capitalize mt-0.5 block">
                        {stats.streakUnit === 'weeks' ? 'Weeks' : 'Days'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Compact Longest Weekly */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('weekly');
                    }}
                    className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-sm cursor-pointer"
                  >
                    <p className="text-[12px] text-app-text-secondary leading-tight">
                      Longest <strong className="text-app-text-primary font-semibold">Weekly</strong>
                    </p>
                    <div className="mt-1 text-right">
                      <span className="text-[26px] font-bold text-[#5856D6] dark:text-[#8A87F8]">
                        {stats.longestWeekly.count}
                      </span>
                      <span className="text-[12px] font-medium text-[#5856D6] dark:text-[#8A87F8] ml-1">
                        Weeks
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Right Column: Tall Expanded Longest Daily */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStreak('none');
                  }}
                  className="p-5 rounded-[22px] bg-app-card border border-app-card-border shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] leading-tight text-app-text-secondary">
                        Longest <strong className="text-app-text-primary font-semibold">Daily</strong> Streak
                      </p>
                      <div className="text-right">
                        <span className="text-[34px] font-black text-[#FF3B30] leading-none block">
                          {stats.longestDaily.count}
                        </span>
                        <span className="text-[12px] font-medium text-[#FF3B30]">Days</span>
                      </div>
                    </div>
                    {stats.longestDaily.rangeFormatted && (
                      <p className="text-[13px] font-medium text-app-text-secondary mt-2">
                        {stats.longestDaily.rangeFormatted}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-app-hairline">
                    <p className="text-[12px] text-app-text-secondary">
                      Previous <strong className="text-app-text-primary font-semibold">Daily</strong> Streak
                    </p>
                    <div className="mt-1">
                      <span className="text-[20px] font-bold text-app-text-primary">
                        {stats.previousDaily.count} Days
                      </span>
                      {stats.previousDaily.rangeFormatted && (
                        <p className="text-[12px] text-app-text-secondary mt-0.5">
                          {stats.previousDaily.rangeFormatted}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* State C: "Longest Weekly Streak" tapped -> Tall card on right */}
            {focusedStreak === 'weekly' && (
              <div className="grid grid-cols-2 gap-3">
                {/* Left Column: Stacked Current (top) + Longest Daily (bottom) */}
                <div className="flex flex-col gap-3">
                  {/* Compact Current Streak */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('none');
                    }}
                    className="flex-1 p-4 rounded-[20px] bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white shadow-sm cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-[12px] font-medium text-white/70">Current Streak</span>
                    <div>
                      <span className="text-[36px] font-black text-white leading-none block">
                        {stats.currentStreak}
                      </span>
                      <span className="text-[12px] font-medium text-white/70 capitalize mt-0.5 block">
                        {stats.streakUnit === 'weeks' ? 'Weeks' : 'Days'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Compact Longest Daily */}
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStreak('daily');
                    }}
                    className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-sm cursor-pointer"
                  >
                    <p className="text-[12px] text-app-text-secondary leading-tight">
                      Longest <strong className="text-app-text-primary font-semibold">Daily</strong>
                    </p>
                    <div className="mt-1 text-right">
                      <span className="text-[26px] font-bold text-[#FF3B30]">
                        {stats.longestDaily.count}
                      </span>
                      <span className="text-[12px] font-medium text-[#FF3B30] ml-1">Days</span>
                    </div>
                  </motion.div>
                </div>

                {/* Right Column: Tall Expanded Longest Weekly */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStreak('none');
                  }}
                  className="p-5 rounded-[22px] bg-app-card border border-app-card-border shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] leading-tight text-app-text-secondary">
                        Longest <strong className="text-app-text-primary font-semibold">Weekly</strong> Streak
                      </p>
                      <div className="text-right">
                        <span className="text-[34px] font-black text-[#5856D6] dark:text-[#8A87F8] leading-none block">
                          {stats.longestWeekly.count}
                        </span>
                        <span className="text-[12px] font-medium text-[#5856D6] dark:text-[#8A87F8]">
                          Weeks
                        </span>
                      </div>
                    </div>
                    {stats.longestWeekly.rangeFormatted && (
                      <p className="text-[13px] font-medium text-app-text-secondary mt-2">
                        {stats.longestWeekly.rangeFormatted}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-app-hairline">
                    <p className="text-[12px] text-app-text-secondary">
                      Previous <strong className="text-app-text-primary font-semibold">Weekly</strong> Streak
                    </p>
                    <div className="mt-1">
                      <span className="text-[20px] font-bold text-app-text-primary">
                        {stats.previousWeekly.count} Weeks
                      </span>
                      {stats.previousWeekly.rangeFormatted && (
                        <p className="text-[12px] text-app-text-secondary mt-0.5">
                          {stats.previousWeekly.rangeFormatted}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 2. STATS SECTION */}
          {/* ========================================================================= */}
          <section>
            <div className="text-[13px] font-semibold text-app-text-secondary uppercase tracking-wider mb-2.5 px-0.5">
              Stats
            </div>

            {/* Top Card: Entries (Periwinkle / Indigo Gradient) */}
            <motion.div
              layout
              transition={springTransition}
              onClick={() => {
                haptics.selection();
                setFocusedStat((prev) => (prev === 'entries' ? 'none' : 'entries'));
              }}
              className="rounded-[24px] p-5 sm:p-6 bg-gradient-to-r from-[#5362DE] via-[#6576EA] to-[#7E8DFA] text-white shadow-lg cursor-pointer select-none mb-3"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                  <span className="text-[52px] sm:text-[60px] font-black tracking-tight leading-none block">
                    {breakdown.entriesCount}
                  </span>
                  <span className="text-[15px] font-medium text-white/90 mt-1 block">
                    Entries {selectedYearScope === 'all' ? 'All-Time' : selectedYearScope}
                  </span>
                </div>

                {/* 12-Month Bar Chart */}
                <div className="w-full sm:w-64 pt-2 sm:pt-0">
                  <div className="flex items-end justify-between h-20 gap-1.5">
                    {breakdown.monthlyCounts.map((cnt, idx) => {
                      const heightPercent = Math.max(8, (cnt / maxMonthlyBar) * 100);
                      const isCurrentM =
                        new Date().getMonth() === idx &&
                        (selectedYearScope === 'all' ||
                          selectedYearScope === new Date().getFullYear().toString());

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isCurrentM
                                ? 'bg-white shadow-md'
                                : cnt > 0
                                ? 'bg-white/70'
                                : 'bg-white/20'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              isCurrentM ? 'text-white' : 'text-white/60'
                            }`}
                          >
                            {MONTH_LABELS[idx]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* State B Expanded Content inside Entries Card */}
              {focusedStat === 'entries' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-5 pt-4 border-t border-white/20 space-y-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Category Breakdown row */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold text-white whitespace-nowrap">
                      <Smile className="w-3.5 h-3.5" />
                      <span>{breakdown.moodsCount} State of Mind</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold text-white whitespace-nowrap">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{breakdown.photosCount} Photos</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold text-white whitespace-nowrap">
                      <Music className="w-3.5 h-3.5" />
                      <span>{breakdown.songsCount} Songs</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold text-white whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{breakdown.placesCount} Places</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-semibold text-white whitespace-nowrap">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{breakdown.bookmarkedCount} Bookmarked</span>
                    </span>
                  </div>

                  {/* Year pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSelectedYearScope('all');
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                        selectedYearScope === 'all'
                          ? 'bg-white text-[#5362DE] shadow'
                          : 'bg-black/20 text-white/80 hover:text-white'
                      }`}
                    >
                      All-time
                    </button>
                    {availableYears.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setSelectedYearScope(yr);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                          selectedYearScope === yr
                            ? 'bg-white text-[#5362DE] shadow'
                            : 'bg-black/20 text-white/80 hover:text-white'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Bottom Row of 3 Tiles (Journaled, Moods, Written) with Morph reflow */}
            {/* State A: 3 equal tiles */}
            {focusedStat !== 'journaled' && focusedStat !== 'written' && (
              <div className="grid grid-cols-3 gap-2.5">
                {/* Journaled */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStat('journaled');
                  }}
                  className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#7B1D28] via-[#5C1520] to-[#3B0E14] text-white shadow-md cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform"
                >
                  <span className="text-[12px] font-medium text-white/70 block">Journaled</span>
                  <div className="my-2">
                    <span className="text-[28px] sm:text-[32px] font-black leading-none block">
                      {stats.daysJournaledAllTime}
                    </span>
                    <span className="text-[11px] font-medium text-white/70 mt-0.5 block">Days</span>
                  </div>
                </motion.div>

                {/* Third Tile: Moods Logged */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => haptics.light()}
                  className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#3F2B76] via-[#2D1F57] to-[#1C1338] text-white shadow-md cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform"
                >
                  <span className="text-[12px] font-medium text-white/70 block">State of Mind</span>
                  <div className="my-2">
                    <span className="text-[28px] sm:text-[32px] font-black leading-none block">
                      {breakdown.moodsCount}
                    </span>
                    <span className="text-[11px] font-medium text-white/70 mt-0.5 block">Logged</span>
                  </div>
                </motion.div>

                {/* Written */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStat('written');
                  }}
                  className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#8B2D38] via-[#6B1F2A] to-[#4A141D] text-white shadow-md cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-transform"
                >
                  <span className="text-[12px] font-medium text-white/70 block">Written</span>
                  <div className="my-2">
                    <span className="text-[28px] sm:text-[32px] font-black leading-none block">
                      {stats.wordsAllTime > 9999
                        ? `${(stats.wordsAllTime / 1000).toFixed(1)}k`
                        : stats.wordsAllTime.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-medium text-white/70 mt-0.5 block">Words</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* State C: "Journaled" tapped -> Spans 2/3 on left, remaining stacked on right */}
            {focusedStat === 'journaled' && (
              <div className="grid grid-cols-3 gap-2.5">
                {/* Journaled Expanded (2 cols) */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStat('none');
                  }}
                  className="col-span-2 p-5 rounded-[22px] bg-gradient-to-br from-[#7B1D28] via-[#5C1520] to-[#3B0E14] text-white shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[13px] font-medium text-white/70 block">Journaled</span>
                    <div className="my-2">
                      <span className="text-[44px] font-black leading-none block">
                        {stats.daysJournaledAllTime.toLocaleString()}
                      </span>
                      <span className="text-[13px] font-medium text-white/70 mt-0.5 block">Days</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/20 flex justify-between text-xs">
                    <div>
                      <strong className="block text-sm font-bold">{stats.daysJournaled}</strong>
                      <span className="text-white/60">This Year</span>
                    </div>
                    <div>
                      <strong className="block text-sm font-bold">
                        {stats.monthlyCounts[new Date().getMonth()]}
                      </strong>
                      <span className="text-white/60">This Month</span>
                    </div>
                  </div>
                </motion.div>

                {/* Right Column Stack: Moods (top) & Written (bottom) */}
                <div className="flex flex-col gap-2.5">
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => haptics.light()}
                    className="p-3 rounded-[18px] bg-gradient-to-br from-[#3F2B76] via-[#2D1F57] to-[#1C1338] text-white shadow-sm flex-1 flex flex-col justify-center"
                  >
                    <span className="text-[11px] text-white/70 block">Moods</span>
                    <span className="text-[22px] font-bold leading-none block mt-0.5">
                      {breakdown.moodsCount}
                    </span>
                  </motion.div>

                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStat('written');
                    }}
                    className="p-3 rounded-[18px] bg-gradient-to-br from-[#8B2D38] via-[#6B1F2A] to-[#4A141D] text-white shadow-sm flex-1 flex flex-col justify-center cursor-pointer"
                  >
                    <span className="text-[11px] text-white/70 block">Written</span>
                    <span className="text-[20px] font-bold leading-none block mt-0.5">
                      {stats.wordsAllTime > 9999
                        ? `${(stats.wordsAllTime / 1000).toFixed(1)}k`
                        : stats.wordsAllTime.toLocaleString()}
                    </span>
                  </motion.div>
                </div>
              </div>
            )}

            {/* State D: "Written" tapped -> Spans 2/3 on right, remaining stacked on left */}
            {focusedStat === 'written' && (
              <div className="grid grid-cols-3 gap-2.5">
                {/* Left Column Stack: Journaled (top) & Moods (bottom) */}
                <div className="flex flex-col gap-2.5">
                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => {
                      haptics.selection();
                      setFocusedStat('journaled');
                    }}
                    className="p-3 rounded-[18px] bg-gradient-to-br from-[#7B1D28] via-[#5C1520] to-[#3B0E14] text-white shadow-sm flex-1 flex flex-col justify-center cursor-pointer"
                  >
                    <span className="text-[11px] text-white/70 block">Journaled</span>
                    <span className="text-[22px] font-bold leading-none block mt-0.5">
                      {stats.daysJournaledAllTime}
                    </span>
                  </motion.div>

                  <motion.div
                    layout
                    transition={springTransition}
                    onClick={() => haptics.light()}
                    className="p-3 rounded-[18px] bg-gradient-to-br from-[#3F2B76] via-[#2D1F57] to-[#1C1338] text-white shadow-sm flex-1 flex flex-col justify-center"
                  >
                    <span className="text-[11px] text-white/70 block">Moods</span>
                    <span className="text-[22px] font-bold leading-none block mt-0.5">
                      {breakdown.moodsCount}
                    </span>
                  </motion.div>
                </div>

                {/* Written Expanded (2 cols) */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStat('none');
                  }}
                  className="col-span-2 p-5 rounded-[22px] bg-gradient-to-br from-[#8B2D38] via-[#6B1F2A] to-[#4A141D] text-white shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[13px] font-medium text-white/70 block">Words Written</span>
                    <div className="my-2">
                      <span className="text-[40px] font-black leading-none block">
                        {stats.wordsAllTime.toLocaleString()}
                      </span>
                      <span className="text-[13px] font-medium text-white/70 mt-0.5 block">Words</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/20 flex justify-between text-xs">
                    <div>
                      <strong className="block text-sm font-bold">
                        {stats.wordsThisYear.toLocaleString()}
                      </strong>
                      <span className="text-white/60">This Year</span>
                    </div>
                    <div>
                      <strong className="block text-sm font-bold">
                        {stats.wordsThisMonth.toLocaleString()}
                      </strong>
                      <span className="text-white/60">This Month</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 3. CALENDAR SECTION */}
          {/* ========================================================================= */}
          <section>
            <div className="text-[13px] font-semibold text-app-text-secondary uppercase tracking-wider mb-2.5 px-0.5">
              Calendar
            </div>

            {/* Calendar Card (Plain surface card) */}
            <div className="p-5 sm:p-6 rounded-[24px] bg-app-card border border-app-card-border shadow-sm">
              {/* Month Header Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold text-app-text-primary">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Weekday headers: SUN MON TUE WED THU FRI SAT */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-app-text-tertiary tracking-wider mb-2">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(
                    day
                  ).padStart(2, '0')}`;
                  const hasEntries = stats.entryDatesSet.has(dateKey);
                  const isToday =
                    calYear === new Date().getFullYear() &&
                    calMonth === new Date().getMonth() &&
                    day === new Date().getDate();

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (hasEntries) {
                          haptics.selection();
                          onClose();
                          if (onSelectDateFilter) {
                            onSelectDateFilter(dateKey);
                          }
                        }
                      }}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition ${
                        hasEntries
                          ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95'
                          : 'opacity-40 cursor-default'
                      }`}
                    >
                      <span
                        className={`text-[13px] font-semibold flex items-center justify-center ${
                          isToday
                            ? 'w-7 h-7 rounded-full bg-app-accent text-white shadow-sm'
                            : 'text-app-text-primary'
                        }`}
                      >
                        {day}
                      </span>
                      {hasEntries && !isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-app-accent mt-0.5 shadow-xs" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};
