import React, { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { Sheet } from '../ui/Sheet';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className={`text-xs text-white/50 flex items-center gap-1.5 ${className}`}>
        <span>✓ Installed as App</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-[#6B74F5] hover:bg-[#7B84FF] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-sm font-medium text-white border border-white/10 active:scale-95 transition ${className}`}
        >
          <Share className="w-4 h-4 text-[#8F97FF]" />
          <span>Install on iPhone</span>
        </button>

        <Sheet isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} title="Install on iPhone / iPad">
          <div className="flex flex-col gap-4 text-neutral-200">
            <p className="text-sm leading-relaxed text-white/80">
              Install Reverie as a home-screen app for fullscreen writing, instant offline access, and fast launch:
            </p>
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6B74F5] text-white text-xs font-bold shrink-0">
                  1
                </span>
                <span className="text-sm">
                  Tap the <strong className="text-white">Share</strong> button in Safari toolbar at the bottom of your screen.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6B74F5] text-white text-xs font-bold shrink-0">
                  2
                </span>
                <span className="text-sm">
                  Scroll down the share sheet and tap <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6B74F5] text-white text-xs font-bold shrink-0">
                  3
                </span>
                <span className="text-sm">
                  Tap <strong className="text-white">Add</strong> in the top right corner.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition"
            >
              Done
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  return null;
};
