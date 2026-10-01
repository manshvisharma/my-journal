/**
 * Reverie iOS & Android Haptic Feedback Engine
 * 
 * Supports:
 * 1. iOS 17.4+ Safari / WebKit switch-label tick trick
 * 2. Android / Chrome navigator.vibrate
 * 3. Graceful fallback on unsupported platforms
 * 4. Settings toggle & prefers-reduced-motion check
 */

let iosSwitchLabel: HTMLLabelElement | null = null;
let isSwitchSetup = false;

function setupIosSwitchHaptic() {
  if (typeof window === 'undefined' || isSwitchSetup) return;
  try {
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    input.id = '__ios_haptic_switch__';

    const label = document.createElement('label');
    label.htmlFor = '__ios_haptic_switch__';
    label.style.width = '1px';
    label.style.height = '1px';

    container.appendChild(input);
    container.appendChild(label);
    document.body.appendChild(container);

    iosSwitchLabel = label;
    isSwitchSetup = true;
  } catch {
    // Ignore DOM setup errors
  }
}

function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  // Check localStorage setting if present
  try {
    const saved = localStorage.getItem('reverie_haptics_enabled');
    if (saved !== null && saved === 'false') {
      return false;
    }
  } catch {
    // ignore
  }
  return true;
}

function triggerSingleTick(): void {
  if (!isHapticsEnabled()) return;

  // Try iOS switch trick first
  if (!isSwitchSetup) {
    setupIosSwitchHaptic();
  }

  if (iosSwitchLabel) {
    try {
      iosSwitchLabel.click();
    } catch {
      // ignore
    }
  }

  // Android / Chrome navigator.vibrate fallback
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // ignore
  }
}

export const haptics = {
  /**
   * Single selection tick for wheel picker, slider steps, menu opens, toggles
   */
  selection: () => {
    triggerSingleTick();
  },

  /**
   * Light impact for card taps, chips
   */
  light: () => {
    triggerSingleTick();
  },

  /**
   * Medium impact (two rapid ticks 40ms apart)
   */
  medium: () => {
    if (!isHapticsEnabled()) return;
    triggerSingleTick();
    setTimeout(() => {
      triggerSingleTick();
    }, 40);
  },

  /**
   * Heavy / double tick for pin/unpin or major action
   */
  heavy: () => {
    if (!isHapticsEnabled()) return;
    triggerSingleTick();
    setTimeout(() => {
      triggerSingleTick();
    }, 50);
  },

  /**
   * Success notification pattern (two ticks 60ms apart)
   */
  success: () => {
    if (!isHapticsEnabled()) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([12, 50, 18]);
      }
    } catch {
      // ignore
    }
    triggerSingleTick();
    setTimeout(() => {
      triggerSingleTick();
    }, 60);
  },

  /**
   * Warning / Destructive action prompt (three ticks 50ms apart)
   */
  warning: () => {
    if (!isHapticsEnabled()) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 40, 15, 40, 15]);
      }
    } catch {
      // ignore
    }
    triggerSingleTick();
    setTimeout(() => {
      triggerSingleTick();
      setTimeout(() => {
        triggerSingleTick();
      }, 50);
    }, 50);
  },

  /**
   * Error pattern
   */
  error: () => {
    if (!isHapticsEnabled()) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 60, 20, 60, 20]);
      }
    } catch {
      // ignore
    }
    triggerSingleTick();
    setTimeout(() => {
      triggerSingleTick();
      setTimeout(() => {
        triggerSingleTick();
      }, 50);
    }, 50);
  },
};
