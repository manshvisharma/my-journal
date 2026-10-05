import { create } from "zustand";
import type { UserProfile } from "../types";

const AUTH_STORAGE_KEY = "reverie_auth_user";

function loadSavedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
  user: loadSavedUser(),
  loading: false,
  error: null,
  isDemo: false,

  initAuth: () => {
    const saved = loadSavedUser();
    set({ user: saved, loading: false });
    return () => {};
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const mockGoogleUser: UserProfile = {
        uid: "google-user-" + Date.now(),
        email: "user@gmail.com",
        displayName: "Google User",
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockGoogleUser));
      set({ user: mockGoogleUser, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error)?.message || "Failed to sign in with Google", loading: false });
    }
  },

  signInWithEmail: async (email: string, _pass: string) => {
    set({ loading: true, error: null });
    try {
      const cleanEmail = email.trim();
      const userProfile: UserProfile = {
        uid: "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
      set({ user: userProfile, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error)?.message || "Failed to sign in", loading: false });
    }
  },

  signUpWithEmail: async (email: string, _pass: string) => {
    set({ loading: true, error: null });
    try {
      const cleanEmail = email.trim();
      const userProfile: UserProfile = {
        uid: "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
      set({ user: userProfile, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error)?.message || "Failed to create account", loading: false });
    }
  },

  signOut: async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, isDemo: false });
  },

  clearError: () => set({ error: null }),
}));
