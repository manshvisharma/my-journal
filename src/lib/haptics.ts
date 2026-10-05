/**
 * Reverie iOS & Android Haptic Feedback Engine
 * 
 * Supports:
 * 1. iOS 17.4+ Safari / WebKit switch-label tick trick
 * 2. Android / Chrome navigator.vibrate
 * 3. Graceful fallback on unsupported platforms
 * 4. Distinct tactile sensory micro-ticks with pre-unlocked AudioContext
 * 5. Settings toggle & prefers-reduced-motion check
 */

let iosSwitchLabel: HTMLLabelElement | null = null;
let iosSwitchInput: HTMLInputElement | null = null;
let isSwitchSetup = false;
let audioCtx: AudioContext | null = null;

// Ensure audio context is ready on first touch/click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch {
      // Ignore
    }
  };

  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
}

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
    container.style.pointerEvents = 'none';

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

function playMicroTick(duration = 0.008, freq = 120, gainValue = 0.08) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
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

function triggerNativeIos(): void {
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
}

export const haptics = {
  selection: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.006, 180, 0.07);
  },

  light: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.008, 140, 0.08);
  },

  medium: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(18);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.012, 100, 0.11);
    setTimeout(() => {
      triggerNativeIos();
      playMicroTick(0.010, 80, 0.09);
    }, 45);
  },

  heavy: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(26);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.02, 70, 0.14);
    setTimeout(() => {
      triggerNativeIos();
      playMicroTick(0.018, 65, 0.12);
    }, 55);
  },

  warning: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 35, 20]);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.02, 65, 0.13);
  },

  success: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([14, 40, 22]);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.012, 160, 0.09);
    setTimeout(() => {
      triggerNativeIos();
      playMicroTick(0.02, 280, 0.12);
    }, 60);
  },

  error: () => {
    if (!isHapticsEnabled()) return;
    triggerNativeIos();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([28, 40, 28, 40, 28]);
      }
    } catch {
      // ignore
    }
    playMicroTick(0.025, 55, 0.15);
    setTimeout(() => {
      triggerNativeIos();
      playMicroTick(0.025, 50, 0.15);
    }, 80);
  },
};
