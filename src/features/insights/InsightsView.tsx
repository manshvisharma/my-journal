import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, BarChart3, Calendar as CalendarIcon, Type } from 'lucide-react';
import { useStats } from '../../store/selectors';
import { useJournalStore } from '../../store/useJournalStore';
import type { StreakSchedule } from '../../types';
import { haptics } from '../../lib/haptics';

interface InsightsViewProps {
  onBack: () => void;
  onSelectDateFilter?: (dateStr: string) => void;
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

export const InsightsView: React.FC<InsightsViewProps> = ({ onBack, onSelectDateFilter }) => {
  const stats = useStats();
  const settings = useJournalStore((state) => state.settings);
  const updateSettings = useJournalStore((state) => state.updateSettings);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const maxMonthCount = Math.max(1, ...stats.monthlyCounts);

  const handleStreakScheduleChange = (schedule: StreakSchedule) => {
    haptics.selection();
    updateSettings({ streakSchedule: schedule });
  };

  // Calendar rendering helpers
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const prevMonth = () => {
    haptics.selection();
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    haptics.selection();
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-y-auto overscroll-contain select-none text-white">
      {/* Header */}
      <header className="px-5 pt-8 pb-4 sm:px-8 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => { haptics.light(); onBack(); }}
          className="flex items-center gap-1.5 p-2 -ml-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Journals</span>
        </button>

        <h1 className="text-lg font-bold">Insights</h1>

        {/* Year Selector */}
        <div className="flex items-center gap-1 bg-white/8 rounded-full px-2 py-1 border border-white/10">
          <button
            type="button"
            onClick={() => { haptics.selection(); setSelectedYear((y) => y - 1); }}
            className="p-1 hover:text-white text-white/60"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold px-1">{selectedYear}</span>
          <button
            type="button"
            onClick={() => { haptics.selection(); setSelectedYear((y) => y + 1); }}
            className="p-1 hover:text-white text-white/60"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 px-5 sm:px-8 pb-16 max-w-2xl w-full mx-auto space-y-5">
        {/* Entries This Year Banner */}
        <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#6B74F5]/30 to-[#8F97FF]/10 border border-[#6B74F5]/30 backdrop-blur-xl shadow-xl">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-5xl font-black tracking-tight">{stats.entriesThisYear}</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mt-1">
                entries in {selectedYear}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{stats.daysJournaled}</span>
              <p className="text-xs font-medium text-white/60">Days journaled</p>
            </div>
          </div>

          {/* 12-Month Bar Chart */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-end justify-between h-28 gap-1.5 px-1">
              {stats.monthlyCounts.map((count, idx) => {
                const heightPercent = Math.max(8, (count / maxMonthCount) * 100);
                const isCurrentMonth =
                  new Date().getFullYear() === selectedYear && new Date().getMonth() === idx;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    {count > 0 && (
                      <span className="text-[10px] font-bold text-white/80 opacity-0 group-hover:opacity-100 transition">
                        {count}
                      </span>
                    )}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isCurrentMonth
                          ? 'bg-gradient-to-t from-[#6B74F5] to-[#A3AAFF] shadow-lg shadow-indigo-500/40'
                          : count > 0
                          ? 'bg-white/40 group-hover:bg-white/60'
                          : 'bg-white/10'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isCurrentMonth ? 'text-[#8F97FF]' : 'text-white/50'
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

        {/* Streak Card */}
        <div className="p-6 rounded-[28px] bg-white/6 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Current Streak</h3>
                <span className="text-xs text-white/50">Keep your habit alive</span>
              </div>
            </div>

            {/* Streak schedule selector pills */}
            <div className="flex bg-white/8 p-0.5 rounded-xl border border-white/10 text-xs">
              {(['daily', 'weekdays', 'weekly'] as StreakSchedule[]).map((sched) => (
                <button
                  key={sched}
                  type="button"
                  onClick={() => handleStreakScheduleChange(sched)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    settings.streakSchedule === sched
                      ? 'bg-[#6B74F5] text-white shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {sched}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{stats.currentStreak}</span>
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">
              {stats.streakUnit}
            </span>
          </div>
        </div>

        {/* Words Written Card */}
        <div className="p-6 rounded-[28px] bg-white/6 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Type className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold">Words Written</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white/4 border border-white/8">
              <span className="text-xl font-bold block">{stats.wordsAllTime.toLocaleString()}</span>
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
                All Time
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/4 border border-white/8">
              <span className="text-xl font-bold block">{stats.wordsThisYear.toLocaleString()}</span>
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
                This Year
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/4 border border-white/8">
              <span className="text-xl font-bold block">{stats.wordsThisMonth.toLocaleString()}</span>
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
                This Month
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Grid View */}
        <div className="p-6 rounded-[28px] bg-white/6 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#8F97FF]" />
              <h3 className="text-sm font-bold">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-white/40 mb-2">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(
                day
              ).padStart(2, '0')}`;
              const hasEntry = stats.entryDatesSet.has(dateKey);
              const isTodayDate =
                calendarYear === new Date().getFullYear() &&
                calendarMonth === new Date().getMonth() &&
                day === new Date().getDate();

              return (
                <div
                  key={day}
                  onClick={() => hasEntry && onSelectDateFilter && onSelectDateFilter(dateKey)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition ${
                    hasEntry
                      ? 'cursor-pointer hover:bg-white/15'
                      : 'opacity-50'
                  } ${isTodayDate ? 'border border-[#6B74F5]' : ''}`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  {hasEntry && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6B74F5] mt-0.5 shadow-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
