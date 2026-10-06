export const APP_NAME = 'Journal';

export const CONFIG = {
  appName: APP_NAME,
  version: '1.0.0',
  maxPinnedEntries: 3,
  maxPhotosPerEntry: 12,
  maxPhotoSizeBytes: 250 * 1024, // 250 KB
  maxThumbnailSizeBytes: 25 * 1024, // 25 KB
  maxCoverThumbSizeBytes: 8 * 1024, // 8 KB
  docWarningSizeBytes: 700 * 1024, // Warn near 700 KB
  autosaveDebounceMs: 1500,
  searchDebounceMs: 120,
  recentSearchesLimit: 8,
  autoPurgeDays: 30,
  defaultFolderId: 'default-journal',
  defaultFolderName: 'Journal',
  defaultFolderColor: '#6B74F5',
  defaultFolderIcon: 'book-open',
};
