import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    loading,
    error,
    clearError,
  } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
      toast.success('Signed in with Google');
    } catch {
      // Handled in store
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onClose();
        toast.success('Welcome back!');
      } else {
        await signUpWithEmail(email, password);
        onClose();
        toast.success('Account created! Verification email sent.');
      }
    } catch {
      // Handled in store
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-5 text-white select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold">
            {mode === 'signin' ? 'Sign In to Reverie' : 'Create Reverie Account'}
          </h3>
          <div className="w-6" />
        </div>

        {/* Error banner if any */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-xs text-red-200 flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="font-bold underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Google One-Tap / Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm shadow-md transition active:scale-98 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-white/40 my-1">
          <div className="flex-1 h-px bg-white/10" />
          <span>or with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email & Password form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              minLength={6}
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#6B74F5] hover:bg-[#7B84FF] text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition active:scale-98 disabled:opacity-50"
          >
            {mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center pt-2">
          {mode === 'signin' ? (
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearError();
              }}
              className="text-xs text-white/60 hover:text-white"
            >
              Don't have an account? <strong className="text-[#8F97FF]">Sign Up</strong>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearError();
              }}
              className="text-xs text-white/60 hover:text-white"
            >
              Already have an account? <strong className="text-[#8F97FF]">Sign In</strong>
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
};
