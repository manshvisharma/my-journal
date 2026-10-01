import type { AttachmentItem, Entry } from "../types";

export function deriveAttachmentOrder(entry: Pick<Entry, "mood" | "media" | "songs" | "location" | "attachmentOrder">): AttachmentItem[] {
  if (entry.attachmentOrder && entry.attachmentOrder.length > 0) {
    return entry.attachmentOrder.filter((item) => {
      if (item.type === "mood") return Boolean(entry.mood);
      if (item.type === "location") return Boolean(entry.location);
      if (item.type === "photo") return (entry.media || []).some((m) => m.id === item.mediaId);
      if (item.type === "song") return (entry.songs || []).length > item.index;
      return false;
    });
  }

  const order: AttachmentItem[] = [];
  if (entry.mood) order.push({ type: "mood" });
  (entry.media || []).forEach((m) => order.push({ type: "photo", mediaId: m.id }));
  (entry.songs || []).forEach((_, index) => order.push({ type: "song", index }));
  if (entry.location) order.push({ type: "location" });
  return order;
}

export function appendAttachment(order: AttachmentItem[], item: AttachmentItem): AttachmentItem[] {
  if (item.type === "mood") {
    return order.some((i) => i.type === "mood") ? order : [...order, item];
  }
  if (item.type === "location") {
    return order.some((i) => i.type === "location") ? order : [...order, item];
  }
  return [...order, item];
}

export function removeAttachment(order: AttachmentItem[], predicate: (item: AttachmentItem) => boolean): AttachmentItem[] {
  const next = order.filter((item) => !predicate(item));
  let songIndex = 0;
  return next.map((item) => {
    if (item.type === "song") {
      const remapped = { ...item, index: songIndex };
      songIndex += 1;
      return remapped;
    }
    return item;
  });
}
