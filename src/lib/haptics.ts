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

export function primeHaptics() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass && !audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      // Play a 1-sample silent buffer to keep it alive
      const buf = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start(0);
    }
  } catch {
    // Ignore
  }
}

// Keep audio context primed on touches
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', primeHaptics, { passive: true });
  window.addEventListener('pointerdown', primeHaptics, { passive: true });
  window.addEventListener('click', primeHaptics, { passive: true });
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

function playTactileClick(type: 'light' | 'medium' | 'heavy' | 'selection' | 'warning') {
  try {
    if (typeof window === 'undefined') return;
    primeHaptics();
    if (!audioCtx) return;

    const sampleRate = audioCtx.sampleRate;
    const duration = type === 'heavy' ? 0.024 : type === 'medium' || type === 'warning' ? 0.016 : 0.010;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const freq = type === 'heavy' ? 60 : type === 'medium' || type === 'warning' ? 85 : type === 'selection' ? 150 : 110;
    const amplitude = type === 'heavy' ? 0.45 : type === 'medium' || type === 'warning' ? 0.35 : 0.22;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * (type === 'heavy' ? 70 : 130));
      data[i] = Math.sin(2 * Math.PI * freq * t) * amplitude * decay;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(audioCtx.currentTime);
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
  prime: primeHaptics,

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
    playTactileClick('selection');
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
    playTactileClick('light');
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
    playTactileClick('medium');
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
    playTactileClick('heavy');
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
    playTactileClick('warning');
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
    playTactileClick('light');
    setTimeout(() => {
      triggerNativeIos();
      playTactileClick('medium');
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
    playTactileClick('heavy');
    setTimeout(() => {
      triggerNativeIos();
      playTactileClick('heavy');
    }, 80);
  },
};
