import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  X,
  Check,
} from 'lucide-react';
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  isSameDay,
  isToday as isDayToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { haptics } from '../lib/haptics';

export interface IOSDateTimePickerProps {
  isOpen: boolean;
  value: number; // epoch ms
  onChange: (newTimestamp: number) => void;
  onClose: () => void;
  title?: string;
}

export const IOSDateTimePicker: React.FC<IOSDateTimePickerProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  title = 'Date & Time',
}) => {
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(value || Date.now()));
  const [viewMonth, setViewMonth] = useState<Date>(new Date(value || Date.now()));
  const [showMonthYearPicker, setShowMonthYearPicker] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const d = new Date(value || Date.now());
      setSelectedDate(d);
      setViewMonth(d);
      setShowMonthYearPicker(false);
      haptics.selection();
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  // Derive time components
  const hours24 = selectedDate.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = selectedDate.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';

  const updateSelectedDate = (updates: Partial<{
    year: number;
    month: number;
    day: number;
    hours: number;
    minutes: number;
  }>) => {
    const d = new Date(selectedDate);
    if (updates.year !== undefined) d.setFullYear(updates.year);
    if (updates.month !== undefined) d.setMonth(updates.month);
    if (updates.day !== undefined) d.setDate(updates.day);
    if (updates.hours !== undefined) d.setHours(updates.hours);
    if (updates.minutes !== undefined) d.setMinutes(updates.minutes);
    setSelectedDate(d);
    haptics.selection();
  };

  const handleSelectDay = (day: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, selectedDate.getHours(), selectedDate.getMinutes());
    setSelectedDate(next);
    haptics.selection();
  };

  const handleSave = () => {
    haptics.medium();
    onChange(selectedDate.getTime());
    onClose();
  };

  // Days in current view month
  const totalDays = getDaysInMonth(viewMonth);
  const startDayOfWeek = getDay(startOfMonth(viewMonth)); // 0 = Sunday
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blankCells = Array.from({ length: startDayOfWeek }, (_, i) => i);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
        />

        {/* Picker Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-app-card/95 dark:bg-[#1A1824]/95 backdrop-blur-2xl border border-app-card-border shadow-2xl p-5 pb-safe text-app-text-primary overflow-hidden"
        >
          {/* Grabber Bar */}
          <div className="w-10 h-1 rounded-full bg-app-hairline mx-auto mb-3 sm:hidden" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold text-app-text-primary">{title}</h3>

            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-full bg-app-accent hover:bg-app-accent-light text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Done</span>
            </button>
          </div>

          {/* Segmented Tab Switcher (Date / Time) */}
          <div className="grid grid-cols-2 gap-1 bg-app-bg p-1 rounded-xl border border-app-hairline my-3.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('date');
                haptics.selection();
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'date'
                  ? 'bg-app-card text-app-text-primary shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-app-accent" />
              <span>{format(selectedDate, 'd MMM yyyy')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('time');
                haptics.selection();
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'time'
                  ? 'bg-app-card text-app-text-primary shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-app-accent" />
              <span>{format(selectedDate, 'h:mm a')}</span>
            </button>
          </div>

          {/* Tab 1: DATE CALENDAR */}
          {activeTab === 'date' && (
            <div className="py-2">
              {/* Month Header and Navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={() => setShowMonthYearPicker((prev) => !prev)}
                  className="flex items-center gap-1.5 text-base font-bold text-app-text-primary hover:text-app-accent transition"
                >
                  <span>{format(viewMonth, 'MMMM yyyy')}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-app-accent transition-transform duration-200 ${
                      showMonthYearPicker ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMonth((prev) => subMonths(prev, 1));
                      haptics.selection();
                    }}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMonth((prev) => addMonths(prev, 1));
                      haptics.selection();
                    }}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Month/Year Quick Jump Wheels (when opened) */}
              {showMonthYearPicker ? (
                <div className="py-4">
                  <MonthYearWheelPicker
                    month={viewMonth.getMonth()}
                    year={viewMonth.getFullYear()}
                    onChange={(m, y) => {
                      const d = new Date(viewMonth);
                      d.setMonth(m);
                      d.setFullYear(y);
                      setViewMonth(d);
                      updateSelectedDate({ month: m, year: y });
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Weekday Row */}
                  <div className="grid grid-cols-7 text-center text-xs font-semibold text-app-text-tertiary mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, i) => (
                      <div key={i} className="py-1">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                    {blankCells.map((_, i) => (
                      <div key={`blank-${i}`} className="h-9" />
                    ))}

                    {daysArray.map((dayNum) => {
                      const dayDate = new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth(),
                        dayNum
                      );
                      const isSelected = isSameDay(dayDate, selectedDate);
                      const isToday = isDayToday(dayDate);

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleSelectDay(dayNum)}
                          className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center font-medium transition ${
                            isSelected
                              ? 'bg-app-accent text-white font-bold shadow-md scale-105'
                              : isToday
                              ? 'text-app-accent font-bold hover:bg-black/5 dark:hover:bg-white/10'
                              : 'text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: TIME WHEEL PICKER */}
          {activeTab === 'time' && (
            <div className="py-4">
              <TimeWheelPicker
                hours12={hours12}
                minutes={minutes}
                ampm={ampm}
                onChange={(newH12, newMin, newAmpm) => {
                  let h24 = newH12 % 12;
                  if (newAmpm === 'PM') h24 += 12;
                  updateSelectedDate({ hours: h24, minutes: newMin });
                }}
              />
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="flex items-center justify-between pt-3 border-t border-app-hairline mt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSelectedDate(now);
                setViewMonth(now);
                haptics.selection();
              }}
              className="text-app-accent font-semibold hover:underline"
            >
              Set to Now
            </button>

            <span className="text-app-text-tertiary">
              {format(selectedDate, 'EEEE, d MMMM yyyy · h:mm a')}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/* Scroll-snap iOS Time Wheels (Hour / Minute / AM-PM)                        */
/* -------------------------------------------------------------------------- */

interface TimeWheelPickerProps {
  hours12: number;
  minutes: number;
  ampm: 'AM' | 'PM';
  onChange: (h12: number, min: number, ampm: 'AM' | 'PM') => void;
}

const ITEM_HEIGHT = 36; // px

const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  hours12,
  minutes,
  ampm,
  onChange,
}) => {
  const hoursList = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);
  const ampmList: Array<'AM' | 'PM'> = ['AM', 'PM'];

  return (
    <div className="relative flex items-center justify-center gap-3 h-48 overflow-hidden rounded-2xl bg-app-bg/50 border border-app-hairline">
      {/* Central Selection Highlight Bar */}
      <div
        className="absolute left-2 right-2 rounded-xl bg-app-accent/15 border border-app-accent/30 pointer-events-none z-0"
        style={{ height: `${ITEM_HEIGHT}px`, top: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}
      />

      {/* Top & Bottom Fade Masks */}
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-app-card/90 dark:from-[#1A1824]/90 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-app-card/90 dark:from-[#1A1824]/90 to-transparent pointer-events-none z-10" />

      {/* Hour Column */}
      <WheelColumn
        items={hoursList}
        selected={hours12}
        formatLabel={(h) => String(h)}
        onSelect={(h) => onChange(h, minutes, ampm)}
        ariaLabel="Hour"
      />

      <span className="text-xl font-bold text-app-text-secondary z-10 -mt-1">:</span>

      {/* Minute Column */}
      <WheelColumn
        items={minutesList}
        selected={minutes}
        formatLabel={(m) => String(m).padStart(2, '0')}
        onSelect={(m) => onChange(hours12, m, ampm)}
        ariaLabel="Minute"
      />

      {/* AM/PM Column */}
      <WheelColumn
        items={ampmList}
        selected={ampm}
        formatLabel={(p) => p}
        onSelect={(p) => onChange(hours12, minutes, p)}
        ariaLabel="AM or PM"
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Generic Wheel Column with Momentum & Scroll Snapping                       */
/* -------------------------------------------------------------------------- */

interface WheelColumnProps<T> {
  items: T[];
  selected: T;
  formatLabel: (item: T) => string;
  onSelect: (item: T) => void;
  ariaLabel: string;
}

function WheelColumn<T extends string | number>({
  items,
  selected,
  formatLabel,
  onSelect,
  ariaLabel,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Initial scroll position
  useEffect(() => {
    if (!containerRef.current || isUserScrollingRef.current) return;
    const index = items.indexOf(selected);
    if (index !== -1) {
      containerRef.current.scrollTop = index * ITEM_HEIGHT;
    }
  }, [selected, items]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isUserScrollingRef.current = true;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

    if (items[clampedIndex] !== selected) {
      haptics.selection();
      onSelect(items[clampedIndex]);
    }

    // Release scroll flag
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      role="listbox"
      aria-label={ariaLabel}
      className="flex-1 h-full overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-none z-10 py-[calc(6rem-18px)]"
      style={{
        scrollSnapType: 'y mandatory',
      }}
    >
      {items.map((item) => {
        const isMatch = item === selected;
        return (
          <div
            key={String(item)}
            onClick={() => {
              onSelect(item);
              haptics.selection();
            }}
            className={`h-[36px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 ${
              isMatch
                ? 'text-lg font-bold text-app-text-primary scale-110'
                : 'text-sm font-medium text-app-text-tertiary hover:text-app-text-secondary opacity-60'
            }`}
          >
            {formatLabel(item)}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Month & Year Quick Jump Wheel Picker                                       */
/* -------------------------------------------------------------------------- */

interface MonthYearWheelPickerProps {
  month: number; // 0..11
  year: number;
  onChange: (m: number, y: number) => void;
}

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

const MonthYearWheelPicker: React.FC<MonthYearWheelPickerProps> = ({
  month,
  year,
  onChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i);

  return (
    <div className="relative flex items-center justify-center gap-4 h-44 overflow-hidden rounded-2xl bg-app-bg/50 border border-app-hairline">
      {/* Central Selection Highlight Bar */}
      <div
        className="absolute left-2 right-2 rounded-xl bg-app-accent/15 border border-app-accent/30 pointer-events-none z-0"
        style={{ height: `${ITEM_HEIGHT}px`, top: `calc(50% - ${ITEM_HEIGHT / 2}px)` }}
      />

      {/* Top & Bottom Fade Masks */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-app-card/90 dark:from-[#1A1824]/90 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-app-card/90 dark:from-[#1A1824]/90 to-transparent pointer-events-none z-10" />

      {/* Month Wheel */}
      <WheelColumn
        items={MONTH_NAMES}
        selected={MONTH_NAMES[month]}
        formatLabel={(name) => name}
        onSelect={(name) => onChange(MONTH_NAMES.indexOf(name), year)}
        ariaLabel="Month"
      />

      {/* Year Wheel */}
      <WheelColumn
        items={years}
        selected={year}
        formatLabel={(y) => String(y)}
        onSelect={(y) => onChange(month, y)}
        ariaLabel="Year"
      />
    </div>
  );
};
