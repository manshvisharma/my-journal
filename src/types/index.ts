export interface MoodData {
  valence: number; // 0..6 (0: Very Unpleasant ... 3: Neutral ... 6: Very Pleasant)
  labels: string[];
  impacts: string[];
}

export interface SongAttachment {
  url: string;
  provider: "spotify" | "youtube" | "apple-music" | "other";
  title?: string;
  artist?: string;
}

export interface MediaRef {
  id: string;
  w: number;
  h: number;
}

export interface MediaDoc {
  id: string;
  entryId: string;
  full: string;
  thumb: string;
  w: number;
  h: number;
  createdAt: number;
}

export interface LocationAttachment {
  name: string;
  lat?: number;
  lng?: number;
}

export type AttachmentItem =
  | { type: "mood" }
  | { type: "photo"; mediaId: string }
  | { type: "song"; index: number }
  | { type: "location" };

export interface Entry {
  id: string;
  title: string;
  bodyJson: string;
  plainText: string;
  snippet: string;
  wordCount: number;
  entryDate: number;
  createdAt: number;
  updatedAt: number;
  folderIds: string[];
  tags: string[];
  bookmarked: boolean;
  pinned: boolean;
  pinnedAt: number | null;
  mood: MoodData | null;
  media: MediaRef[];
  coverThumb: string | null;
  songs: SongAttachment[];
  location?: LocationAttachment | null;
  attachmentOrder?: AttachmentItem[];
  deletedAt: number | null;
  source: "app" | "apple-import" | "backup-import";
  importKey: string | null;
  schemaVersion: 1;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  order: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type StreakSchedule = "daily" | "weekdays" | "weekly";

export interface UserSettings {
  theme: "light" | "dark" | "system";
  sortBy: "entryDate" | "updatedAt" | "title";
  sortDir: "asc" | "desc";
  streakSchedule: StreakSchedule;
  pinnedOrder: string[];
  lastBackupAt: number | null;
  moodPrompt: boolean;
  haptics?: boolean;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type NavScreen = "home" | "list" | "editor" | "insights" | "settings";

export interface LastNavState {
  screen: NavScreen;
  activeView: string;
  viewTitle: string;
  entryId: string | null;
  sidebarCollapsed: boolean;
}
