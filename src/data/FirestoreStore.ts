import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDoc,
  getDocFromCache,
  getCountFromServer,
  waitForPendingWrites,
  type Firestore,
} from "firebase/firestore";
import type { Entry, Folder, MediaDoc, SyncStatus, UserSettings } from "../types";
import type { DataStore, DocChange, Unsubscribe } from "./types";
import { CONFIG } from "../config";

export class FirestoreStore implements DataStore {
  public readonly isDemo = false;
  private db: Firestore;
  private syncStatus: SyncStatus = "synced";
  private statusListeners = new Set<(status: SyncStatus) => void>();

  constructor(db: Firestore) {
    this.db = db;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.updateStatus("syncing"));
      window.addEventListener("offline", () => this.updateStatus("offline"));
    }
  }

  private updateStatus(newStatus: SyncStatus) {
    this.syncStatus = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  public subscribeEntries(
    uid: string,
    onChanges: (changes: DocChange<Entry>[], isFromCache: boolean, hasPendingWrites: boolean) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.db, "users", uid, "entries");

    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          this.updateStatus("offline");
        } else if (hasPendingWrites) {
          this.updateStatus("syncing");
        } else {
          this.updateStatus("synced");
        }

        const changes: DocChange<Entry>[] = snapshot.docChanges().map((change) => ({
          type: change.type,
          doc: change.doc.data() as Entry,
        }));

        onChanges(changes, isFromCache, hasPendingWrites);
      },
      (err) => {
        console.error("Entries subscription error:", err);
        this.updateStatus("error");
        if (onError) onError(err);
      }
    );
  }

  public subscribeFolders(
    uid: string,
    onChanges: (changes: DocChange<Folder>[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.db, "users", uid, "folders");

    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const changes: DocChange<Folder>[] = snapshot.docChanges().map((change) => ({
          type: change.type,
          doc: change.doc.data() as Folder,
        }));
        onChanges(changes);
      },
      (err) => {
        console.error("Folders subscription error:", err);
        if (onError) onError(err);
      }
    );
  }

  public subscribeSettings(
    uid: string,
    onUpdate: (settings: UserSettings | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(this.db, "users", uid, "settings", "main");

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as UserSettings);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.error("Settings subscription error:", err);
        if (onError) onError(err);
      }
    );
  }

  public async saveEntry(uid: string, entry: Entry): Promise<void> {
    const docRef = doc(this.db, "users", uid, "entries", entry.id);
    await setDoc(docRef, entry, { merge: true });
  }

  public async deleteEntryPermanently(uid: string, entryId: string): Promise<void> {
    const docRef = doc(this.db, "users", uid, "entries", entryId);
    await deleteDoc(docRef);
  }

  public async softDeleteEntry(uid: string, entryId: string): Promise<void> {
    const docRef = doc(this.db, "users", uid, "entries", entryId);
    await setDoc(docRef, { deletedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
  }

  public async restoreEntry(uid: string, entryId: string): Promise<void> {
    const docRef = doc(this.db, "users", uid, "entries", entryId);
    await setDoc(docRef, { deletedAt: null, updatedAt: Date.now() }, { merge: true });
  }

  public async purgeOldDeletedEntries(uid: string, _maxAgeDays: number = CONFIG.autoPurgeDays): Promise<number> {
    return 0;
  }

  public async batchSaveEntries(
    uid: string,
    entries: Entry[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const CHUNK_SIZE = 400;
    const total = entries.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(this.db);

      chunk.forEach((entry) => {
        const docRef = doc(this.db, "users", uid, "entries", entry.id);
        batch.set(docRef, entry, { merge: true });
      });

      await batch.commit();
      if (onProgress) {
        onProgress(Math.min(i + chunk.length, total), total);
      }
    }
  }

  public async saveFolder(uid: string, folder: Folder): Promise<void> {
    const docRef = doc(this.db, "users", uid, "folders", folder.id);
    await setDoc(docRef, folder, { merge: true });
  }

  public async deleteFolder(uid: string, folderId: string): Promise<void> {
    const docRef = doc(this.db, "users", uid, "folders", folderId);
    await deleteDoc(docRef);
  }

  public async saveSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    const docRef = doc(this.db, "users", uid, "settings", "main");
    await setDoc(docRef, settings, { merge: true });
  }

  public async saveMedia(uid: string, mediaDoc: MediaDoc): Promise<void> {
    const docRef = doc(this.db, "users", uid, "media", mediaDoc.id);
    await setDoc(docRef, mediaDoc, { merge: true });
  }

  public async getMedia(uid: string, mediaId: string): Promise<MediaDoc | null> {
    const docRef = doc(this.db, "users", uid, "media", mediaId);
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        return cacheSnap.data() as MediaDoc;
      }
    } catch {
      // Fall through to server getDoc
    }

    try {
      const serverSnap = await getDoc(docRef);
      if (serverSnap.exists()) {
        return serverSnap.data() as MediaDoc;
      }
    } catch (err) {
      console.warn("Failed to retrieve media doc:", err);
    }
    return null;
  }

  public async deleteMedia(uid: string, mediaId: string): Promise<void> {
    const docRef = doc(this.db, "users", uid, "media", mediaId);
    await deleteDoc(docRef);
  }

  public async verifyCloudCopy(
    uid: string,
    localEntryCount: number
  ): Promise<{ localCount: number; cloudCount: number; matches: boolean; hasPending: boolean }> {
    let cloudCount = localEntryCount;
    let matches = true;
    let hasPending = false;

    try {
      const colRef = collection(this.db, "users", uid, "entries");
      const snapshot = await getCountFromServer(colRef);
      cloudCount = snapshot.data().count;
      matches = cloudCount === localEntryCount;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 4000)
      );
      await Promise.race([waitForPendingWrites(this.db), timeoutPromise]).catch(() => {
        hasPending = true;
      });
    } catch (err) {
      console.warn("Cloud verify check encountered error:", err);
    }

    return {
      localCount: localEntryCount,
      cloudCount,
      matches,
      hasPending,
    };
  }
}
