import type { MoodData, MediaRef, LocationData, SongItem } from './index';

export interface ShareDoc {
  id: string; // 12+ char unguessable id
  ownerUid: string;
  entryId: string;
  title: string;
  bodyHtml: string;
  snippet: string;
  entryDate: number;
  wordCount: number;
  mood: MoodData | null;
  location?: LocationData | null;
  songs?: SongItem[];
  includePhotos: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null; // epoch ms or null
  viewsTotal: number;
  recipientMap?: Record<string, string>; // e.g. { 'code123': 'Aman' }
  allowNamePrompt?: boolean;
}

export interface ShareMediaDoc {
  id: string;
  shareId: string;
  index: number;
  full: string; // compressed data URL
  thumb: string;
  w: number;
  h: number;
  createdAt: number;
}

export interface ShareVisitorDoc {
  visitorId: string;
  opens: number;
  totalSeconds: number;
  firstOpenedAt: number;
  lastOpenedAt: number;
  maxScrollPct: number;
  device: string;
  os: string;
  browser: string;
  screen: string;
  tz: string;
  lang: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  label: string | null;
}

export interface ShareSessionDoc {
  id: string;
  visitorId: string;
  startedAt: number;
  lastBeatAt: number;
  seconds: number;
  referrer: string | null;
  device: string;
}

export interface RecipientLink {
  code: string;
  name: string;
  createdAt: number;
  active: boolean;
}
