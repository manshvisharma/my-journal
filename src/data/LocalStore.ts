import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from '../types';
import type { DataStore, DocChange, Unsubscribe } from './types';
import { generateDemoEntries, getInitialDemoFolders, getInitialDemoSettings } from './demoSeed';
import { CONFIG } from '../config';

export class LocalStore implements DataStore {
  public readonly isDemo = true;

  private userEntries = new Map<string, Map<string, Entry>>();
  private userFolders = new Map<string, Map<string, Folder>>();
  private userSettings = new Map<string, UserSettings>();
  private mediaMap = new Map<string, MediaDoc>();

  private entriesSubscribers = new Map<
    string,
    Set<(changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void>
  >();
  private foldersSubscribers = new Map<string, Set<(changes: DocChange<Folder>[]) => void>>();
  private settingsSubscribers = new Map<string, Set<(settings: UserSettings | null) => void>>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedMedia = localStorage.getItem('reverie_local_media');
        if (storedMedia) {
          const parsed: MediaDoc[] = JSON.parse(storedMedia);
          parsed.forEach((m) => this.mediaMap.set(m.id, m));
        }
      } catch (err) {
        console.warn('Failed to load media from localStorage', err);
      }
    }
  }

  private getEntriesKey(uid: string): string {
    return uid === 'demo-local-user' || !uid ? 'reverie_demo_entries' : `reverie_user_entries_${uid}`;
  }

  private getFoldersKey(uid: string): string {
    return uid === 'demo-local-user' || !uid ? 'reverie_demo_folders' : `reverie_user_folders_${uid}`;
  }

  private getSettingsKey(uid: string): string {
    return uid === 'demo-local-user' || !uid ? 'reverie_demo_settings' : `reverie_user_settings_${uid}`;
  }

  private getEntriesMap(uid: string): Map<string, Entry> {
    if (!this.userEntries.has(uid)) {
      const map = new Map<string, Entry>();
      if (typeof window !== 'undefined') {
        try {
          const isDemo = uid === 'demo-local-user' || !uid;
          const key = this.getEntriesKey(uid);
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed: Entry[] = JSON.parse(stored);
            parsed.forEach((e) => map.set(e.id, e));
          } else if (isDemo) {
            // Seed sample entries ONLY in demo exploration mode
            const demoEntries = generateDemoEntries();
            demoEntries.forEach((e) => map.set(e.id, e));
            localStorage.setItem(key, JSON.stringify(demoEntries));
          }
          // Real users start with 0 entries (completely clean and fresh!)
        } catch (err) {
          console.warn('Could not load entries from localStorage for uid:', uid, err);
        }
      }
      this.userEntries.set(uid, map);
    }
    return this.userEntries.get(uid)!;
  }

  private getFoldersMap(uid: string): Map<string, Folder> {
    if (!this.userFolders.has(uid)) {
      const map = new Map<string, Folder>();
      if (typeof window !== 'undefined') {
        try {
          const isDemo = uid === 'demo-local-user' || !uid;
          const key = this.getFoldersKey(uid);
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed: Folder[] = JSON.parse(stored);
            parsed.forEach((f) => map.set(f.id, f));
          } else if (isDemo) {
            // Seed sample folders ONLY in demo exploration mode
            const initialFolders = getInitialDemoFolders();
            initialFolders.forEach((f) => map.set(f.id, f));
            localStorage.setItem(key, JSON.stringify(initialFolders));
          }
          // Real users start with 0 custom folders!
        } catch (err) {
          console.warn('Could not load folders from localStorage for uid:', uid, err);
        }
      }
      this.userFolders.set(uid, map);
    }
    return this.userFolders.get(uid)!;
  }

  private getSettings(uid: string): UserSettings {
    if (!this.userSettings.has(uid)) {
      let settings = getInitialDemoSettings();
      if (typeof window !== 'undefined') {
        try {
          const key = this.getSettingsKey(uid);
          const stored = localStorage.getItem(key);
          if (stored) {
            settings = { ...settings, ...JSON.parse(stored) };
          }
        } catch (err) {
          console.warn('Could not load settings from localStorage for uid:', uid, err);
        }
      }
      this.userSettings.set(uid, settings);
    }
    return this.userSettings.get(uid)!;
  }

  private persistEntries(uid: string) {
    if (typeof window === 'undefined') return;
    try {
      const map = this.getEntriesMap(uid);
      const arr = Array.from(map.values());
      localStorage.setItem(this.getEntriesKey(uid), JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist entries to localStorage for uid:', uid, err);
    }
  }

  private persistFolders(uid: string) {
    if (typeof window === 'undefined') return;
    try {
      const map = this.getFoldersMap(uid);
      const arr = Array.from(map.values());
      localStorage.setItem(this.getFoldersKey(uid), JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist folders to localStorage for uid:', uid, err);
    }
  }

  private persistSettings(uid: string) {
    if (typeof window === 'undefined') return;
    try {
      const settings = this.getSettings(uid);
      localStorage.setItem(this.getSettingsKey(uid), JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to persist settings to localStorage for uid:', uid, err);
    }
  }

  private persistMedia() {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(this.mediaMap.values());
      localStorage.setItem('reverie_local_media', JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist media to localStorage', err);
    }
  }

  public subscribeEntries(
    uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void
  ): Unsubscribe {
    if (!this.entriesSubscribers.has(uid)) {
      this.entriesSubscribers.set(uid, new Set());
    }
    const subs = this.entriesSubscribers.get(uid)!;
    subs.add(onChanges);

    const map = this.getEntriesMap(uid);
    const changes: DocChange<Entry>[] = Array.from(map.values()).map((doc) => ({
      type: 'added',
      doc,
    }));

    setTimeout(() => {
      onChanges(changes, true, false);
    }, 0);

    return () => {
      subs.delete(onChanges);
    };
  }

  public subscribeFolders(
    uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void
  ): Unsubscribe {
    if (!this.foldersSubscribers.has(uid)) {
      this.foldersSubscribers.set(uid, new Set());
    }
    const subs = this.foldersSubscribers.get(uid)!;
    subs.add(onChanges);

    const map = this.getFoldersMap(uid);
    const changes: DocChange<Folder>[] = Array.from(map.values()).map((doc) => ({
      type: 'added',
      doc,
    }));

    setTimeout(() => {
      onChanges(changes);
    }, 0);

    return () => {
      subs.delete(onChanges);
    };
  }

  public subscribeSettings(
    uid: string,
    onUpdate: (settings: UserSettings | null) => void
  ): Unsubscribe {
    if (!this.settingsSubscribers.has(uid)) {
      this.settingsSubscribers.set(uid, new Set());
    }
    const subs = this.settingsSubscribers.get(uid)!;
    subs.add(onUpdate);

    const currentSettings = this.getSettings(uid);
    setTimeout(() => {
      onUpdate(currentSettings);
    }, 0);

    return () => {
      subs.delete(onUpdate);
    };
  }

  public async saveEntry(uid: string, entry: Entry): Promise<void> {
    const map = this.getEntriesMap(uid);
    const isNew = !map.has(entry.id);
    map.set(entry.id, entry);
    this.persistEntries(uid);

    const change: DocChange<Entry> = {
      type: isNew ? 'added' : 'modified',
      doc: entry,
    };
    const subs = this.entriesSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub([change], true, false));
    }
  }

  public async deleteEntryPermanently(uid: string, entryId: string): Promise<void> {
    const map = this.getEntriesMap(uid);
    const entry = map.get(entryId);
    if (!entry) return;

    map.delete(entryId);
    this.persistEntries(uid);

    const change: DocChange<Entry> = {
      type: 'removed',
      doc: entry,
    };
    const subs = this.entriesSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub([change], true, false));
    }
  }

  public async softDeleteEntry(uid: string, entryId: string): Promise<void> {
    const map = this.getEntriesMap(uid);
    const entry = map.get(entryId);
    if (!entry) return;
    const updated: Entry = {
      ...entry,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.saveEntry(uid, updated);
  }

  public async restoreEntry(uid: string, entryId: string): Promise<void> {
    const map = this.getEntriesMap(uid);
    const entry = map.get(entryId);
    if (!entry) return;
    const updated: Entry = {
      ...entry,
      deletedAt: null,
      updatedAt: Date.now(),
    };
    await this.saveEntry(uid, updated);
  }

  public async purgeOldDeletedEntries(uid: string, maxAgeDays: number = CONFIG.autoPurgeDays): Promise<number> {
    const cutoff = Date.now() - maxAgeDays * 86400000;
    const map = this.getEntriesMap(uid);
    let purged = 0;
    for (const [id, entry] of map.entries()) {
      if (entry.deletedAt && entry.deletedAt < cutoff) {
        await this.deleteEntryPermanently(uid, id);
        purged++;
      }
    }
    return purged;
  }

  public async batchSaveEntries(
    uid: string,
    entries: Entry[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const map = this.getEntriesMap(uid);
    const total = entries.length;
    const changes: DocChange<Entry>[] = [];

    entries.forEach((e, idx) => {
      const isNew = !map.has(e.id);
      map.set(e.id, e);
      changes.push({
        type: isNew ? 'added' : 'modified',
        doc: e,
      });
      if (onProgress && (idx % 20 === 0 || idx === total - 1)) {
        onProgress(idx + 1, total);
      }
    });

    this.persistEntries(uid);
    const subs = this.entriesSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub(changes, true, false));
    }
  }

  public async saveFolder(uid: string, folder: Folder): Promise<void> {
    const map = this.getFoldersMap(uid);
    const isNew = !map.has(folder.id);
    map.set(folder.id, folder);
    this.persistFolders(uid);

    const change: DocChange<Folder> = {
      type: isNew ? 'added' : 'modified',
      doc: folder,
    };
    const subs = this.foldersSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub([change]));
    }
  }

  public async deleteFolder(uid: string, folderId: string): Promise<void> {
    const map = this.getFoldersMap(uid);
    const folder = map.get(folderId);
    if (!folder) return;

    // Reparent any child folders
    for (const f of map.values()) {
      if (f.parentId === folderId) {
        f.parentId = folder.parentId;
        this.saveFolder(uid, f);
      }
    }

    // Remove folder membership from all entries
    const entriesMap = this.getEntriesMap(uid);
    const entriesToUpdate: Entry[] = [];
    for (const entry of entriesMap.values()) {
      if (entry.folderIds.includes(folderId)) {
        const newFolderIds = entry.folderIds.filter((id) => id !== folderId);
        if (newFolderIds.length === 0) {
          newFolderIds.push(CONFIG.defaultFolderId);
        }
        entriesToUpdate.push({
          ...entry,
          folderIds: newFolderIds,
          updatedAt: Date.now(),
        });
      }
    }
    await this.batchSaveEntries(uid, entriesToUpdate);

    map.delete(folderId);
    this.persistFolders(uid);

    const change: DocChange<Folder> = {
      type: 'removed',
      doc: folder,
    };
    const subs = this.foldersSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub([change]));
    }
  }

  public async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    const current = this.getSettings(uid);
    const updated = { ...current, ...settings };
    this.userSettings.set(uid, updated);
    this.persistSettings(uid);

    const subs = this.settingsSubscribers.get(uid);
    if (subs) {
      subs.forEach((sub) => sub(updated));
    }
  }

  public async saveMedia(_uid: string, mediaDoc: MediaDoc): Promise<void> {
    this.mediaMap.set(mediaDoc.id, mediaDoc);
    this.persistMedia();
  }

  public async getMedia(_uid: string, mediaId: string): Promise<MediaDoc | null> {
    return this.mediaMap.get(mediaId) || null;
  }

  public async deleteMedia(_uid: string, mediaId: string): Promise<void> {
    this.mediaMap.delete(mediaId);
    this.persistMedia();
  }

  public getSyncStatus(): SyncStatus {
    return 'synced';
  }

  public async verifyCloudCopy(
    uid: string,
    localEntryCount: number
  ): Promise<{ localCount: number; cloudCount: number; matches: boolean; hasPending: boolean }> {
    const map = this.getEntriesMap(uid);
    const nonDeletedCount = Array.from(map.values()).filter((e) => !e.deletedAt).length;
    return {
      localCount: localEntryCount,
      cloudCount: nonDeletedCount,
      matches: true,
      hasPending: false,
    };
  }

  public async generateStressTestEntries(uid: string, onProgress?: (p: number, t: number) => void): Promise<number> {
    const now = Date.now();
    const batch: Entry[] = [];
    const count = 2000;

    for (let i = 0; i < count; i++) {
      const entryDate = now - i * 14400000;
      const title = `Performance Stress Test Entry #${i + 1}`;
      const plainText = `This is generated entry number ${i + 1} to test list virtualisation, search speed, and memory pressure. Hinglish words like sukoon, khushi, mehnat, and shanti are indexed. Checking rapid rendering and smooth scrolling.`;
      batch.push({
        id: `perf-test-${i + 1}`,
        title,
        bodyJson: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: plainText }] }],
        }),
        plainText,
        snippet: plainText.slice(0, 160),
        wordCount: plainText.split(/\s+/).length,
        entryDate,
        createdAt: entryDate,
        updatedAt: entryDate,
        folderIds: [CONFIG.defaultFolderId],
        tags: ['benchmark', 'test'],
        bookmarked: i % 15 === 0,
        pinned: false,
        pinnedAt: null,
        mood: null,
        media: [],
        coverThumb: null,
        songs: [],
        location: null,
        attachmentOrder: [],
        deletedAt: null,
        source: 'app',
        importKey: null,
        schemaVersion: 1,
      });
    }

    await this.batchSaveEntries(uid, batch, onProgress);
    return count;
  }
}
