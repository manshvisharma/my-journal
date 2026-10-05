import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-tjL64ZgnF5bNO5p66XL7Sxhz12_qIfU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "myjournal-f2f56.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "myjournal-f2f56",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "myjournal-f2f56.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "469963732060",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:469963732060:web:7e639741c165e89d2ea299",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WGPPPP664L",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let isOfflineCacheAvailable = true;

if (typeof window !== "undefined" && isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Auth persistence initialization warning:", err);
    });

    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (cacheErr) {
      console.warn("Persistent Firestore cache not available, falling back to memory cache:", cacheErr);
      isOfflineCacheAvailable = false;
      db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
      });
    }

    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app);
      }
    }).catch(() => {});
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, db, analytics, isOfflineCacheAvailable };
