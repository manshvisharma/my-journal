import { create } from 'zustand';

interface LockState {
  isLocked: boolean;
  hasPin: boolean;
  pinHash: string | null;
  pinLength: number;
  salt: string | null;
  lockTimeoutMinutes: number; // 0 (immediately), 1, 5, 15
  isPrivacyCoverVisible: boolean;

  initLock: () => void;
  setPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  lockNow: () => void;
  unlock: () => void;
  setLockTimeout: (minutes: number) => void;
  setPrivacyCover: (visible: boolean) => void;
}

const STORAGE_KEYS = {
  PIN_HASH: 'reverie_lock_pin_hash',
  PIN_LENGTH: 'reverie_lock_pin_length',
  SALT: 'reverie_lock_salt',
  TIMEOUT: 'reverie_lock_timeout',
  LAST_ACTIVE: 'reverie_lock_last_active',
};

async function hashPinWithPBKDF2(pin: string, saltStr: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuf = enc.encode(saltStr);
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  const rawKey = await crypto.subtle.exportKey('raw', derivedKey);
  const arr = Array.from(new Uint8Array(rawKey));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getInitialLockState() {
  if (typeof window === 'undefined') {
    return {
      isLocked: false,
      hasPin: false,
      pinHash: null,
      pinLength: 4,
      salt: null,
      lockTimeoutMinutes: 5,
    };
  }
  try {
    const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
    const salt = localStorage.getItem(STORAGE_KEYS.SALT);
    const timeoutStr = localStorage.getItem(STORAGE_KEYS.TIMEOUT);
    const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 5;
    const lengthStr = localStorage.getItem(STORAGE_KEYS.PIN_LENGTH);
    const pinLength = lengthStr ? parseInt(lengthStr, 10) : 4;
    const hasPin = Boolean(pinHash && salt);
    return {
      isLocked: hasPin,
      hasPin,
      pinHash,
      pinLength,
      salt,
      lockTimeoutMinutes: timeout,
    };
  } catch {
    return {
      isLocked: false,
      hasPin: false,
      pinHash: null,
      pinLength: 4,
      salt: null,
      lockTimeoutMinutes: 5,
    };
  }
}

const initialLockState = getInitialLockState();
let isVisibilityListenerAttached = false;

export const useLockStore = create<LockState>((set, get) => ({
  ...initialLockState,
  isPrivacyCoverVisible: false,

  initLock: () => {
    try {
      const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
      const salt = localStorage.getItem(STORAGE_KEYS.SALT);
      const timeoutStr = localStorage.getItem(STORAGE_KEYS.TIMEOUT);
      const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 5;
      const lengthStr = localStorage.getItem(STORAGE_KEYS.PIN_LENGTH);
      const pinLength = lengthStr ? parseInt(lengthStr, 10) : 4;

      const hasPin = Boolean(pinHash && salt);
      set({
        hasPin,
        pinHash,
        pinLength,
        salt,
        lockTimeoutMinutes: timeout,
        isLocked: hasPin ? true : get().isLocked,
      });

      // Set up visibilitychange listener for privacy cover and auto-lock
      if (typeof document !== 'undefined' && !isVisibilityListenerAttached) {
        isVisibilityListenerAttached = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            // Show privacy cover for iOS app switcher
            set({ isPrivacyCoverVisible: true });
            localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
          } else {
            set({ isPrivacyCoverVisible: false });
            const lastActiveStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
            if (lastActiveStr && get().hasPin) {
              const elapsedMinutes = (Date.now() - parseInt(lastActiveStr, 10)) / 60000;
              if (elapsedMinutes >= get().lockTimeoutMinutes) {
                set({ isLocked: true });
              }
            }
          }
        });
      }
    } catch {
      // Storage access may fail in restricted mode
    }
  },

  setPin: async (pin: string) => {
    const salt = crypto.randomUUID();
    const pinHash = await hashPinWithPBKDF2(pin, salt);
    localStorage.setItem(STORAGE_KEYS.PIN_HASH, pinHash);
    localStorage.setItem(STORAGE_KEYS.SALT, salt);
    localStorage.setItem(STORAGE_KEYS.PIN_LENGTH, pin.length.toString());
    set({ hasPin: true, pinHash, salt, pinLength: pin.length, isLocked: false });
  },

  removePin: () => {
    localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
    localStorage.removeItem(STORAGE_KEYS.SALT);
    localStorage.removeItem(STORAGE_KEYS.PIN_LENGTH);
    set({ hasPin: false, pinHash: null, salt: null, pinLength: 4, isLocked: false });
  },

  verifyPin: async (pin: string): Promise<boolean> => {
    const { pinHash, salt } = get();
    if (!pinHash || !salt) return false;
    const computedHash = await hashPinWithPBKDF2(pin, salt);
    const valid = computedHash === pinHash;
    if (valid) {
      set({ isLocked: false });
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
    }
    return valid;
  },

  lockNow: () => {
    if (get().hasPin) {
      set({ isLocked: true });
    }
  },

  unlock: () => {
    set({ isLocked: false });
  },

  setLockTimeout: (minutes: number) => {
    localStorage.setItem(STORAGE_KEYS.TIMEOUT, minutes.toString());
    set({ lockTimeoutMinutes: minutes });
  },

  setPrivacyCover: (visible: boolean) => {
    set({ isPrivacyCoverVisible: visible });
  },
}));
