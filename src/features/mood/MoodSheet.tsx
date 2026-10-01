import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, Check } from 'lucide-react';
import type { MoodData } from '../../types';
import { MoodFlowerGlyph } from '../list/MoodFlowerGlyph';
import { haptics } from '../../lib/haptics';

const MOOD_LEVELS = [
  { val: 0, label: 'Very Unpleasant' },
  { val: 1, label: 'Unpleasant' },
  { val: 2, label: 'Slightly Unpleasant' },
  { val: 3, label: 'Neutral' },
  { val: 4, label: 'Slightly Pleasant' },
  { val: 5, label: 'Pleasant' },
  { val: 6, label: 'Very Pleasant' },
];

const FEELING_LABELS_BY_VALENCE: Record<number, string[]> = {
  0: ['Miserable', 'Despairing', 'Hopeless', 'Angry', 'Devastated', 'Exhausted', 'Numb', 'Overwhelmed', 'Ashamed', 'Anxious'],
  1: ['Sad', 'Anxious', 'Frustrated', 'Lonely', 'Stressed', 'Overwhelmed', 'Disappointed', 'Drained', 'Insecure', 'Worried'],
  2: ['Uneasy', 'Annoyed', 'Tired', 'Bored', 'Restless', 'Doubtful', 'Gloomy', 'Hesitant', 'Confused'],
  3: ['Neutral', 'Fine', 'Quiet', 'Reflective', 'Busy', 'Waiting', 'Contemplative', 'Steady', 'Curious'],
  4: ['Calm', 'Content', 'Relieved', 'Comfortable', 'Focused', 'Interested', 'Steady', 'Hopeful', 'Optimistic'],
  5: ['Happy', 'Grateful', 'Hopeful', 'Proud', 'Playful', 'Energized', 'Peaceful', 'Excited', 'Loving', 'Confident'],
  6: ['Joyful', 'Excited', 'Ecstatic', 'Loving', 'Inspired', 'Triumphant', 'Blissful', 'Passionate', 'Empowered'],
};

const IMPACT_FACTORS = [
  'Spirituality',
  'Family',
  'Friends',
  'Partner',
  'Dating',
  'Work',
  'Health',
  'Fitness',
  'Money',
  'Self',
  'Weather',
  'Studies',
  'Sleep',
  'Travel',
  'Food',
  'Hobbies',
  'News',
  'Creativity',
];

interface MoodSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialMood?: MoodData | null;
  onSaveMood: (mood: MoodData) => void;
  onClearMood?: () => void;
}

export const MoodSheet: React.FC<MoodSheetProps> = ({
  isOpen,
  onClose,
  initialMood,
  onSaveMood,
  onClearMood,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [valence, setValence] = useState<number>(initialMood?.valence ?? 3);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(initialMood?.labels ?? []);
  const [selectedImpacts, setSelectedImpacts] = useState<string[]>(initialMood?.impacts ?? []);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setValence(initialMood?.valence ?? 3);
      setSelectedLabels(initialMood?.labels ?? []);
      setSelectedImpacts(initialMood?.impacts ?? []);
      haptics.selection();
    }
  }, [isOpen, initialMood]);

  if (!isOpen) return null;

  const currentLevel = MOOD_LEVELS[valence];

  const handleFinish = () => {
    haptics.success();
    onSaveMood({
      valence,
      labels: selectedLabels,
      impacts: selectedImpacts,
    });
    onClose();
  };

  const handleValenceChange = (newValence: number) => {
    if (newValence !== valence) {
      setValence(newValence);
      haptics.selection();
    }
  };

  const toggleLabel = (label: string) => {
    haptics.light();
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const toggleImpact = (impact: string) => {
    haptics.light();
    setSelectedImpacts((prev) =>
      prev.includes(impact) ? prev.filter((i) => i !== impact) : [...prev, impact]
    );
  };

  // Header dynamic live summary
  const summaryString = () => {
    if (selectedLabels.length > 0) {
      if (selectedLabels.length <= 2) return selectedLabels.join(', ');
      return `${selectedLabels.slice(0, 2).join(', ')} and more`;
    }
    return currentLevel.label;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg rounded-t-[32px] bg-app-card/95 dark:bg-[#1C1A28]/95 backdrop-blur-3xl border-t border-x border-app-card-border shadow-2xl p-5 pb-safe text-app-text-primary overflow-hidden flex flex-col max-h-[75vh]"
        >
          {/* iOS Grabber */}
          <div className="w-10 h-1 rounded-full bg-app-hairline mx-auto mb-3" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
            <div className="w-16">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep((s) => (s - 1) as 1 | 2);
                    haptics.light();
                  }}
                  className="flex items-center gap-0.5 text-[15px] font-medium text-app-accent hover:opacity-80"
                >
                  <ChevronLeft className="w-5 h-5 -ml-1" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[13px] font-semibold text-app-text-primary tracking-tight">
                {step === 1 ? 'State of Mind' : step === 2 ? 'Feelings' : 'Impact'}
              </span>
              <span className="text-[11px] text-app-accent font-medium">
                {summaryString()}
              </span>
            </div>

            <div className="w-16 flex justify-end">
              {initialMood && onClearMood && step === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onClearMood();
                    onClose();
                    haptics.light();
                  }}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* STEP 1: VALENCE SLIDER & MORPHING FLOWER GLYPH */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              {/* Big Interactive Flower Glyph */}
              <motion.div
                key={valence}
                initial={{ scale: 0.85, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="w-28 h-28 flex items-center justify-center mb-4"
              >
                <MoodFlowerGlyph valence={valence} size={100} />
              </motion.div>

              {/* Mood Label */}
              <h3 className="text-xl font-bold text-app-text-primary mb-4 text-center">
                {currentLevel.label}
              </h3>

              {/* iOS Discrete Slider */}
              <div className="w-full max-w-xs px-2">
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={valence}
                  onChange={(e) => handleValenceChange(parseInt(e.target.value, 10))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer bg-black/10 dark:bg-white/15 accent-app-accent"
                  aria-label="Mood valence slider"
                />
                <div className="flex justify-between text-[11px] font-semibold text-app-text-tertiary mt-2">
                  <span>Very Unpleasant</span>
                  <span>Neutral</span>
                  <span>Very Pleasant</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FEELINGS CHIPS */}
          {step === 2 && (
            <div className="flex-1 flex flex-col py-4 overflow-hidden">
              <div className="mb-3 px-1">
                <h4 className="text-[17px] font-bold text-app-text-primary">
                  What best describes this feeling?
                </h4>
                <p className="text-xs text-app-text-secondary mt-0.5">
                  Choose words that match your emotion.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-wrap gap-2 content-start py-2">
                {(FEELING_LABELS_BY_VALENCE[valence] || []).map((label, idx) => {
                  const isSelected = selectedLabels.includes(label);
                  return (
                    <motion.button
                      key={label}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.015, duration: 0.2 }}
                      onClick={() => toggleLabel(label)}
                      className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                        isSelected
                          ? 'bg-app-accent text-white font-semibold shadow-md scale-105'
                          : 'bg-app-bg hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary border border-app-hairline'
                      }`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: IMPACT FACTORS */}
          {step === 3 && (
            <div className="flex-1 flex flex-col py-4 overflow-hidden">
              <div className="mb-3 px-1">
                <h4 className="text-[17px] font-bold text-app-text-primary">
                  What has the biggest impact?
                </h4>
                <p className="text-xs text-app-text-secondary mt-0.5">
                  Select key areas influencing how you feel.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-wrap gap-2 content-start py-2">
                {IMPACT_FACTORS.map((impact, idx) => {
                  const isSelected = selectedImpacts.includes(impact);
                  return (
                    <motion.button
                      key={impact}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.015, duration: 0.2 }}
                      onClick={() => toggleImpact(impact)}
                      className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                        isSelected
                          ? 'bg-app-accent text-white font-semibold shadow-md scale-105'
                          : 'bg-app-bg hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary border border-app-hairline'
                      }`}
                    >
                      {impact}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Bar: Progress Dots & Large Next/Done Button */}
          <div className="pt-4 border-t border-app-hairline flex items-center justify-between gap-4 mt-auto">
            {/* Step Progress Dots */}
            <div className="flex items-center gap-1.5 px-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    s === step
                      ? 'w-6 bg-app-accent'
                      : 'w-1.5 bg-app-hairline'
                  }`}
                />
              ))}
            </div>

            {/* Next or Done Button */}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  setStep((s) => (s + 1) as 2 | 3);
                  haptics.light();
                }}
                className="flex-1 max-w-[180px] py-3 rounded-full bg-app-accent hover:bg-app-accent-light text-white text-[15px] font-semibold text-center shadow-md transition active:scale-98"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 max-w-[180px] py-3 rounded-full bg-app-accent hover:bg-app-accent-light text-white text-[15px] font-bold text-center shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Done</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
