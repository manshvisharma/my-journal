import { create } from 'zustand';
import type { Entry, Folder, SyncStatus, UserSettings } from '../types';
import { repository } from '../data/repository';
import { searchEngine } from '../search/searchEngine';
import { CONFIG } from '../config';
import { getInitialDemoSettings } from '../data/demoSeed';
import { shareRepository } from '../features/share/shareRepository';
import { tiptapJsonToHtml } from '../features/share/sanitize';

interface JournalState {
  entries: Map<string, Entry>;
  folders: Map<string, Folder>;
  settings: UserSettings;
  syncStatus: SyncStatus;
  isLoaded: boolean;
  selectedEntryIds: Set<string>;
  isSelectMode: boolean;
  activeUid: string | null;

  // Actions
  subscribe: (uid: string) => () => void;
  saveEntry: (entry: Entry) => Promise<void>;
  softDeleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  deleteEntryPermanently: (id: string) => Promise<void>;
  purgeTrash: () => Promise<void>;
  toggleBookmark: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<{ success: boolean; message?: string }>;
  assignFolders: (entryIds: string[], folderIds: string[]) => Promise<void>;
  addTagToEntries: (entryIds: string[], tag: string) => Promise<void>;
  removeTagFromEntries: (entryIds: string[], tag: string) => Promise<void>;
  renameTag: (oldTag: string, newTag: string) => Promise<void>;
  bulkDelete: (entryIds: string[]) => Promise<void>;
  saveFolder: (folder: Partial<Folder> & { id?: string }) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setSelectMode: (enabled: boolean) => void;
  toggleSelectEntry: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  getEntry: (id: string) => Entry | undefined;
}

let activeUid: string | null = null;
let unsubs: Array<() => void> = [];

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: new Map(),
  folders: new Map(),
  settings: getInitialDemoSettings(),
  syncStatus: 'synced',
  isLoaded: false,
  selectedEntryIds: new Set(),
  isSelectMode: false,
  activeUid: null,

  subscribe: (uid: string) => {
    // If already subscribed to the same uid, reuse existing listener to avoid unnecessary reads
    if (activeUid === uid && unsubs.length > 0) {
      return () => {};
    }

    // Clean up previous listeners and reset store when switching user
    unsubs.forEach((u) => u());
    unsubs = [];
    activeUid = uid;
    searchEngine.clear();
    set({
      activeUid: uid,
      entries: new Map(),
      folders: new Map(),
      isLoaded: false,
      selectedEntryIds: new Set(),
      isSelectMode: false,
    });

    const getFolderNamesString = (folderIds: string[], currentFolders: Map<string, Folder>) => {
      return (folderIds || [])
        .map((fId) => currentFolders.get(fId)?.name || '')
        .filter(Boolean)
        .join(' ');
    };

    // 1. Subscribe to entries
    const unsubEntries = repository.subscribeEntries(
      uid,
      (changes, _isFromCache, hasPendingWrites) => {
        const nextEntries = new Map(get().entries);
        const currentFolders = get().folders;

        changes.forEach((change) => {
          if (change.type === 'removed') {
            nextEntries.delete(change.doc.id);
            searchEngine.removeEntry(change.doc.id);
          } else {
            nextEntries.set(change.doc.id, change.doc);
            if (!change.doc.deletedAt) {
              const folderNames = getFolderNamesString(change.doc.folderIds, currentFolders);
              searchEngine.indexEntry(change.doc, folderNames);
            } else {
              searchEngine.removeEntry(change.doc.id);
            }
          }
        });

        const syncStatus: SyncStatus =
          typeof navigator !== 'undefined' && !navigator.onLine
            ? 'offline'
            : hasPendingWrites
            ? 'syncing'
            : 'synced';

        set({ entries: nextEntries, syncStatus, isLoaded: true });
      },
      (err) => {
        console.error('Entries subscription error:', err);
        set({ syncStatus: 'error', isLoaded: true });
      }
    );

    // 2. Subscribe to folders
    const unsubFolders = repository.subscribeFolders(
      uid,
      (changes) => {
        const nextFolders = new Map(get().folders);
        changes.forEach((change) => {
          if (change.type === 'removed') {
            nextFolders.delete(change.doc.id);
          } else {
            nextFolders.set(change.doc.id, change.doc);
          }
        });
        set({ folders: nextFolders });
      },
      (err) => console.error('Folders subscription error:', err)
    );

    // 3. Subscribe to settings
    const unsubSettings = repository.subscribeSettings(
      uid,
      (settings) => {
        if (settings) {
          set({ settings: { ...getInitialDemoSettings(), ...settings } });
        }
      },
      (err) => console.error('Settings subscription error:', err)
    );

    unsubs = [unsubEntries, unsubFolders, unsubSettings];

    // Trigger auto-purge of old deleted entries (> 30 days) on launch
    repository.purgeOldDeletedEntries(uid, CONFIG.autoPurgeDays).catch(console.warn);

    return () => {
      // Keep listeners active across route navigation
    };
  },

  getEntry: (id: string) => {
    return get().entries.get(id);
  },

  saveEntry: async (entry: Entry) => {
    // 1. Optimistically update local entries map so UI reflects changes immediately
    const nextEntries = new Map(get().entries);
    nextEntries.set(entry.id, entry);
    set({ entries: nextEntries });

    if (!entry.deletedAt) {
      const folderNames = (entry.folderIds || [])
        .map((fId) => get().folders.get(fId)?.name || '')
        .filter(Boolean)
        .join(' ');
      searchEngine.indexEntry(entry, folderNames);
    } else {
      searchEngine.removeEntry(entry.id);
    }

    const uid = get().activeUid || 'demo-local-user';
    try {
      await repository.saveEntry(uid, entry);
    } catch (err) {
      console.warn('Repository saveEntry error:', err);
    }

    // Auto-update shared copy if link is active
    shareRepository.getShareByEntryId(uid, entry.id).then((share) => {
      if (share && share.active) {
        shareRepository.updateShareDoc(share.id, {
          title: entry.title || 'Untitled Entry',
          bodyHtml: tiptapJsonToHtml(entry.bodyJson, entry.plainText),
          snippet: entry.snippet || '',
          entryDate: entry.entryDate,
          wordCount: entry.wordCount || 0,
          mood: share.mood ? entry.mood : null,
          updatedAt: Date.now(),
        }).catch(console.warn);
      }
    }).catch(console.warn);
  },

  softDeleteEntry: async (id: string) => {
    const uid = get().activeUid || 'demo-local-user';
    const entry = get().entries.get(id);
    if (!entry) return;

    // Soft delete: clear pinned/pinnedAt (frees the pin slot), keep bookmarked untouched but hidden
    const updated: Entry = {
      ...entry,
      deletedAt: Date.now(),
      pinned: false,
      pinnedAt: null,
      updatedAt: Date.now(),
    };
    await repository.saveEntry(uid, updated);

    // Requirement #1: Soft-deleting an entry immediately deactivates its share link
    shareRepository.getShareByEntryId(uid, id).then((share) => {
      if (share && share.active) {
        shareRepository.setShareActive(share.id, false).catch(console.warn);
      }
    }).catch(console.warn);
  },

  restoreEntry: async (id: string) => {
    const uid = get().activeUid || 'demo-local-user';
    const entry = get().entries.get(id);
    if (!entry) return;

    const currentFolders = get().folders;
    // Check if entry's folders still exist; if deleted, restore into default Journal
    const validFolderIds = (entry.folderIds || []).filter(
      (fId) => currentFolders.has(fId) && !currentFolders.get(fId)?.deletedAt
    );
    const finalFolderIds = validFolderIds.length > 0 ? validFolderIds : [CONFIG.defaultFolderId];

    const updated: Entry = {
      ...entry,
      deletedAt: null,
      folderIds: finalFolderIds,
      updatedAt: Date.now(),
    };
    await repository.saveEntry(uid, updated);
    // Restoring from trash does NOT re-activate sharing automatically
  },

  deleteEntryPermanently: async (id: string) => {
    const uid = get().activeUid || 'demo-local-user';
    await repository.deletePermanently(uid, id);
    searchEngine.removeEntry(id);

    // Permanently deleting an entry removes the share doc, media and stats
    shareRepository.getShareByEntryId(uid, id).then((share) => {
      if (share) {
        shareRepository.deleteShare(share.id).catch(console.warn);
      }
    }).catch(console.warn);
  },

  purgeTrash: async () => {
    const uid = get().activeUid || 'demo-local-user';
    const entries = get().entries;
    for (const entry of entries.values()) {
      if (entry.deletedAt) {
        await repository.deletePermanently(uid, entry.id);
        searchEngine.removeEntry(entry.id);
        shareRepository.getShareByEntryId(uid, entry.id).then((share) => {
          if (share) shareRepository.deleteShare(share.id).catch(console.warn);
        }).catch(console.warn);
      }
    }
  },

  toggleBookmark: async (id: string) => {
    const entry = get().entries.get(id);
    if (!entry) return;
    const uid = get().activeUid || 'demo-local-user';
    await repository.saveEntry(uid, {
      ...entry,
      bookmarked: !entry.bookmarked,
      updatedAt: Date.now(),
    });
  },

  togglePin: async (id: string) => {
    const entry = get().entries.get(id);
    if (!entry) return { success: false };

    const uid = get().activeUid || 'demo-local-user';

    if (!entry.pinned) {
      let pinnedCount = 0;
      get().entries.forEach((e) => {
        if (e.pinned && !e.deletedAt) pinnedCount++;
      });

      if (pinnedCount >= CONFIG.maxPinnedEntries) {
        return {
          success: false,
          message: 'Unpin one to pin another (Max 3)',
        };
      }

      await repository.saveEntry(uid, {
        ...entry,
        pinned: true,
        pinnedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    } else {
      await repository.saveEntry(uid, {
        ...entry,
        pinned: false,
        pinnedAt: null,
        updatedAt: Date.now(),
      });
      return { success: true };
    }
  },

  assignFolders: async (entryIds: string[], folderIds: string[]) => {
    const uid = get().activeUid || 'demo-local-user';
    const entriesToUpdate: Entry[] = [];
    const entries = get().entries;

    entryIds.forEach((id) => {
      const entry = entries.get(id);
      if (entry) {
        entriesToUpdate.push({
          ...entry,
          folderIds: folderIds.length > 0 ? folderIds : [CONFIG.defaultFolderId],
          updatedAt: Date.now(),
        });
      }
    });

    await repository.batchSaveEntries(uid, entriesToUpdate);
  },

  addTagToEntries: async (entryIds: string[], rawTag: string) => {
    const tag = rawTag.trim().toLowerCase();
    if (!tag) return;
    const uid = get().activeUid || 'demo-local-user';
    const entriesToUpdate: Entry[] = [];
    const entries = get().entries;

    entryIds.forEach((id) => {
      const entry = entries.get(id);
      if (entry && !entry.tags.includes(tag)) {
        entriesToUpdate.push({
          ...entry,
          tags: [...entry.tags, tag],
          updatedAt: Date.now(),
        });
      }
    });

    await repository.batchSaveEntries(uid, entriesToUpdate);
  },

  removeTagFromEntries: async (entryIds: string[], rawTag: string) => {
    const tag = rawTag.trim().toLowerCase();
    const uid = get().activeUid || 'demo-local-user';
    const entriesToUpdate: Entry[] = [];
    const entries = get().entries;

    entryIds.forEach((id) => {
      const entry = entries.get(id);
      if (entry && entry.tags.includes(tag)) {
        entriesToUpdate.push({
          ...entry,
          tags: entry.tags.filter((t) => t !== tag),
          updatedAt: Date.now(),
        });
      }
    });

    await repository.batchSaveEntries(uid, entriesToUpdate);
  },

  renameTag: async (oldTag: string, newTag: string) => {
    const normOld = oldTag.trim().toLowerCase();
    const normNew = newTag.trim().toLowerCase();
    if (!normOld || !normNew || normOld === normNew) return;

    const uid = get().activeUid || 'demo-local-user';
    const entriesToUpdate: Entry[] = [];

    get().entries.forEach((entry) => {
      if (entry.tags.includes(normOld)) {
        const nextTags = Array.from(
          new Set(entry.tags.map((t) => (t === normOld ? normNew : t)))
        );
        entriesToUpdate.push({
          ...entry,
          tags: nextTags,
          updatedAt: Date.now(),
        });
      }
    });

    await repository.batchSaveEntries(uid, entriesToUpdate);
  },

  bulkDelete: async (entryIds: string[]) => {
    const uid = get().activeUid || 'demo-local-user';
    const entriesToUpdate: Entry[] = [];
    const entries = get().entries;

    entryIds.forEach((id) => {
      const entry = entries.get(id);
      if (entry) {
        entriesToUpdate.push({
          ...entry,
          deletedAt: Date.now(),
          pinned: false,
          pinnedAt: null,
          updatedAt: Date.now(),
        });
        shareRepository.getShareByEntryId(uid, id).then((share) => {
          if (share && share.active) shareRepository.setShareActive(share.id, false).catch(console.warn);
        }).catch(console.warn);
      }
    });

    await repository.batchSaveEntries(uid, entriesToUpdate);
    set({ isSelectMode: false, selectedEntryIds: new Set() });
  },

  saveFolder: async (folderData: Partial<Folder> & { id?: string }) => {
    const uid = get().activeUid || 'demo-local-user';
    const now = Date.now();
    const id = folderData.id || `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const existing = folderData.id ? get().folders.get(folderData.id) : undefined;

    const folder: Folder = {
      id,
      name: folderData.name || 'Untitled Journal',
      color: folderData.color || '#6B74F5',
      icon: folderData.icon || 'book-open',
      parentId: folderData.parentId !== undefined ? folderData.parentId : null,
      order: folderData.order !== undefined ? folderData.order : get().folders.size,
      isDefault: existing ? existing.isDefault : false,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      deletedAt: null,
    };

    const nextFolders = new Map(get().folders);
    nextFolders.set(id, folder);
    set({ folders: nextFolders });

    try {
      await repository.saveFolder(uid, folder);
    } catch (err) {
      console.warn('saveFolder error:', err);
    }
  },

  deleteFolder: async (folderId: string) => {
    const uid = get().activeUid || 'demo-local-user';
    const nextFolders = new Map(get().folders);
    nextFolders.delete(folderId);
    set({ folders: nextFolders });

    try {
      await repository.deleteFolder(uid, folderId);
    } catch (err) {
      console.warn('deleteFolder error:', err);
    }
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const nextSettings = { ...get().settings, ...newSettings };
    set({ settings: nextSettings });
    const uid = get().activeUid || 'demo-local-user';
    try {
      await repository.saveSettings(uid, nextSettings);
    } catch (err) {
      console.warn('updateSettings error:', err);
    }
  },

  setSelectMode: (enabled: boolean) => {
    set({
      isSelectMode: enabled,
      selectedEntryIds: enabled ? get().selectedEntryIds : new Set(),
    });
  },

  toggleSelectEntry: (id: string) => {
    const next = new Set(get().selectedEntryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedEntryIds: next });
  },

  selectAll: (ids: string[]) => {
    set({ selectedEntryIds: new Set(ids) });
  },

  clearSelection: () => {
    set({ selectedEntryIds: new Set(), isSelectMode: false });
  },
}));
