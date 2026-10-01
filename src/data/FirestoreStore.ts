import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from "../types";
import type { DataStore, DocChange, Unsubscribe } from "./types";

/** Cloud store is disabled in this local-first build. */
export class FirestoreStore implements DataStore {
  public readonly isDemo = false;

  subscribeEntries(
    _uid: string,
    _onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void,
    _onError?: (error: Error) => void,
  ): Unsubscribe {
    return () => {};
  }

  subscribeFolders(
    _uid: string,
    _onChanges: (changes: DocChange<Folder>[]) => void,
    _onError?: (error: Error) => void,
  ): Unsubscribe {
    return () => {};
  }

  subscribeSettings(
    _uid: string,
    _onUpdate: (settings: UserSettings | null) => void,
    _onError?: (error: Error) => void,
  ): Unsubscribe {
    return () => {};
  }

  async saveEntry(_uid: string, _entry: Entry): Promise<void> {}
  async deleteEntryPermanently(_uid: string, _entryId: string): Promise<void> {}
  async softDeleteEntry(_uid: string, _entryId: string): Promise<void> {}
  async restoreEntry(_uid: string, _entryId: string): Promise<void> {}
  async purgeOldDeletedEntries(_uid: string, _maxAgeDays: number): Promise<number> {
    return 0;
  }
  async batchSaveEntries(
    _uid: string,
    _entries: Entry[],
    _onProgress?: (completed: number, total: number) => void,
  ): Promise<void> {}
  async saveFolder(_uid: string, _folder: Folder): Promise<void> {}
  async deleteFolder(_uid: string, _folderId: string): Promise<void> {}
  async saveSettings(_uid: string, _settings: Partial<UserSettings>): Promise<void> {}
  async saveMedia(_uid: string, _mediaDoc: MediaDoc): Promise<void> {}
  async getMedia(_uid: string, _mediaId: string): Promise<MediaDoc | null> {
    return null;
  }
  async deleteMedia(_uid: string, _mediaId: string): Promise<void> {}
  getSyncStatus(): SyncStatus {
    return "synced";
  }
  async verifyCloudCopy(uid: string, localEntryCount: number) {
    return { localCount: localEntryCount, cloudCount: 0, matches: false, hasPending: false };
  }
}
