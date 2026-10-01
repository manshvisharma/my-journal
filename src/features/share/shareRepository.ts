import type { ShareDoc, ShareMediaDoc, ShareVisitorDoc, ShareSessionDoc } from "../../types/share";
import {
  deletePublicShare,
  getPublicShare,
  getShareByEntryId as getShareByEntryIdFn,
  listOwnerShares,
  recordShareView,
  setShareActive as setShareActiveFn,
  upsertPublicShare,
} from "@/lib/share-api";

const TOKEN_KEY = "reverie_share_tokens";
const LOCAL_SHARES_KEY = "reverie_local_shares";

function readTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeToken(shareId: string, token: string) {
  if (typeof window === "undefined") return;
  const next = readTokens();
  next[shareId] = token;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
}

function tokenFor(shareId: string): string {
  const existing = readTokens()[shareId];
  if (existing) return existing;
  const token = generateShareId() + generateShareId().slice(0, 6);
  writeToken(shareId, token);
  return token;
}

type LocalShareRecord = { share: ShareDoc; media: ShareMediaDoc[]; visitors?: unknown[] };

const shareListeners = new Set<() => void>();

export function notifySharesChanged() {
  shareListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

export function subscribeSharesChanged(cb: () => void): () => void {
  shareListeners.add(cb);
  return () => {
    shareListeners.delete(cb);
  };
}

function readLocalShares(): Record<string, LocalShareRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SHARES_KEY) || "{}") as Record<string, LocalShareRecord>;
  } catch {
    return {};
  }
}

function writeLocalShare(record: LocalShareRecord) {
  if (typeof window === "undefined") return;
  const all = readLocalShares();
  all[record.share.id] = record;
  localStorage.setItem(LOCAL_SHARES_KEY, JSON.stringify(all));
}

function deleteLocalShare(id: string) {
  if (typeof window === "undefined") return;
  const all = readLocalShares();
  delete all[id];
  localStorage.setItem(LOCAL_SHARES_KEY, JSON.stringify(all));
}

export function generateShareId(): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : null;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(14);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < 14; i++) result += chars[bytes[i] % chars.length];
  } else {
    for (let i = 0; i < 14; i++) result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateRecipientCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

function asShareDoc(raw: Record<string, unknown> | null): ShareDoc | null {
  if (!raw) return null;
  return {
    id: String(raw.id || ""),
    ownerUid: String(raw.ownerUid || "demo-local-user"),
    entryId: String(raw.entryId || ""),
    title: String(raw.title || "Untitled Entry"),
    bodyHtml: String(raw.bodyHtml || ""),
    snippet: String(raw.snippet || ""),
    entryDate: Number(raw.entryDate || Date.now()),
    wordCount: Number(raw.wordCount || 0),
    mood: (raw.mood as ShareDoc["mood"]) || null,
    includePhotos: Boolean(raw.includePhotos),
    active: Boolean(raw.active),
    createdAt: Number(raw.createdAt || Date.now()),
    updatedAt: Number(raw.updatedAt || Date.now()),
    expiresAt: raw.expiresAt ? Number(raw.expiresAt) : null,
    viewsTotal: Number(raw.viewsTotal || 0),
    recipientMap: (raw.recipientMap as Record<string, string>) || {},
    allowNamePrompt: Boolean(raw.allowNamePrompt),
  };
}

export const shareRepository = {
  async getShare(shareId: string): Promise<ShareDoc | null> {
    try {
      const raw = (await getPublicShare({ data: { id: shareId } })) as Record<string, unknown> | null;
      const parsed = asShareDoc(raw);
      if (parsed) return parsed;
    } catch (err) {
      console.warn("share get failed, using local cache", err);
    }
    return readLocalShares()[shareId]?.share || null;
  },

  async getShareByEntryId(_ownerUid: string, entryId: string): Promise<ShareDoc | null> {
    try {
      const raw = (await getShareByEntryIdFn({ data: { entryId } })) as Record<string, unknown> | null;
      const parsed = asShareDoc(raw);
      if (parsed) return parsed;
    } catch (err) {
      console.warn("share lookup failed, using local cache", err);
    }
    return Object.values(readLocalShares()).find((row) => row.share.entryId === entryId)?.share || null;
  },

  async saveShare(shareDocData: ShareDoc, mediaDocs: ShareMediaDoc[] = []): Promise<void> {
    const ownerToken = tokenFor(shareDocData.id);
    const compactMedia = mediaDocs.slice(0, 8).map((m) => ({
      ...m,
      full: (m.thumb || m.full || "").slice(0, 220000),
      thumb: (m.thumb || m.full || "").slice(0, 80000),
    }));
    writeLocalShare({ share: { ...shareDocData, updatedAt: Date.now() }, media: compactMedia });
    try {
      await upsertPublicShare({
        data: {
          share: {
            id: shareDocData.id,
            ownerUid: shareDocData.ownerUid,
            ownerToken,
            entryId: shareDocData.entryId,
            title: shareDocData.title,
            bodyHtml: shareDocData.bodyHtml,
            snippet: shareDocData.snippet,
            entryDate: shareDocData.entryDate,
            wordCount: shareDocData.wordCount,
            mood: shareDocData.mood,
            location: (shareDocData as ShareDoc & { location?: unknown }).location ?? null,
            songs: [],
            includePhotos: shareDocData.includePhotos,
            active: shareDocData.active,
            createdAt: shareDocData.createdAt,
            updatedAt: Date.now(),
            expiresAt: shareDocData.expiresAt,
            recipientMap: shareDocData.recipientMap || {},
            allowNamePrompt: Boolean(shareDocData.allowNamePrompt),
          },
          media: compactMedia,
        },
      });
    } catch (err) {
      console.warn("share upsert fell back to local cache", err);
    }
    notifySharesChanged();
  },

  async setShareActive(shareId: string, active: boolean): Promise<void> {
    const local = readLocalShares()[shareId];
    if (local) writeLocalShare({ ...local, share: { ...local.share, active } });
    try {
      await setShareActiveFn({ data: { id: shareId, ownerToken: tokenFor(shareId), active } });
    } catch (err) {
      console.warn("share active toggle used local cache", err);
    }
    notifySharesChanged();
  },

  async updateShareDoc(shareId: string, updates: Partial<ShareDoc>): Promise<void> {
    const existing = await this.getShare(shareId);
    if (!existing) return;
    await this.saveShare({ ...existing, ...updates, updatedAt: Date.now() }, []);
  },

  async deleteShare(shareId: string): Promise<void> {
    deleteLocalShare(shareId);
    try {
      await deletePublicShare({ data: { id: shareId, ownerToken: tokenFor(shareId) } });
    } catch (err) {
      console.warn("share delete used local cache", err);
    }
    notifySharesChanged();
  },

  async deactivateShareForEntry(ownerUid: string, entryId: string): Promise<void> {
    const share = await this.getShareByEntryId(ownerUid, entryId);
    if (share?.active) await this.setShareActive(share.id, false);
  },

  async deleteShareForEntry(ownerUid: string, entryId: string): Promise<void> {
    const share = await this.getShareByEntryId(ownerUid, entryId);
    if (share) await this.deleteShare(share.id);
  },

  async listUserShares(ownerUid: string): Promise<ShareDoc[]> {
    try {
      const rows = (await listOwnerShares({ data: { ownerUid } })) as Array<Record<string, unknown>>;
      const parsed = rows.map((row) => asShareDoc(row)).filter((s): s is ShareDoc => Boolean(s));
      if (parsed.length) return parsed;
    } catch (err) {
      console.warn("share list used local cache", err);
    }
    return Object.values(readLocalShares())
      .map((row) => row.share)
      .filter((s) => s.ownerUid === ownerUid);
  },

  async getShareMediaList(shareId: string): Promise<ShareMediaDoc[]> {
    try {
      const raw = (await getPublicShare({ data: { id: shareId } })) as { media?: ShareMediaDoc[] } | null;
      if (Array.isArray(raw?.media) && raw.media.length) return raw.media;
    } catch {
      /* local */
    }
    return readLocalShares()[shareId]?.media || [];
  },

  subscribeShare(shareId: string, onUpdate: (doc: ShareDoc | null) => void) {
    this.getShare(shareId).then(onUpdate);
    return () => {};
  },

  subscribeShareVisitors(shareId: string, onUpdate: (visitors: ShareVisitorDoc[]) => void) {
    getPublicShare({ data: { id: shareId } }).then((raw) => {
      const visitors = (raw as { visitors?: ShareVisitorDoc[] } | null)?.visitors || [];
      onUpdate(visitors);
    });
    return () => {};
  },

  subscribeShareSessions(_shareId: string, onUpdate: (sessions: ShareSessionDoc[]) => void) {
    onUpdate([]);
    return () => {};
  },

  async recordView(shareId: string, visitor?: { visitorId: string; device?: string; label?: string | null }) {
    return recordShareView({ data: { id: shareId, visitor } });
  },

  async resetShareStats(shareId: string): Promise<void> {
    const existing = await this.getShare(shareId);
    if (!existing) return;
    await this.saveShare({ ...existing, viewsTotal: 0 }, []);
  },
};
