import type { ShareDoc } from "../../types/share";
import { shareRepository } from "./shareRepository";

export interface ViewerTrackerHandle {
  stop: () => void;
  setLabel: (label: string) => void;
  updateLabel: (label: string) => Promise<void>;
}

function isBot(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = (navigator.userAgent || "").toLowerCase();
  return ["bot", "crawl", "spider", "facebookexternalhit", "twitterbot", "slackbot", "whatsapp"].some((k) =>
    ua.includes(k),
  );
}

function visitorId(): string {
  try {
    const key = "reverie_visitor_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `v_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `v_${Date.now()}`;
  }
}

export async function startViewerTracking(
  share: ShareDoc,
  _recipientCode?: string | null,
): Promise<ViewerTrackerHandle> {
  if (isBot() || !share?.id) {
    return {
      stop: () => {},
      setLabel: () => {},
      updateLabel: async () => {},
    };
  }

  const id = visitorId();
  let label: string | null = null;
  await shareRepository.recordView(share.id, {
    visitorId: id,
    device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    label,
  });

  return {
    stop: () => {},
    setLabel: (next) => {
      label = next;
      shareRepository.recordView(share.id, { visitorId: id, label: next }).catch(() => {});
    },
    updateLabel: async (next) => {
      label = next;
      await shareRepository.recordView(share.id, { visitorId: id, label: next });
    },
  };
}
