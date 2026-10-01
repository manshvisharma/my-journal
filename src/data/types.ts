import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from '../types';

export interface DocChange<T> {
  type: 'added' | 'modified' | 'removed';
  doc: T;
}

export type Unsubscribe = () => void;

export interface DataStore {
  readonly isDemo: boolean;

  // Real-time subscriptions
  subscribeEntries(
    uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void,
    onError?: (error: Error) => void
  ): Unsubscribe;

  subscribeFolders(
    uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe;

  subscribeSettings(
    uid: string,
    onUpdate: (settings: UserSettings | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe;

  // Entry CRUD
  saveEntry(uid: string, entry: Entry): Promise<void>;
  deleteEntryPermanently(uid: string, entryId: string): Promise<void>;
  softDeleteEntry(uid: string, entryId: string): Promise<void>;
  restoreEntry(uid: string, entryId: string): Promise<void>;
  purgeOldDeletedEntries(uid: string, maxAgeDays: number): Promise<number>;

  // Batch operations
  batchSaveEntries(uid: string, entries: Entry[], onProgress?: (completed: number, total: number) => void): Promise<void>;

  // Folder CRUD
  saveFolder(uid: string, folder: Folder): Promise<void>;
  deleteFolder(uid: string, folderId: string): Promise<void>;

  // Settings
  saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void>;

  // Media
  saveMedia(uid: string, mediaDoc: MediaDoc): Promise<void>;
  getMedia(uid: string, mediaId: string): Promise<MediaDoc | null>;
  deleteMedia(uid: string, mediaId: string): Promise<void>;

  // Sync / Verification
  getSyncStatus(): SyncStatus;
  verifyCloudCopy(uid: string, localEntryCount: number): Promise<{
    localCount: number;
    cloudCount: number;
    matches: boolean;
    hasPending: boolean;
  }>;
}
