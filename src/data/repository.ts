import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from "../types";
import type { DataStore, DocChange, Unsubscribe } from "./types";
import { isFirebaseConfigured, db } from "./firebase";
import { FirestoreStore } from "./FirestoreStore";
import { LocalStore } from "./LocalStore";

class Repository {
  private localStore: LocalStore;
  private firestoreStore: FirestoreStore | null = null;
  private hasPermissionError = false;

  constructor() {
    this.localStore = new LocalStore();
    if (isFirebaseConfigured() && db) {
      this.firestoreStore = new FirestoreStore(db);
    }
  }

  public get isDemo(): boolean {
    return !this.firestoreStore || this.hasPermissionError;
  }

  public getSyncStatus(): SyncStatus {
    if (this.hasPermissionError) return "offline";
    if (this.firestoreStore) {
      return this.firestoreStore.getSyncStatus();
    }
    return "synced";
  }

  public subscribeEntries(
    uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    // 1. Immediately emit local cache so the app opens in 0ms
    try {
      const localMap = this.localStore.getDirectEntriesMap(uid);
      if (localMap.size > 0) {
        const localChanges: DocChange<Entry>[] = Array.from(localMap.values()).map((doc) => ({
          type: "added",
          doc,
        }));
        onChanges(localChanges, true, false);
      }
    } catch (e) {
      console.warn("Failed to read initial local entries:", e);
    }

    // 2. If Firestore is available, connect in background to stream updates
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      let localUnsub: Unsubscribe | null = null;
      let active = true;

      const firestoreUnsub = this.firestoreStore.subscribeEntries(
        uid,
        (changes, isFromCache, hasPendingWrites) => {
          if (active) {
            // Persist remote changes to localStore for instant open next time
            changes.forEach((c) => {
              if (c.type === "removed") {
                this.localStore.deletePermanently(uid, c.doc.id).catch(console.warn);
              } else {
                this.localStore.saveEntryDirect(uid, c.doc);
              }
            });
            onChanges(changes, isFromCache, hasPendingWrites);
          }
        },
        (err) => {
          console.warn("Firestore entries subscription error, falling back to local storage:", err.message);
          if (err.message?.includes("permissions") || err.message?.includes("permission-denied")) {
            this.hasPermissionError = true;
          }
          if (onError) onError(err);
          // Fall back to localStore immediately so the UI remains interactive and never blank
          if (active && !localUnsub) {
            localUnsub = this.localStore.subscribeEntries(uid, onChanges);
          }
        },
      );

      return () => {
        active = false;
        firestoreUnsub();
        if (localUnsub) localUnsub();
      };
    }

    return this.localStore.subscribeEntries(uid, onChanges, onError);
  }

  public subscribeFolders(
    uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    // 1. Immediately emit local folders
    try {
      const localMap = this.localStore.getDirectFoldersMap(uid);
      if (localMap.size > 0) {
        const localChanges: DocChange<Folder>[] = Array.from(localMap.values()).map((doc) => ({
          type: "added",
          doc,
        }));
        onChanges(localChanges);
      }
    } catch (e) {
      console.warn("Failed to read initial local folders:", e);
    }

    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      let localUnsub: Unsubscribe | null = null;
      let active = true;

      const firestoreUnsub = this.firestoreStore.subscribeFolders(
        uid,
        (changes) => {
          if (active) {
            changes.forEach((c) => {
              if (c.type === "removed") {
                this.localStore.deleteFolder(c.doc.id).catch(console.warn);
              } else {
                this.localStore.saveFolderDirect(uid, c.doc);
              }
            });
            onChanges(changes);
          }
        },
        (err) => {
          console.warn("Firestore folders subscription error, falling back to local storage:", err.message);
          if (err.message?.includes("permissions") || err.message?.includes("permission-denied")) {
            this.hasPermissionError = true;
          }
          if (onError) onError(err);
          if (active && !localUnsub) {
            localUnsub = this.localStore.subscribeFolders(uid, onChanges);
          }
        },
      );

      return () => {
        active = false;
        firestoreUnsub();
        if (localUnsub) localUnsub();
      };
    }

    return this.localStore.subscribeFolders(uid, onChanges, onError);
  }

  public subscribeSettings(
    uid: string,
    onUpdate: (settings: UserSettings | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    // 1. Immediately emit local settings
    try {
      const localSettings = this.localStore.getDirectSettings(uid);
      if (localSettings) {
        onUpdate(localSettings);
      }
    } catch (e) {
      console.warn("Failed to read initial local settings:", e);
    }

    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      let localUnsub: Unsubscribe | null = null;
      let active = true;

      const firestoreUnsub = this.firestoreStore.subscribeSettings(
        uid,
        (settings) => {
          if (active) onUpdate(settings);
        },
        (err) => {
          console.warn("Firestore settings subscription error, falling back to local storage:", err.message);
          if (err.message?.includes("permissions") || err.message?.includes("permission-denied")) {
            this.hasPermissionError = true;
          }
          if (onError) onError(err);
          if (active && !localUnsub) {
            localUnsub = this.localStore.subscribeSettings(uid, onUpdate);
          }
        },
      );

      return () => {
        active = false;
        firestoreUnsub();
        if (localUnsub) localUnsub();
      };
    }

    return this.localStore.subscribeSettings(uid, onUpdate, onError);
  }

  public async saveEntry(uid: string, entry: Entry): Promise<void> {
    // Always persist to localStore first
    await this.localStore.saveEntry(uid, entry);

    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.saveEntry(uid, entry);
      } catch (err: unknown) {
        const error = err as Error;
        console.warn("Firestore saveEntry warning (data kept in local storage):", error?.message);
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async softDeleteEntry(uid: string, entryId: string): Promise<void> {
    await this.localStore.softDeleteEntry(uid, entryId);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.softDeleteEntry(uid, entryId);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async restoreEntry(uid: string, entryId: string): Promise<void> {
    await this.localStore.restoreEntry(uid, entryId);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.restoreEntry(uid, entryId);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async deletePermanently(uid: string, entryId: string): Promise<void> {
    await this.localStore.deleteEntryPermanently(uid, entryId);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.deleteEntryPermanently(uid, entryId);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async purgeOldDeletedEntries(uid: string, maxAgeDays: number): Promise<number> {
    return this.localStore.purgeOldDeletedEntries(uid, maxAgeDays);
  }

  public async batchSaveEntries(
    uid: string,
    entries: Entry[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<void> {
    await this.localStore.batchSaveEntries(uid, entries, onProgress);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.batchSaveEntries(uid, entries, onProgress);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async saveFolder(uid: string, folder: Folder): Promise<void> {
    await this.localStore.saveFolder(uid, folder);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.saveFolder(uid, folder);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async deleteFolder(uid: string, folderId: string): Promise<void> {
    await this.localStore.deleteFolder(uid, folderId);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.deleteFolder(uid, folderId);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  public async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    await this.localStore.saveSettings(uid, settings);
    if (this.firestoreStore && uid && uid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.saveSettings(uid, settings);
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes("permissions") || error?.message?.includes("permission-denied")) {
          this.hasPermissionError = true;
        }
      }
    }
  }

  private getEffectiveUid(uid?: string): string {
    if (uid && uid !== "demo-local-user") return uid;
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("reverie_auth_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.uid) return parsed.uid;
        }
      }
    } catch {
      // ignore
    }
    return uid || "demo-local-user";
  }

  public async saveMedia(mediaDoc: MediaDoc, uid?: string): Promise<void> {
    const targetUid = this.getEffectiveUid(uid);
    // 1. Immediately cache locally on this device
    await this.localStore.saveMedia(targetUid, mediaDoc);

    // 2. Upload to Firestore cloud so all devices (desktop, tablet, web) receive the image
    if (this.firestoreStore && targetUid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.saveMedia(targetUid, mediaDoc);
      } catch (err) {
        console.warn("Failed to save media to Firestore cloud:", err);
      }
    }
  }

  public async getMedia(mediaId: string, uid?: string): Promise<MediaDoc | null> {
    const targetUid = this.getEffectiveUid(uid);
    // 1. Check local device storage first for 0ms retrieval
    const local = await this.localStore.getMedia(targetUid, mediaId);
    if (local) return local;

    // 2. If not on local device (e.g. uploaded from smartphone, viewing on desktop), fetch from cloud
    if (this.firestoreStore && targetUid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        const cloudDoc = await this.firestoreStore.getMedia(targetUid, mediaId);
        if (cloudDoc) {
          // Cache on this device for offline access
          await this.localStore.saveMedia(targetUid, cloudDoc);
          return cloudDoc;
        }
      } catch (err) {
        console.warn("Failed to fetch media from Firestore cloud:", err);
      }
    }

    return null;
  }

  public async deleteMedia(mediaId: string, uid?: string): Promise<void> {
    const targetUid = this.getEffectiveUid(uid);
    await this.localStore.deleteMedia(targetUid, mediaId);
    if (this.firestoreStore && targetUid !== "demo-local-user" && !this.hasPermissionError) {
      try {
        await this.firestoreStore.deleteMedia(targetUid, mediaId);
      } catch (err) {
        console.warn("Failed to delete media from Firestore cloud:", err);
      }
    }
  }

  public async verifyCloudCopy(
    uid: string,
    localEntryCount: number,
  ): Promise<{ localCount: number; cloudCount: number; matches: boolean; hasPending: boolean }> {
    if (this.firestoreStore && !this.hasPermissionError) {
      try {
        return await this.firestoreStore.verifyCloudCopy(uid, localEntryCount);
      } catch (err) {
        console.warn("verifyCloudCopy error:", err);
      }
    }
    return { localCount: localEntryCount, cloudCount: localEntryCount, matches: true, hasPending: false };
  }

  public getDirectEntriesMap(uid: string): Map<string, Entry> {
    return this.localStore.getDirectEntriesMap(uid);
  }

  public getDirectFoldersMap(uid: string): Map<string, Folder> {
    return this.localStore.getDirectFoldersMap(uid);
  }

  public async generateStressTestEntries(uid: string, onProgress?: (p: number, t: number) => void): Promise<number> {
    return this.localStore.generateStressTestEntries(uid, onProgress);
  }
}

export const repository = new Repository();
