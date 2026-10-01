import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from '../types';
import type { DataStore, DocChange, Unsubscribe } from './types';
import { generateDemoEntries, getInitialDemoFolders, getInitialDemoSettings } from './demoSeed';
import { CONFIG } from '../config';

const STORAGE_KEYS = {
  ENTRIES: 'reverie_local_entries',
  FOLDERS: 'reverie_local_folders',
  SETTINGS: 'reverie_local_settings',
  MEDIA: 'reverie_local_media',
};

export class LocalStore implements DataStore {
  public readonly isDemo = true;

  private entriesMap = new Map<string, Entry>();
  private foldersMap = new Map<string, Folder>();
  private settings: UserSettings = getInitialDemoSettings();
  private mediaMap = new Map<string, MediaDoc>();

  private entriesSubscribers = new Set<
    (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void
  >();
  private foldersSubscribers = new Set<(changes: DocChange<Folder>[]) => void>();
  private settingsSubscribers = new Set<(settings: UserSettings | null) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const storedFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      if (storedFolders) {
        const parsed: Folder[] = JSON.parse(storedFolders);
        parsed.forEach((f) => this.foldersMap.set(f.id, f));
      } else {
        const initialFolders = getInitialDemoFolders();
        initialFolders.forEach((f) => this.foldersMap.set(f.id, f));
        this.persistFolders();
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        this.settings = { ...getInitialDemoSettings(), ...JSON.parse(storedSettings) };
      } else {
        this.persistSettings();
      }

      const storedEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (storedEntries) {
        const parsed: Entry[] = JSON.parse(storedEntries);
        parsed.forEach((e) => this.entriesMap.set(e.id, e));
      } else {
        // Seed 60 sample entries on first run
        const demoEntries = generateDemoEntries();
        demoEntries.forEach((e) => this.entriesMap.set(e.id, e));
        this.persistEntries();
      }

      const storedMedia = localStorage.getItem(STORAGE_KEYS.MEDIA);
      if (storedMedia) {
        const parsed: MediaDoc[] = JSON.parse(storedMedia);
        parsed.forEach((m) => this.mediaMap.set(m.id, m));
      }
    } catch (err) {
      console.warn('Could not load from localStorage, initializing fresh in-memory demo', err);
      getInitialDemoFolders().forEach((f) => this.foldersMap.set(f.id, f));
      generateDemoEntries().forEach((e) => this.entriesMap.set(e.id, e));
    }
  }

  private persistEntries() {
    try {
      const arr = Array.from(this.entriesMap.values());
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist entries to localStorage', err);
    }
  }

  private persistFolders() {
    try {
      const arr = Array.from(this.foldersMap.values());
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist folders to localStorage', err);
    }
  }

  private persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (err) {
      console.warn('Failed to persist settings to localStorage', err);
    }
  }

  private persistMedia() {
    try {
      const arr = Array.from(this.mediaMap.values());
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to persist media to localStorage', err);
    }
  }

  public subscribeEntries(
    _uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void
  ): Unsubscribe {
    this.entriesSubscribers.add(onChanges);
    // Initial emit of all current entries as 'added'
    const changes: DocChange<Entry>[] = Array.from(this.entriesMap.values()).map((doc) => ({
      type: 'added',
      doc,
    }));
    setTimeout(() => {
      onChanges(changes, true, false);
    }, 0);

    return () => {
      this.entriesSubscribers.delete(onChanges);
    };
  }

  public subscribeFolders(
    _uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void
  ): Unsubscribe {
    this.foldersSubscribers.add(onChanges);
    const changes: DocChange<Folder>[] = Array.from(this.foldersMap.values()).map((doc) => ({
      type: 'added',
      doc,
    }));
    setTimeout(() => {
      onChanges(changes);
    }, 0);

    return () => {
      this.foldersSubscribers.delete(onChanges);
    };
  }

  public subscribeSettings(
    _uid: string,
    onUpdate: (settings: UserSettings | null) => void
  ): Unsubscribe {
    this.settingsSubscribers.add(onUpdate);
    setTimeout(() => {
      onUpdate(this.settings);
    }, 0);

    return () => {
      this.settingsSubscribers.delete(onUpdate);
    };
  }

  public async saveEntry(_uid: string, entry: Entry): Promise<void> {
    const isNew = !this.entriesMap.has(entry.id);
    this.entriesMap.set(entry.id, entry);
    this.persistEntries();

    const change: DocChange<Entry> = {
      type: isNew ? 'added' : 'modified',
      doc: entry,
    };
    this.entriesSubscribers.forEach((sub) => sub([change], true, false));
  }

  public async deleteEntryPermanently(_uid: string, entryId: string): Promise<void> {
    const entry = this.entriesMap.get(entryId);
    if (!entry) return;

    this.entriesMap.delete(entryId);
    this.persistEntries();

    const change: DocChange<Entry> = {
      type: 'removed',
      doc: entry,
    };
    this.entriesSubscribers.forEach((sub) => sub([change], true, false));
  }

  public async softDeleteEntry(uid: string, entryId: string): Promise<void> {
    const entry = this.entriesMap.get(entryId);
    if (!entry) return;
    const updated: Entry = {
      ...entry,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.saveEntry(uid, updated);
  }

  public async restoreEntry(uid: string, entryId: string): Promise<void> {
    const entry = this.entriesMap.get(entryId);
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
    let purged = 0;
    for (const [id, entry] of this.entriesMap.entries()) {
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
    const total = entries.length;
    const changes: DocChange<Entry>[] = [];

    entries.forEach((e, idx) => {
      const isNew = !this.entriesMap.has(e.id);
      this.entriesMap.set(e.id, e);
      changes.push({
        type: isNew ? 'added' : 'modified',
        doc: e,
      });
      if (onProgress && (idx % 20 === 0 || idx === total - 1)) {
        onProgress(idx + 1, total);
      }
    });

    this.persistEntries();
    this.entriesSubscribers.forEach((sub) => sub(changes, true, false));
  }

  public async saveFolder(_uid: string, folder: Folder): Promise<void> {
    const isNew = !this.foldersMap.has(folder.id);
    this.foldersMap.set(folder.id, folder);
    this.persistFolders();

    const change: DocChange<Folder> = {
      type: isNew ? 'added' : 'modified',
      doc: folder,
    };
    this.foldersSubscribers.forEach((sub) => sub([change]));
  }

  public async deleteFolder(uid: string, folderId: string): Promise<void> {
    const folder = this.foldersMap.get(folderId);
    if (!folder) return;

    // Reparent any child folders
    for (const f of this.foldersMap.values()) {
      if (f.parentId === folderId) {
        f.parentId = folder.parentId;
        this.saveFolder(uid, f);
      }
    }

    // Remove folder membership from all entries (never delete entries!)
    const entriesToUpdate: Entry[] = [];
    for (const entry of this.entriesMap.values()) {
      if (entry.folderIds.includes(folderId)) {
        const newFolderIds = entry.folderIds.filter((id) => id !== folderId);
        // If entry has no other folder, assign default "Journal" folder
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

    this.foldersMap.delete(folderId);
    this.persistFolders();

    const change: DocChange<Folder> = {
      type: 'removed',
      doc: folder,
    };
    this.foldersSubscribers.forEach((sub) => sub([change]));
  }

  public async saveSettings(_uid: string, settings: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.persistSettings();
    this.settingsSubscribers.forEach((sub) => sub(this.settings));
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
    _uid: string,
    localEntryCount: number
  ): Promise<{ localCount: number; cloudCount: number; matches: boolean; hasPending: boolean }> {
    const nonDeletedCount = Array.from(this.entriesMap.values()).filter((e) => !e.deletedAt).length;
    return {
      localCount: localEntryCount,
      cloudCount: nonDeletedCount,
      matches: true,
      hasPending: false,
    };
  }

  // Developer tool: generate 2,000 entries for stress testing
  public async generateStressTestEntries(uid: string, onProgress?: (p: number, t: number) => void): Promise<number> {
    const now = Date.now();
    const batch: Entry[] = [];
    const count = 2000;

    for (let i = 0; i < count; i++) {
      const entryDate = now - i * 14400000; // ~4 hours apart
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
