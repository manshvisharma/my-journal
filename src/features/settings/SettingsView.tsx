import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  User,
  Shield,
  Palette,
  HardDrive,
  Download,
  Upload,
  Lock,
  Flame,
  CheckCircle2,
  RefreshCw,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Laptop,
  Vibrate,
  Globe,
} from 'lucide-react';
import { useJournalStore } from '../../store/useJournalStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLockStore } from '../../store/useLockStore';
import { repository } from '../../data/repository';
import { SharedLinksListModal } from '../share/SharedLinksListModal';
import { LinkActivityModal } from '../share/LinkActivityModal';
import { Switch } from '../../ui/Switch';
import { Sheet } from '../../ui/Sheet';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { PWAInstallButton } from '../../pwa/PWAInstallButton';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';
import type { StreakSchedule } from '../../types';

interface SettingsViewProps {
  onBack: () => void;
  onOpenAuthModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onOpenAuthModal }) => {
  const settings = useJournalStore((state) => state.settings);
  const updateSettings = useJournalStore((state) => state.updateSettings);
  const entriesCount = useJournalStore((state) => state.entries.size);

  const user = useAuthStore((state) => state.user);
  const isDemo = useAuthStore((state) => state.isDemo);
  const signOut = useAuthStore((state) => state.signOut);

  const hasPin = useLockStore((state) => state.hasPin);
  const lockTimeoutMinutes = useLockStore((state) => state.lockTimeoutMinutes);
  const setPin = useLockStore((state) => state.setPin);
  const removePin = useLockStore((state) => state.removePin);
  const setLockTimeout = useLockStore((state) => state.setLockTimeout);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [isVerifyingCloud, setIsVerifyingCloud] = useState(false);
  const [cloudVerifyResult, setCloudVerifyResult] = useState<string | null>(null);
  const [isGeneratingStress, setIsGeneratingStress] = useState(false);
  const [stressProgress, setStressProgress] = useState<string | null>(null);
  const [showStressConfirm, setShowStressConfirm] = useState(false);
  const [showSharedLinksModal, setShowSharedLinksModal] = useState(false);
  const [activityShareId, setActivityShareId] = useState<string | null>(null);

  // Haptics setting state
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('reverie_haptics_enabled');
      return saved === null || saved === 'true';
    } catch {
      return true;
    }
  });

  const handleToggleHaptics = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    try {
      localStorage.setItem('reverie_haptics_enabled', String(enabled));
    } catch {
      // ignore
    }
    if (enabled) {
      haptics.selection();
    }
    toast.info(enabled ? 'Haptics enabled' : 'Haptics disabled');
  };

  const fileImportRef = useRef<HTMLInputElement>(null);

  // Cloud copy verification
  const handleVerifyCloud = async () => {
    setIsVerifyingCloud(true);
    setCloudVerifyResult(null);
    try {
      const uid = user?.uid || 'demo-local-user';
      const res = await repository.verifyCloudCopy(uid, entriesCount);
      if (res.matches && !res.hasPending) {
        setCloudVerifyResult(`All ${res.cloudCount} entries are securely backed up.`);
        toast.success('Cloud backup verified: 100% matched');
      } else if (res.hasPending) {
        setCloudVerifyResult('Pending offline writes are queued for upload.');
        toast.info('Local writes queued for cloud sync');
      } else {
        setCloudVerifyResult(`Local count: ${res.localCount}, Cloud count: ${res.cloudCount}`);
      }
    } catch {
      toast.error('Failed to verify cloud backup');
    } finally {
      setIsVerifyingCloud(false);
    }
  };

  // Set PIN handler
  const handleSavePin = async () => {
    if (pinInput.length < 4 || pinInput.length > 6) {
      toast.error('PIN must be 4 to 6 digits');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      toast.error('PINs do not match');
      return;
    }
    await setPin(pinInput);
    setShowPinModal(false);
    setPinInput('');
    setPinConfirmInput('');
    haptics.success();
    toast.success('Journal lock PIN set');
  };

  // Export JSON backup
  const handleExportJSON = () => {
    try {
      const entries = Array.from(useJournalStore.getState().entries.values());
      const folders = Array.from(useJournalStore.getState().folders.values());
      const exportData = {
        app: 'Reverie',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        entries,
        folders,
        settings,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reverie-backup-${formatDateFile(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      haptics.success();
      toast.success('Backup downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  // Import JSON backup
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.entries && Array.isArray(parsed.entries)) {
        const uid = user?.uid || 'demo-local-user';
        await repository.batchSaveEntries(uid, parsed.entries);
        haptics.success();
        toast.success(`Imported ${parsed.entries.length} entries`);
      } else {
        toast.error('Invalid backup format');
      }
    } catch {
      toast.error('Failed to import backup file');
    } finally {
      if (fileImportRef.current) fileImportRef.current.value = '';
    }
  };

  // Stress test: 5,000 entries
  const handleConfirmStress = async () => {
    setShowStressConfirm(false);
    setIsGeneratingStress(true);
    setStressProgress('Preparing stress test entries…');
    try {
      const uid = user?.uid || 'demo-local-user';
      const count = await repository.generateStressTestEntries(uid, (done, total) => {
        setStressProgress(`Generated ${done} of ${total} entries…`);
      });
      haptics.success();
      toast.success(`Generated ${count} entries! Test search now.`);
    } catch (e) {
      console.warn(e);
      toast.error('Stress test generation interrupted');
    } finally {
      setIsGeneratingStress(false);
      setStressProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-app-bg overflow-y-auto overscroll-contain select-none text-app-text-primary">
      {/* Header */}
      <header className="px-5 pt-safe shrink-0">
        <div className="h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 -ml-2 text-app-accent hover:opacity-80 active:opacity-60 transition"
          >
            <ChevronLeft className="w-6 h-6 -mr-1" />
            <span className="text-[17px] font-medium">Journal</span>
          </button>

          <h1 className="text-[17px] font-semibold text-app-text-primary">Settings</h1>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="flex-1 px-5 pb-24 max-w-2xl w-full mx-auto space-y-6">
        {/* Appearance Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Appearance
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-app-accent-tint text-app-accent flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-app-text-primary">Theme</h3>
                  <p className="text-xs text-app-text-secondary">Choose light, dark, or system match.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-app-bg p-1.5 rounded-xl border border-app-hairline">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  updateSettings({ theme: 'light' });
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  settings.theme === 'light'
                    ? 'bg-app-card text-app-text-primary shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  updateSettings({ theme: 'dark' });
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  settings.theme === 'dark'
                    ? 'bg-app-card text-app-text-primary shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  updateSettings({ theme: 'system' });
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                  settings.theme === 'system'
                    ? 'bg-app-card text-app-text-primary shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>System</span>
              </button>
            </div>
          </div>
        </section>

        {/* Haptics & Feedback Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Tactile Feedback
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                <Vibrate className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-app-text-primary">Haptics</h3>
                <p className="text-xs text-app-text-secondary">
                  Native iOS Safari ticks & Android tactile feedback.
                </p>
              </div>
            </div>

            <Switch
              checked={hapticsEnabled}
              onChange={handleToggleHaptics}
            />
          </div>
        </section>

        {/* Account Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Account & Sync
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#5856D6] to-[#8F97FF] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-app-text-primary">
                    {user?.displayName || (isDemo ? 'Local Storage Mode' : 'Account')}
                  </h3>
                  <p className="text-xs text-app-text-secondary">{user?.email || 'Offline-first demo store'}</p>
                </div>
              </div>

              {isDemo ? (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-app-accent text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold text-app-text-primary hover:text-app-destructive transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>

            {/* Cloud Copy Verification */}
            <div className="pt-3 border-t border-app-hairline flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block text-app-text-primary">Verify Cloud Copy</span>
                <span className="text-[11px] text-app-text-secondary">
                  {cloudVerifyResult || `${entriesCount} local entries`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifyCloud}
                disabled={isVerifyingCloud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-medium text-app-text-primary transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingCloud ? 'animate-spin' : ''}`} />
                <span>Verify</span>
              </button>
            </div>
          </div>
        </section>

        {/* Privacy & Security Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Privacy & Lock
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-app-accent-tint flex items-center justify-center text-app-accent">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-app-text-primary">Lock Journal with PIN</h3>
                  <p className="text-xs text-app-text-secondary">
                    Require PIN on launch and when switching apps.
                  </p>
                </div>
              </div>

              <Switch
                checked={hasPin}
                onChange={(checked) => {
                  if (checked) {
                    setShowPinModal(true);
                  } else {
                    removePin();
                    toast.info('Journal lock removed');
                  }
                }}
              />
            </div>

            {hasPin && (
              <>
                <div className="pt-3 border-t border-app-hairline flex items-center justify-between">
                  <span className="text-xs text-app-text-secondary">Auto-lock after</span>
                  <select
                    value={lockTimeoutMinutes}
                    onChange={(e) => setLockTimeout(parseInt(e.target.value, 10))}
                    className="bg-app-bg border border-app-hairline rounded-xl px-2.5 py-1 text-xs text-app-text-primary focus:outline-none"
                  >
                    <option value={0}>Immediately</option>
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="text-xs font-medium text-app-accent hover:underline"
                  >
                    Change PIN
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Streak Schedule */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Habit & Streak
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-app-text-primary">Streak Schedule</h3>
                <p className="text-xs text-app-text-secondary">Determine streak counting rules.</p>
              </div>
            </div>

            <select
              value={settings.streakSchedule || 'daily'}
              onChange={(e) => updateSettings({ streakSchedule: e.target.value as StreakSchedule })}
              className="bg-app-bg border border-app-hairline rounded-xl px-3 py-1.5 text-xs text-app-text-primary capitalize focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays only</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </section>

        {/* Data & Backup Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Data, Backup & Diagnostics
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-semibold block text-app-text-primary">Export JSON Backup</span>
                <span className="text-xs text-app-text-secondary">Download complete journal data & settings</span>
              </div>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-medium text-app-text-primary hover:opacity-80 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-app-hairline">
              <div>
                <span className="text-sm font-semibold block text-app-text-primary">Import Backup</span>
                <span className="text-xs text-app-text-secondary">Restore from JSON backup</span>
              </div>
              <button
                type="button"
                onClick={() => fileImportRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-medium text-app-text-primary hover:opacity-80 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>

            {/* Stress Test */}
            <div className="flex items-center justify-between py-1 border-t border-app-hairline">
              <div>
                <span className="text-sm font-semibold block text-app-text-primary">Benchmark 5,000 Entries</span>
                <span className="text-xs text-app-text-secondary">
                  {stressProgress || 'Test smooth scrolling & instant search'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowStressConfirm(true)}
                disabled={isGeneratingStress}
                className="px-3 py-1.5 rounded-xl bg-app-accent-tint text-xs font-semibold text-app-accent border border-app-accent/20 transition disabled:opacity-50"
              >
                {isGeneratingStress ? 'Generating…' : 'Run Test'}
              </button>
            </div>
          </div>
        </section>

        {/* Shared Links Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Sharing & Public Links
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-app-text-primary">Shared Links</h3>
                <p className="text-xs text-app-text-secondary">Manage all public web links and view analytics.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.light();
                setShowSharedLinksModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-app-accent-tint text-xs font-semibold text-app-accent border border-app-accent/20 hover:opacity-80 transition"
            >
              Manage
            </button>
          </div>
        </section>

        {/* PWA & Installation Section */}
        <section className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary px-1">
            Install & Offline App
          </span>

          <div className="p-4 rounded-[20px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-app-text-primary">Progressive Web App</h3>
              <p className="text-xs text-app-text-secondary">Install on iOS / mobile for offline writing.</p>
            </div>
            <PWAInstallButton />
          </div>
        </section>

        {/* About Footer */}
        <div className="text-center pt-2 text-xs text-app-text-tertiary">
          <span>Reverie v1.0.0 · Apple Journal polish · Offline first</span>
        </div>
      </main>

      {/* Hidden file input for import */}
      <input
        ref={fileImportRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Set PIN Sheet */}
      <Sheet isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Set Journal PIN">
        <div className="flex flex-col gap-4 text-app-text-primary">
          <p className="text-xs text-app-text-secondary">
            Enter a 4 to 6 digit security code to protect your journal when the app is minimized.
          </p>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1.5 block">
              Enter PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center tracking-widest text-2xl py-3 rounded-2xl bg-app-bg border border-app-card-border text-app-text-primary focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1.5 block">
              Confirm PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinConfirmInput}
              onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center tracking-widest text-2xl py-3 rounded-2xl bg-app-bg border border-app-card-border text-app-text-primary focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
          </div>

          <button
            type="button"
            onClick={handleSavePin}
            className="mt-2 py-3 rounded-2xl bg-app-accent text-white font-bold text-sm shadow transition active:scale-98"
          >
            Save PIN
          </button>
        </div>
      </Sheet>

      {/* Stress Test Confirm Sheet */}
      <ConfirmSheet
        isOpen={showStressConfirm}
        title="Generate 5,000 Entries?"
        description="This will generate realistic journal reflections to benchmark instant search and smooth scrolling."
        confirmLabel="Generate"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={handleConfirmStress}
        onCancel={() => setShowStressConfirm(false)}
      />

      {/* Shared Links List Modal */}
      {showSharedLinksModal && (
        <SharedLinksListModal
          isOpen={showSharedLinksModal}
          onClose={() => setShowSharedLinksModal(false)}
          onOpenActivity={(sId) => {
            setShowSharedLinksModal(false);
            setActivityShareId(sId);
          }}
        />
      )}

      {/* Link Activity Modal */}
      {activityShareId && (
        <LinkActivityModal
          isOpen={Boolean(activityShareId)}
          onClose={() => setActivityShareId(null)}
          shareId={activityShareId}
        />
      )}
    </div>
  );
};

function formatDateFile(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
