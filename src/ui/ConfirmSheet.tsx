import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

export interface ConfirmSheetProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (isDestructive) {
        haptics.warning();
      } else {
        haptics.light();
      }
    }
  }, [isOpen, isDestructive]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          />

          {/* Action Sheet Card */}
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm flex flex-col gap-2.5 pb-safe"
          >
            {/* Top Container: Info + Destructive Action */}
            <div className="rounded-[20px] bg-app-card/95 dark:bg-[#1E1C28]/95 backdrop-blur-2xl border border-app-card-border/80 shadow-2xl overflow-hidden divide-y divide-app-hairline">
              <div className="px-5 py-4 text-center">
                <h3 className="text-[17px] font-semibold text-app-text-primary tracking-tight">
                  {title}
                </h3>
                {description && (
                  <p className="text-[13px] leading-relaxed text-app-text-secondary mt-1 px-1">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onConfirm();
                }}
                className={`w-full py-3.5 text-[17px] font-semibold text-center transition active:bg-black/5 dark:active:bg-white/10 ${
                  isDestructive
                    ? 'text-[#FF3B30] dark:text-[#FF453A]'
                    : 'text-app-accent font-bold'
                }`}
              >
                {confirmLabel}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onCancel();
              }}
              className="w-full py-3.5 rounded-[20px] bg-app-card/95 dark:bg-[#1E1C28]/95 backdrop-blur-2xl border border-app-card-border/80 text-[17px] font-semibold text-app-accent text-center shadow-xl transition active:bg-black/5 dark:active:bg-white/10"
            >
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
