import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  Smile,
  ImageIcon,
  Music,
  MapPin,
  Bookmark,
  Dumbbell,
  Headphones,
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
  stiffness: 350,
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
  const [selectedYearScope, setSelectedYearScope] = useState<string>('all');

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
    let workoutsCount = 0;
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
      if (e.tags && e.tags.some((t) => /workout|gym|run|fitness|exercise/i.test(t))) {
        workoutsCount++;
      }
    });

    return {
      entriesCount,
      monthlyCounts,
      moodsCount,
      photosCount,
      songsCount,
      placesCount,
      bookmarkedCount,
      workoutsCount,
      mediaCount: photosCount + songsCount,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            key="insights-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Main Sheet Container: mobile bottom sheet, desktop compact centered card */}
          <motion.div
            key="insights-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative z-10 w-full sm:max-w-[480px] md:max-w-[500px] max-h-[92vh] sm:max-h-[86vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] bg-[#F2F2F7] dark:bg-[#0C0C12] text-app-text-primary border-t sm:border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden select-none"
          >
            {/* Safe-Area Top & Header */}
            <div className="pt-[max(env(safe-area-inset-top,0px),12px)] px-5 pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
              {/* Apple iOS Grabber Pill */}
              <div className="w-10 h-1.5 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-2.5" />
              <div className="flex items-center justify-between">
                <h1 className="text-[24px] font-bold text-black dark:text-white tracking-tight">
                  Insights
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/15 hover:bg-black/15 dark:hover:bg-white/20 text-black dark:text-white flex items-center justify-center transition active:scale-95"
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
                <div className="text-[13px] font-semibold text-[#6C6C70] dark:text-[#8E8E93] uppercase tracking-wider mb-2.5 px-0.5">
                  Streaks
                </div>

                {/* State A: Default (Nothing focused) */}
                {focusedStreak === 'none' && (
                  <div className="space-y-3">
                    {/* Top Card: Current Streak (Hero plum gradient card with confetti) */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => {
                        haptics.light();
                      }}
                      className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 bg-gradient-to-br from-[#3B1527] via-[#2A102B] to-[#170C22] text-white shadow-md cursor-pointer active:scale-[0.99] transition-transform"
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
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition"
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
                          className="relative z-20 my-2 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 flex gap-1 text-xs"
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
                        className="p-4 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none cursor-pointer flex items-start justify-between active:scale-[0.98] transition-transform"
                      >
                        <div className="text-[13px] leading-[17px]">
                          <div className="text-[#8E8E93]">Longest</div>
                          <div className="font-bold text-black dark:text-white">Daily</div>
                          <div className="text-[#8E8E93]">Streak</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[36px] font-black text-[#FF3B30] dark:text-[#FF453A] tracking-tight leading-none block">
                            {stats.longestDaily.count}
                          </span>
                          <span className="text-[12px] font-medium text-[#FF3B30] dark:text-[#FF453A] mt-0.5 block">
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
                        className="p-4 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none cursor-pointer flex items-start justify-between active:scale-[0.98] transition-transform"
                      >
                        <div className="text-[13px] leading-[17px]">
                          <div className="text-[#8E8E93]">Longest</div>
                          <div className="font-bold text-black dark:text-white">Weekly</div>
                          <div className="text-[#8E8E93]">Streak</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[36px] font-black text-[#5856D6] dark:text-[#7066F2] tracking-tight leading-none block">
                            {stats.longestWeekly.count}
                          </span>
                          <span className="text-[12px] font-medium text-[#5856D6] dark:text-[#7066F2] mt-0.5 block">
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
                          <span className="text-[38px] font-black text-white leading-none block">
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
                        className="p-4 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none cursor-pointer flex items-start justify-between"
                      >
                        <div className="text-[12px] leading-[16px]">
                          <div className="text-[#8E8E93]">Longest</div>
                          <div className="font-bold text-black dark:text-white">Weekly</div>
                          <div className="text-[#8E8E93]">Streak</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[28px] font-black text-[#5856D6] dark:text-[#7066F2] leading-none block">
                            {stats.longestWeekly.count}
                          </span>
                          <span className="text-[11px] font-medium text-[#5856D6] dark:text-[#7066F2] block mt-0.5">
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
                      className="p-4 sm:p-5 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="text-[13px] leading-[17px]">
                            <div className="text-[#8E8E93]">Longest</div>
                            <div className="font-bold text-black dark:text-white">Daily</div>
                            <div className="text-[#8E8E93]">Streak</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[36px] font-black text-[#FF3B30] dark:text-[#FF453A] leading-none block">
                              {stats.longestDaily.count}
                            </span>
                            <span className="text-[12px] font-medium text-[#FF3B30] dark:text-[#FF453A]">Days</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-medium text-[#8E8E93] mt-2">
                          {stats.longestDaily.rangeFormatted || '20 Aug – 5 Oct'}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-start justify-between">
                          <div className="text-[12px] leading-[16px]">
                            <div className="text-[#8E8E93]">Previous</div>
                            <div className="font-bold text-black dark:text-white">Daily</div>
                            <div className="text-[#8E8E93]">Streak</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[26px] font-black text-black dark:text-white leading-none block">
                              {stats.previousDaily.count}
                            </span>
                            <span className="text-[11px] font-medium text-[#8E8E93]">Days</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-medium text-[#8E8E93] mt-2">
                          {stats.previousDaily.rangeFormatted || '30 Jul – 19 Aug'}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* State C: "Longest Weekly Streak" tapped -> Tall card on right */}
                {focusedStreak === 'weekly' && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Left Column: Stacked Longest Daily (top) + Current Streak (bottom) */}
                    <div className="flex flex-col gap-3">
                      {/* Compact Longest Daily */}
                      <motion.div
                        layout
                        transition={springTransition}
                        onClick={() => {
                          haptics.selection();
                          setFocusedStreak('daily');
                        }}
                        className="p-4 rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none cursor-pointer flex items-start justify-between"
                      >
                        <div className="text-[12px] leading-[16px]">
                          <div className="text-[#8E8E93]">Longest</div>
                          <div className="font-bold text-black dark:text-white">Daily</div>
                          <div className="text-[#8E8E93]">Streak</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[28px] font-black text-[#FF3B30] dark:text-[#FF453A] leading-none block">
                            {stats.longestDaily.count}
                          </span>
                          <span className="text-[11px] font-medium text-[#FF3B30] dark:text-[#FF453A] block mt-0.5">
                            Days
                          </span>
                        </div>
                      </motion.div>

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
                          <span className="text-[38px] font-black text-white leading-none block">
                            {stats.currentStreak}
                          </span>
                          <span className="text-[12px] font-medium text-white/70 capitalize mt-0.5 block">
                            {stats.streakUnit === 'weeks' ? 'Weeks' : 'Days'}
                          </span>
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
                      className="p-4 sm:p-5 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="text-[13px] leading-[17px]">
                            <div className="text-[#8E8E93]">Longest</div>
                            <div className="font-bold text-black dark:text-white">Weekly</div>
                            <div className="text-[#8E8E93]">Streak</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[36px] font-black text-[#5856D6] dark:text-[#7066F2] leading-none block">
                              {stats.longestWeekly.count}
                            </span>
                            <span className="text-[12px] font-medium text-[#5856D6] dark:text-[#7066F2]">Weeks</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-medium text-[#8E8E93] mt-2">
                          {stats.longestWeekly.rangeFormatted || '9 Feb – 5 Oct'}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-start justify-between">
                          <div className="text-[12px] leading-[16px]">
                            <div className="text-[#8E8E93]">Previous</div>
                            <div className="font-bold text-black dark:text-white">Weekly</div>
                            <div className="text-[#8E8E93]">Streak</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[26px] font-black text-black dark:text-white leading-none block">
                              {stats.previousWeekly.count}
                            </span>
                            <span className="text-[11px] font-medium text-[#8E8E93]">Weeks</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-medium text-[#8E8E93] mt-2">
                          {stats.previousWeekly.rangeFormatted || '28 Dec 2025 – 8 Jan 2026'}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </section>

              {/* ========================================================================= */}
              {/* 2. STATS SECTION */}
              {/* ========================================================================= */}
              <section>
                <div className="text-[13px] font-semibold text-[#6C6C70] dark:text-[#8E8E93] uppercase tracking-wider mb-2.5 px-0.5">
                  Stats
                </div>

                {/* Hero Card: Entries This Year (Periwinkle Blue gradient) */}
                <motion.div
                  layout
                  transition={springTransition}
                  onClick={() => {
                    haptics.selection();
                    setFocusedStat((prev) => (prev === 'entries' ? 'none' : 'entries'));
                  }}
                  className="rounded-[24px] p-5 sm:p-6 bg-gradient-to-r from-[#5362DE] via-[#6576EA] to-[#7E8DFA] text-white shadow-md cursor-pointer select-none mb-3"
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
                                    ? 'bg-white/80'
                                    : 'bg-white/25'
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

                  {/* Expanded Content inside Entries Card (Matching Reference Screenshot) */}
                  {focusedStat === 'entries' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-5 pt-4 border-t border-white/20 space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Breakdown Stats Row */}
                      <div className="grid grid-cols-5 gap-2 text-center pt-1">
                        <div>
                          <div className="text-[20px] font-black text-white leading-none">
                            {breakdown.moodsCount}
                          </div>
                          <div className="text-[10px] font-medium text-white/75 mt-1 leading-tight">
                            State of Mind
                          </div>
                        </div>
                        <div>
                          <div className="text-[20px] font-black text-white leading-none">
                            {breakdown.photosCount}
                          </div>
                          <div className="text-[10px] font-medium text-white/75 mt-1 leading-tight">
                            Photos
                          </div>
                        </div>
                        <div>
                          <div className="text-[20px] font-black text-white leading-none">
                            {breakdown.mediaCount}
                          </div>
                          <div className="text-[10px] font-medium text-white/75 mt-1 leading-tight">
                            Media
                          </div>
                        </div>
                        <div>
                          <div className="text-[20px] font-black text-white leading-none">
                            {breakdown.workoutsCount}
                          </div>
                          <div className="text-[10px] font-medium text-white/75 mt-1 leading-tight">
                            Workouts
                          </div>
                        </div>
                        <div>
                          <div className="text-[20px] font-black text-white leading-none">
                            {breakdown.songsCount}
                          </div>
                          <div className="text-[10px] font-medium text-white/75 mt-1 leading-tight">
                            Audio
                          </div>
                        </div>
                      </div>

                      {/* Year Selection Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-white/15">
                        <button
                          type="button"
                          onClick={() => {
                            haptics.selection();
                            setSelectedYearScope('all');
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                            selectedYearScope === 'all'
                              ? 'bg-[#242C6B] text-white shadow-inner'
                              : 'bg-black/15 text-white/80 hover:text-white'
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
                                ? 'bg-[#242C6B] text-white shadow-inner'
                                : 'bg-black/15 text-white/80 hover:text-white'
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Bottom Bento Tiles: Journaled, Visited, Written with layout morph */}
                {/* State A: 3 Equal Tiles */}
                {focusedStat !== 'journaled' && focusedStat !== 'written' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* 1. Journaled */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => {
                        haptics.selection();
                        setFocusedStat('journaled');
                      }}
                      className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#DE5453] to-[#C93F3E] text-white shadow-md cursor-pointer flex flex-col justify-between aspect-square active:scale-[0.98] transition-transform"
                    >
                      <span className="text-[12px] font-medium text-white/80 block">Journaled</span>
                      <div>
                        <span className="text-[30px] sm:text-[34px] font-black leading-none block">
                          {stats.daysJournaledAllTime || stats.daysJournaled}
                        </span>
                        <span className="text-[11px] font-medium text-white/80 mt-0.5 block">Days</span>
                      </div>
                    </motion.div>

                    {/* 2. Middle Tile: Locations / Saved (Real User Metrics) */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => haptics.light()}
                      className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#4C5375] to-[#3B4160] text-white shadow-md flex flex-col justify-between items-center text-center aspect-square active:scale-[0.98] transition-transform"
                    >
                      <span className="text-[12px] font-medium text-white/80 block">
                        {breakdown.placesCount > 0 ? 'Locations' : breakdown.bookmarkedCount > 0 ? 'Saved' : 'Locations'}
                      </span>
                      {breakdown.placesCount > 0 ? (
                        <MapPin className="w-6 h-6 text-white my-auto" />
                      ) : breakdown.bookmarkedCount > 0 ? (
                        <Bookmark className="w-6 h-6 text-white my-auto fill-current" />
                      ) : (
                        <MapPin className="w-6 h-6 text-white/70 my-auto" />
                      )}
                      <span className="text-[12px] font-medium text-white/80 block">
                        {breakdown.placesCount > 0
                          ? `${breakdown.placesCount} ${breakdown.placesCount === 1 ? 'location' : 'locations'}`
                          : breakdown.bookmarkedCount > 0
                          ? `${breakdown.bookmarkedCount} ${breakdown.bookmarkedCount === 1 ? 'saved' : 'saved'}`
                          : '0 visited'}
                      </span>
                    </motion.div>

                    {/* 3. Written */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => {
                        haptics.selection();
                        setFocusedStat('written');
                      }}
                      className="p-3.5 sm:p-4 rounded-[20px] bg-gradient-to-br from-[#C05246] to-[#A84237] text-white shadow-md cursor-pointer flex flex-col justify-between aspect-square active:scale-[0.98] transition-transform"
                    >
                      <span className="text-[12px] font-medium text-white/80 block">Written</span>
                      <div>
                        <span className="text-[30px] sm:text-[34px] font-black leading-none block">
                          {stats.wordsAllTime > 9999
                            ? `${Math.round(stats.wordsAllTime / 1000)}K`
                            : stats.wordsAllTime.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-white/80 mt-0.5 block">Words</span>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* State C: "Journaled" tapped -> Tall card on left, remaining stacked on right */}
                {focusedStat === 'journaled' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Left: Journaled Expanded (spans 2 cols) */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => {
                        haptics.selection();
                        setFocusedStat('none');
                      }}
                      className="col-span-2 p-5 rounded-[22px] bg-gradient-to-br from-[#DE5453] to-[#C93F3E] text-white shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[13px] font-medium text-white/80 block">Journaled</span>
                        <div className="my-2">
                          <span className="text-[46px] font-black leading-none block">
                            {stats.daysJournaledAllTime || stats.daysJournaled}
                          </span>
                          <span className="text-[13px] font-medium text-white/80 mt-0.5 block">Days</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/20 flex justify-between text-xs">
                        <div>
                          <strong className="block text-sm font-bold">
                            {stats.monthlyCounts[new Date().getMonth()]}
                          </strong>
                          <span className="text-white/70">This Month</span>
                        </div>
                        <div>
                          <strong className="block text-sm font-bold">{stats.daysJournaled}</strong>
                          <span className="text-white/70">This Year</span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Right Column Stack: Visited/Locations (top) & Written (bottom) */}
                    <div className="flex flex-col gap-2.5">
                      <motion.div
                        layout
                        transition={springTransition}
                        onClick={() => haptics.light()}
                        className="p-3 rounded-[18px] bg-gradient-to-br from-[#4C5375] to-[#3B4160] text-white shadow-sm flex-1 flex flex-col justify-between items-center text-center py-3"
                      >
                        <span className="text-[11px] text-white/80 block">
                          {breakdown.placesCount > 0 ? 'Locations' : breakdown.bookmarkedCount > 0 ? 'Saved' : 'Locations'}
                        </span>
                        {breakdown.placesCount > 0 ? (
                          <MapPin className="w-5 h-5 text-white" />
                        ) : breakdown.bookmarkedCount > 0 ? (
                          <Bookmark className="w-5 h-5 text-white fill-current" />
                        ) : (
                          <MapPin className="w-5 h-5 text-white/70" />
                        )}
                        <span className="text-[11px] text-white/80 block">
                          {breakdown.placesCount > 0
                            ? `${breakdown.placesCount} ${breakdown.placesCount === 1 ? 'place' : 'places'}`
                            : breakdown.bookmarkedCount > 0
                            ? `${breakdown.bookmarkedCount} ${breakdown.bookmarkedCount === 1 ? 'saved' : 'saved'}`
                            : '0 visited'}
                        </span>
                      </motion.div>

                      <motion.div
                        layout
                        transition={springTransition}
                        onClick={() => {
                          haptics.selection();
                          setFocusedStat('written');
                        }}
                        className="p-3 rounded-[18px] bg-gradient-to-br from-[#C05246] to-[#A84237] text-white shadow-sm flex-1 flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-[11px] text-white/80 block">Written</span>
                        <span className="text-[20px] font-bold leading-none block mt-0.5">
                          {stats.wordsAllTime > 9999
                            ? `${Math.round(stats.wordsAllTime / 1000)}K`
                            : stats.wordsAllTime.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-white/70 block mt-0.5">Words</span>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* State D: "Written" tapped -> Tall card on right, remaining stacked on left */}
                {focusedStat === 'written' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Left Column Stack: Journaled (top) & Visited/Locations (bottom) */}
                    <div className="flex flex-col gap-2.5">
                      <motion.div
                        layout
                        transition={springTransition}
                        onClick={() => {
                          haptics.selection();
                          setFocusedStat('journaled');
                        }}
                        className="p-3 rounded-[18px] bg-gradient-to-br from-[#DE5453] to-[#C93F3E] text-white shadow-sm flex-1 flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-[11px] text-white/80 block">Journaled</span>
                        <span className="text-[20px] font-bold leading-none block mt-0.5">
                          {stats.daysJournaledAllTime || stats.daysJournaled}
                        </span>
                        <span className="text-[10px] text-white/70 block mt-0.5">Days</span>
                      </motion.div>

                      <motion.div
                        layout
                        transition={springTransition}
                        onClick={() => haptics.light()}
                        className="p-3 rounded-[18px] bg-gradient-to-br from-[#4C5375] to-[#3B4160] text-white shadow-sm flex-1 flex flex-col justify-between items-center text-center py-3"
                      >
                        <span className="text-[11px] text-white/80 block">
                          {breakdown.placesCount > 0 ? 'Locations' : breakdown.bookmarkedCount > 0 ? 'Saved' : 'Locations'}
                        </span>
                        {breakdown.placesCount > 0 ? (
                          <MapPin className="w-5 h-5 text-white" />
                        ) : breakdown.bookmarkedCount > 0 ? (
                          <Bookmark className="w-5 h-5 text-white fill-current" />
                        ) : (
                          <MapPin className="w-5 h-5 text-white/70" />
                        )}
                        <span className="text-[11px] text-white/80 block">
                          {breakdown.placesCount > 0
                            ? `${breakdown.placesCount} ${breakdown.placesCount === 1 ? 'place' : 'places'}`
                            : breakdown.bookmarkedCount > 0
                            ? `${breakdown.bookmarkedCount} ${breakdown.bookmarkedCount === 1 ? 'saved' : 'saved'}`
                            : '0 visited'}
                        </span>
                      </motion.div>
                    </div>

                    {/* Right: Written Expanded (spans 2 cols) */}
                    <motion.div
                      layout
                      transition={springTransition}
                      onClick={() => {
                        haptics.selection();
                        setFocusedStat('none');
                      }}
                      className="col-span-2 p-5 rounded-[22px] bg-gradient-to-br from-[#C05246] to-[#A84237] text-white shadow-md cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[13px] font-medium text-white/80 block">Written</span>
                        <div className="my-2">
                          <span className="text-[42px] font-black leading-none block">
                            {stats.wordsAllTime.toLocaleString()}
                          </span>
                          <span className="text-[13px] font-medium text-white/80 mt-0.5 block">Words</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/20 flex justify-between text-xs">
                        <div>
                          <strong className="block text-sm font-bold">
                            {stats.wordsThisMonth > 999
                              ? `${(stats.wordsThisMonth / 1000).toFixed(1)}K`
                              : stats.wordsThisMonth}
                          </strong>
                          <span className="text-white/70">This Month</span>
                        </div>
                        <div>
                          <strong className="block text-sm font-bold">
                            {stats.wordsThisYear > 999
                              ? `${Math.round(stats.wordsThisYear / 1000)}K`
                              : stats.wordsThisYear}
                          </strong>
                          <span className="text-white/70">This Year</span>
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
                <div className="text-[13px] font-semibold text-[#6C6C70] dark:text-[#8E8E93] uppercase tracking-wider mb-2.5 px-0.5">
                  Calendar
                </div>

                {/* Calendar Card (Pure white card in light mode, dark card in dark mode) */}
                <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none">
                  {/* Month Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[17px] font-bold text-black dark:text-white flex items-center gap-1">
                        {MONTH_NAMES[calMonth]} {calYear}
                        <ChevronRight className="w-4 h-4 text-[#5856D6] dark:text-[#7066F2] inline stroke-[2.5]" />
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#5856D6] dark:text-[#7066F2] transition active:scale-95"
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#5856D6] dark:text-[#7066F2] transition active:scale-95"
                      >
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday headers: SUN MON TUE WED THU FRI SAT */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#8E8E93] tracking-wider mb-2">
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
                            haptics.selection();
                            onClose();
                            if (onSelectDateFilter) {
                              onSelectDateFilter(dateKey);
                            }
                          }}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 ${
                            hasEntries ? '' : 'text-black/60 dark:text-white/60'
                          }`}
                        >
                          <span
                            className={`text-[13px] font-semibold flex items-center justify-center ${
                              isToday
                                ? 'w-7 h-7 rounded-full bg-[#5856D6] dark:bg-[#7066F2] text-white shadow-xs'
                                : hasEntries
                                ? 'text-black dark:text-white font-bold'
                                : 'text-black/75 dark:text-white/75'
                            }`}
                          >
                            {day}
                          </span>
                          {hasEntries && !isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5856D6] dark:bg-[#7066F2] mt-0.5 shadow-xs" />
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
      )}
    </AnimatePresence>
  );
};
