import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
  showCloseButton?: boolean;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Sheet container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            style={{ maxHeight }}
            className="relative w-full sm:max-w-lg bg-app-card border border-app-card-border rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden z-10 text-app-text-primary"
          >
            {/* Grab handle for touch devices */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1.5 rounded-full bg-app-text-tertiary/40" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-6 py-4 flex items-center justify-between border-b border-app-hairline shrink-0">
                <h2 className="text-lg font-semibold text-app-text-primary tracking-tight">{title}</h2>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto overscroll-contain flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
