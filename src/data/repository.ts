import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from "../types";
import type { DataStore, DocChange, Unsubscribe } from "./types";
import { LocalStore } from "./LocalStore";

class Repository {
  private localStore: LocalStore;

  constructor() {
    this.localStore = new LocalStore();
  }

  private getStore(_uid: string): DataStore {
    return this.localStore;
  }

  public get isDemo(): boolean {
    return true;
  }

  public getSyncStatus(): SyncStatus {
    return "synced";
  }

  public subscribeEntries(
    uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return this.getStore(uid).subscribeEntries(uid, onChanges, onError);
  }

  public subscribeFolders(
    uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return this.getStore(uid).subscribeFolders(uid, onChanges, onError);
  }

  public subscribeSettings(
    uid: string,
    onUpdate: (settings: UserSettings | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return this.getStore(uid).subscribeSettings(uid, onUpdate, onError);
  }

  public async saveEntry(uid: string, entry: Entry): Promise<void> {
    return this.getStore(uid).saveEntry(uid, entry);
  }

  public async softDeleteEntry(uid: string, entryId: string): Promise<void> {
    return this.getStore(uid).softDeleteEntry(uid, entryId);
  }

  public async restoreEntry(uid: string, entryId: string): Promise<void> {
    return this.getStore(uid).restoreEntry(uid, entryId);
  }

  public async deletePermanently(uid: string, entryId: string): Promise<void> {
    return this.getStore(uid).deleteEntryPermanently(uid, entryId);
  }

  public async purgeOldDeletedEntries(uid: string, maxAgeDays: number): Promise<number> {
    return this.getStore(uid).purgeOldDeletedEntries(uid, maxAgeDays);
  }

  public async batchSaveEntries(
    uid: string,
    entries: Entry[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<void> {
    return this.getStore(uid).batchSaveEntries(uid, entries, onProgress);
  }

  public async saveFolder(uid: string, folder: Folder): Promise<void> {
    return this.getStore(uid).saveFolder(uid, folder);
  }

  public async deleteFolder(uid: string, folderId: string): Promise<void> {
    return this.getStore(uid).deleteFolder(uid, folderId);
  }

  public async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    return this.getStore(uid).saveSettings(uid, settings);
  }

  private get currentUid(): string {
    return "demo-local-user";
  }

  public async saveMedia(mediaDoc: MediaDoc, uid?: string): Promise<void> {
    const targetUid = uid || this.currentUid;
    return this.getStore(targetUid).saveMedia(targetUid, mediaDoc);
  }

  public async getMedia(mediaId: string, uid?: string): Promise<MediaDoc | null> {
    const targetUid = uid || this.currentUid;
    return this.getStore(targetUid).getMedia(targetUid, mediaId);
  }

  public async deleteMedia(mediaId: string, uid?: string): Promise<void> {
    const targetUid = uid || this.currentUid;
    return this.getStore(targetUid).deleteMedia(targetUid, mediaId);
  }

  public async verifyCloudCopy(
    uid: string,
    localEntryCount: number,
  ): Promise<{ localCount: number; cloudCount: number; matches: boolean; hasPending: boolean }> {
    return this.getStore(uid).verifyCloudCopy(uid, localEntryCount);
  }

  public async generateStressTestEntries(uid: string, onProgress?: (p: number, t: number) => void): Promise<number> {
    const store = this.getStore(uid);
    if (store instanceof LocalStore) {
      return store.generateStressTestEntries(uid, onProgress);
    }
    return 0;
  }
}

export const repository = new Repository();
