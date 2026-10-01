import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;
let listeners: ToastListener[] = [];
let currentToasts: ToastMessage[] = [];

export const toast = {
  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, message, duration };
    currentToasts = [...currentToasts, newToast];
    listeners.forEach((l) => l(currentToasts));

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    return id;
  },
  success(message: string, duration = 3000) {
    return toast.show(message, 'success', duration);
  },
  error(message: string, duration = 4000) {
    return toast.show(message, 'error', duration);
  },
  info(message: string, duration = 3000) {
    return toast.show(message, 'info', duration);
  },
  dismiss(id: string) {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(currentToasts));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: ToastListener = (t) => setToasts(t);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none max-w-[90vw] w-max">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto px-4 py-2.5 rounded-full flex items-center gap-2.5 shadow-xl backdrop-blur-xl border text-sm font-medium ${
              t.type === 'error'
                ? 'bg-red-500/90 text-white border-red-400/40'
                : t.type === 'success'
                ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                : 'bg-neutral-900/90 text-white border-white/20'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-blue-200 shrink-0" />}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
