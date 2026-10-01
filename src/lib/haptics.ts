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
let iosSwitchInput: HTMLInputElement | null = null;
let isSwitchSetup = false;
let audioCtx: AudioContext | null = null;

function setupIosSwitchHaptic() {
  if (typeof window === 'undefined' || isSwitchSetup) return;
  try {
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0.001';
    container.style.overflow = 'hidden';
    container.style.zIndex = '-9999';

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
    label.style.display = 'block';

    container.appendChild(input);
    container.appendChild(label);
    document.body.appendChild(container);

    iosSwitchLabel = label;
    iosSwitchInput = input;
    isSwitchSetup = true;
  } catch {
    // Ignore DOM setup errors
  }
}

function playMicroTick(duration = 0.006, freq = 90, gainValue = 0.06) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainValue, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio errors
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

  // 1. Try iOS switch tick
  if (!isSwitchSetup) {
    setupIosSwitchHaptic();
  }

  if (iosSwitchLabel && iosSwitchInput) {
    try {
      iosSwitchInput.checked = !iosSwitchInput.checked;
      iosSwitchLabel.click();
    } catch {
      // ignore
    }
  }

  // 2. Android / Chrome navigator.vibrate fallback
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // ignore
  }

  // 3. Subtle tactile sound/micro-tick for sensory feedback on iOS
  playMicroTick();
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
