import { create } from "zustand";
import type { UserProfile } from "../types";

const DEMO_USER: UserProfile = {
  uid: "demo-local-user",
  email: null,
  displayName: "Journaler",
  photoURL: null,
  isAnonymous: false,
};

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  initAuth: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USER,
  loading: false,
  error: null,
  isDemo: true,
  initAuth: () => {
    set({ user: DEMO_USER, loading: false, isDemo: true });
    return () => {};
  },
  signInWithGoogle: async () => {
    set({ error: "Cloud accounts are not required. Your journal stays on this device." });
  },
  signInWithEmail: async () => {
    set({ error: "Cloud accounts are not required. Your journal stays on this device." });
  },
  signUpWithEmail: async () => {
    set({ error: "Cloud accounts are not required. Your journal stays on this device." });
  },
  signOut: async () => {
    set({ user: DEMO_USER, isDemo: true });
  },
  clearError: () => set({ error: null }),
}));
