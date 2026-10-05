import { create } from "zustand";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import type { UserProfile } from "../types";
import { auth, googleProvider, isFirebaseConfigured } from "../data/firebase";

const AUTH_STORAGE_KEY = "reverie_auth_user";

function loadSavedUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
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
    if (typeof window === "undefined") return () => {};

    if (!isFirebaseConfigured() || !auth) {
      const saved = loadSavedUser();
      set({ user: saved, loading: false, isDemo: false });
      return () => {};
    }

    // Process redirect result for mobile / standalone PWA
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          const profile: UserProfile = {
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName,
            photoURL: res.user.photoURL,
            isAnonymous: res.user.isAnonymous,
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          set({ user: profile, loading: false });
        }
      })
      .catch((err) => {
        console.warn("Redirect sign-in error:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        set({ user: profile, loading: false, error: null });
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        set({ user: null, loading: false });
      }
    });

    return unsubscribe;
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    if (!auth) {
      const mock: UserProfile = {
        uid: "user_" + Date.now(),
        email: "user@gmail.com",
        displayName: "Google User",
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mock));
      set({ user: mock, loading: false });
      return;
    }

    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true);
    const isMobile = typeof navigator !== "undefined" && /iphone|ipad|ipod|android/i.test(navigator.userAgent);

    try {
      if (isStandalone || isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          if (res?.user) {
            const profile: UserProfile = {
              uid: res.user.uid,
              email: res.user.email,
              displayName: res.user.displayName,
              photoURL: res.user.photoURL,
              isAnonymous: res.user.isAnonymous,
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
            set({ user: profile, loading: false });
          }
        } catch (err: unknown) {
          const error = err as Error;
          if (error.message.includes("popup") || error.message.includes("blocked")) {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw err;
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      set({ error: err.message || "Failed to sign in with Google", loading: false });
      throw e;
    }
  },

  signInWithEmail: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    if (!auth) {
      const cleanEmail = email.trim();
      const profile: UserProfile = {
        uid: "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, loading: false });
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        isAnonymous: cred.user.isAnonymous,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, loading: false });
    } catch (e: unknown) {
      const err = e as Error;
      let msg = err.message || "Failed to sign in";
      if (
        msg.includes("auth/invalid-credential") ||
        msg.includes("auth/user-not-found") ||
        msg.includes("auth/wrong-password")
      ) {
        msg = "Invalid email or password. Please check your credentials.";
      }
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  signUpWithEmail: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    if (!auth) {
      const cleanEmail = email.trim();
      const profile: UserProfile = {
        uid: "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        email: cleanEmail,
        displayName: cleanEmail.split("@")[0],
        photoURL: null,
        isAnonymous: false,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, loading: false });
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        isAnonymous: cred.user.isAnonymous,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      set({ user: profile, loading: false });
    } catch (e: unknown) {
      const err = e as Error;
      let msg = err.message || "Failed to create account";
      if (msg.includes("auth/email-already-in-use")) {
        msg = "An account with this email already exists. Try signing in instead.";
      } else if (msg.includes("auth/weak-password")) {
        msg = "Password should be at least 6 characters.";
      }
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  signOut: async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (err) {
        console.warn("Sign out error:", err);
      }
    }
    set({ user: null, isDemo: false, loading: false });
  },

  clearError: () => set({ error: null }),
}));
