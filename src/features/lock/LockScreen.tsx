import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useLockStore } from '../../store/useLockStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

export const LockScreen: React.FC = () => {
  const isLocked = useLockStore((state) => state.isLocked);
  const verifyPin = useLockStore((state) => state.verifyPin);
  const removePin = useLockStore((state) => state.removePin);
  const isPrivacyCoverVisible = useLockStore((state) => state.isPrivacyCoverVisible);
  const signOut = useAuthStore((state) => state.signOut);

  const [enteredPin, setEnteredPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  // If privacy cover is active (app switcher), show blank frosted shield
  if (isPrivacyCoverVisible && !isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-[#12111E] backdrop-blur-3xl flex items-center justify-center">
        <Lock className="w-12 h-12 text-white/30" />
      </div>
    );
  }

  if (!isLocked) return null;

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= 6) return;
    haptics.selection();
    const next = enteredPin + digit;
    setEnteredPin(next);

    // If 4, 5, or 6 digits entered, attempt check
    if (next.length >= 4) {
      const valid = await verifyPin(next);
      if (valid) {
        haptics.success();
        setEnteredPin('');
      } else if (next.length === 6) {
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
    toast.error('Incorrect PIN');
    setTimeout(() => {
      setIsShaking(false);
      setEnteredPin('');
    }, 500);
  };

  const handleForgotPinConfirm = async () => {
    removePin();
    await signOut();
    setEnteredPin('');
    setShowForgotConfirm(false);
    toast.info('PIN reset. Please sign in again.');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#12111E] text-white flex flex-col justify-between py-12 px-6 select-none">
        {/* Top Header */}
        <div className="flex flex-col items-center pt-8">
          <div className="w-16 h-16 rounded-full bg-white/8 border border-white/12 flex items-center justify-center mb-4 text-[#8F97FF] shadow-xl">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Reverie is Locked</h2>
          <p className="text-xs text-white/50 mt-1">Enter your PIN to continue</p>

          {/* PIN Dots */}
          <div className={`flex items-center gap-4 mt-8 ${isShaking ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  i < enteredPin.length
                    ? 'bg-white scale-110 shadow'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Numeric Keypad */}
        <div className="max-w-xs mx-auto w-full">
          <div className="grid grid-cols-3 gap-4 text-center">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/20 text-2xl font-semibold flex items-center justify-center mx-auto transition active:scale-95 border border-white/8"
              >
                {digit}
              </button>
            ))}

            {/* Empty spacer */}
            <div />

            {/* 0 */}
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/20 text-2xl font-semibold flex items-center justify-center mx-auto transition active:scale-95 border border-white/8"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleDelete}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto text-white/60 hover:text-white transition active:scale-95"
              aria-label="Delete digit"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Forgot PIN button */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setShowForgotConfirm(true)}
              className="text-xs text-white/50 hover:text-white transition"
            >
              Forgot PIN?
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-white/30">
          Device-level privacy shield
        </div>
      </div>

      {/* Forgot PIN Confirmation Sheet */}
      <ConfirmSheet
        isOpen={showForgotConfirm}
        title="Forgot PIN?"
        description="Signing out resets the PIN lock on this device. You can sign in again with your account."
        confirmLabel="Reset PIN & Sign Out"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleForgotPinConfirm}
        onCancel={() => setShowForgotConfirm(false)}
      />
    </>
  );
};
