import React, { useState } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';
import { useLockStore } from '../../store/useLockStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

const KEYPAD_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'A B C' },
  { digit: '3', letters: 'D E F' },
  { digit: '4', letters: 'G H I' },
  { digit: '5', letters: 'J K L' },
  { digit: '6', letters: 'M N O' },
  { digit: '7', letters: 'P Q R S' },
  { digit: '8', letters: 'T U V' },
  { digit: '9', letters: 'W X Y Z' },
];

export const LockScreen: React.FC = () => {
  const isLocked = useLockStore((state) => state.isLocked);
  const verifyPin = useLockStore((state) => state.verifyPin);
  const removePin = useLockStore((state) => state.removePin);
  const pinLength = useLockStore((state) => state.pinLength) || 4;
  const isPrivacyCoverVisible = useLockStore((state) => state.isPrivacyCoverVisible);
  const signOut = useAuthStore((state) => state.signOut);

  const [enteredPin, setEnteredPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  // If privacy cover is active (app switcher), show frosted shield
  if (isPrivacyCoverVisible && !isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-app-bg/95 backdrop-blur-3xl flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-app-text-tertiary">
          <Lock className="w-8 h-8" />
        </div>
      </div>
    );
  }

  if (!isLocked) return null;

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= pinLength) return;
    haptics.selection();
    const next = enteredPin + digit;
    setEnteredPin(next);

    if (next.length === pinLength) {
      const valid = await verifyPin(next);
      if (valid) {
        haptics.success();
        setEnteredPin('');
      } else {
        triggerError();
      }
    }
  };

  const handleDelete = () => {
    haptics.light();
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const triggerError = () => {
    haptics.error();
    setIsShaking(true);
    toast.error('Incorrect Passcode');
    setTimeout(() => {
      setIsShaking(false);
      setEnteredPin('');
    }, 450);
  };

  const handleForgotPinConfirm = async () => {
    removePin();
    await signOut();
    setEnteredPin('');
    setShowForgotConfirm(false);
    toast.info('Passcode reset. Please sign in again.');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-app-bg/95 backdrop-blur-3xl text-app-text-primary flex flex-col justify-between py-10 px-6 select-none transition-colors duration-200">
        {/* Top Header with Apple Lock Glyph */}
        <div className="flex flex-col items-center pt-8 sm:pt-12">
          <div className="relative mb-5">
            <div className="absolute -inset-1 rounded-full bg-app-accent/20 blur-md" />
            <div className="relative w-15 h-15 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 flex items-center justify-center text-app-accent shadow-lg">
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-app-text-primary">
            Enter Passcode
          </h2>
          <p className="text-xs text-app-text-tertiary mt-1 font-medium">
            Your journal is protected
          </p>

          {/* Passcode Indicator Dots */}
          <div className={`flex items-center gap-4 mt-8 ${isShaking ? 'animate-shake' : ''}`}>
            {Array.from({ length: pinLength }).map((_, i) => {
              const isFilled = i < enteredPin.length;
              return (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-app-text-primary scale-110 shadow-sm'
                      : 'border-2 border-app-text-tertiary/40 bg-transparent'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Apple Style Numeric Keypad */}
        <div className="max-w-[310px] sm:max-w-[340px] mx-auto w-full pb-4">
          <div className="grid grid-cols-3 gap-y-4 gap-x-5 place-items-center">
            {KEYPAD_KEYS.map(({ digit, letters }) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] rounded-full bg-black/[0.04] dark:bg-white/[0.08] active:bg-black/[0.14] dark:active:bg-white/[0.22] border border-black/[0.06] dark:border-white/[0.09] flex flex-col items-center justify-center transition-all duration-100 active:scale-95 shadow-xs"
              >
                <span className="text-[28px] font-normal leading-none text-app-text-primary">
                  {digit}
                </span>
                {letters ? (
                  <span className="text-[9px] font-bold tracking-[0.14em] text-app-text-tertiary uppercase mt-1 leading-none">
                    {letters}
                  </span>
                ) : (
                  <span className="h-[9px] mt-1" />
                )}
              </button>
            ))}

            {/* Bottom Row: Forgot Passcode / 0 / Delete */}
            <button
              type="button"
              onClick={() => setShowForgotConfirm(true)}
              className="w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] flex items-center justify-center text-xs font-medium text-app-text-secondary active:opacity-60 transition"
            >
              Forgot?
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] rounded-full bg-black/[0.04] dark:bg-white/[0.08] active:bg-black/[0.14] dark:active:bg-white/[0.22] border border-black/[0.06] dark:border-white/[0.09] flex flex-col items-center justify-center transition-all duration-100 active:scale-95 shadow-xs"
            >
              <span className="text-[28px] font-normal leading-none text-app-text-primary">
                0
              </span>
              <span className="h-[9px] mt-1" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] flex items-center justify-center text-app-text-secondary active:opacity-60 transition active:scale-95"
              aria-label="Delete last digit"
            >
              <Delete className="w-6 h-6 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Subtle Bottom Footer */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-app-text-tertiary font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-app-accent" />
          <span>Biometric & Passcode Security</span>
        </div>
      </div>

      {/* Forgot Passcode Confirmation Sheet */}
      <ConfirmSheet
        isOpen={showForgotConfirm}
        title="Reset Passcode?"
        description="To protect your privacy, resetting your passcode will log you out of your account on this device. You can then sign in again."
        confirmLabel="Reset Passcode & Sign Out"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleForgotPinConfirm}
        onCancel={() => setShowForgotConfirm(false)}
      />
    </>
  );
};
