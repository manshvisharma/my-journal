import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MapPin, Music, Play } from "lucide-react";
import type { Entry, LocationAttachment, MediaRef, MoodData, SongAttachment } from "../../types";
import { deriveAttachmentOrder } from "@/lib/attachments";
import { repository } from "../../data/repository";
import { MoodFlowerGlyph } from "../list/MoodFlowerGlyph";

export type CollageTile =
  | { key: string; kind: "mood"; mood: MoodData }
  | { key: string; kind: "photo"; mediaId: string; photoIndex: number }
  | { key: string; kind: "song"; song: SongAttachment }
  | { key: string; kind: "location"; location: LocationAttachment };

interface AttachmentCollageProps {
  entry: Pick<Entry, "mood" | "media" | "songs" | "location" | "attachmentOrder" | "entryDate">;
  onPhotoClick?: (index: number) => void;
  onAttachmentClick?: (kind: "mood" | "song" | "location" | "photo", data: any) => void;
  compact?: boolean;
}

function formatLabels(items?: string[]) {
  if (!items || items.length === 0) return "";
  if (items.length <= 2) return items.join(", ");
  return `${items.slice(0, 2).join(", ")} and more`;
}

function moodSurface(valence: number) {
  const v = Math.max(0, Math.min(6, Math.round(valence)));
  if (v <= 1) {
    return "bg-gradient-to-br from-[#EDE9FE] via-[#DDD6FE] to-[#C4B5FD] text-[#2E1065] border-[#C4B5FD]/70 dark:from-[#1C1730] dark:via-[#141022] dark:to-[#0E0B18] dark:text-[#EDE9FE] dark:border-white/10";
  }
  if (v <= 2) {
    return "bg-gradient-to-br from-[#E0E7FF] via-[#EEF2FF] to-[#EDE9FE] text-[#312E81] border-[#C7D2FE] dark:from-[#18162C] dark:via-[#141225] dark:to-[#100F1C] dark:text-[#E2E8F0] dark:border-white/10";
  }
  if (v === 3) {
    return "bg-gradient-to-br from-[#CCFBF1] via-[#E0F2FE] to-[#F0FDFA] text-[#134E4A] border-[#99F6E4]/70 dark:from-[#102226] dark:via-[#10181C] dark:to-[#0C1418] dark:text-[#E2E8F0] dark:border-white/10";
  }
  if (v <= 5) {
    return "bg-gradient-to-br from-[#DCFCE7] via-[#F0FDF4] to-[#ECFCCB] text-[#14532D] border-[#BBF7D0] dark:from-[#122318] dark:via-[#0F1A14] dark:to-[#0C1410] dark:text-[#E2E8F0] dark:border-white/10";
  }
  return "bg-gradient-to-br from-[#FEF3C7] via-[#FFFBEB] to-[#FED7AA] text-[#7C2D12] border-[#FDE68A] dark:from-[#2A1A10] dark:via-[#1C130C] dark:to-[#140E09] dark:text-[#FED7AA] dark:border-white/10";
}

export function buildCollageTiles(entry: AttachmentCollageProps["entry"]): CollageTile[] {
  const order = deriveAttachmentOrder(entry);
  const tiles: CollageTile[] = [];
  order.forEach((item, i) => {
    if (item.type === "mood" && entry.mood) {
      tiles.push({ key: `mood-${i}`, kind: "mood", mood: entry.mood });
    } else if (item.type === "photo") {
      const photoIndex = (entry.media || []).findIndex((m) => m.id === item.mediaId);
      if (photoIndex >= 0) {
        tiles.push({ key: `photo-${item.mediaId}`, kind: "photo", mediaId: item.mediaId, photoIndex });
      }
    } else if (item.type === "song") {
      const song = entry.songs?.[item.index];
      if (song) tiles.push({ key: `song-${item.index}`, kind: "song", song });
    } else if (item.type === "location" && entry.location) {
      tiles.push({ key: `loc-${i}`, kind: "location", location: entry.location });
    }
  });
  return tiles;
}

export const AttachmentCollage: React.FC<AttachmentCollageProps> = ({ entry, onPhotoClick, onAttachmentClick, compact }) => {
  const tiles = useMemo(() => buildCollageTiles(entry), [entry]);
  const mediaRefs: MediaRef[] = entry.media || [];
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    mediaRefs.forEach(async (ref) => {
      if (photoUrls.has(ref.id)) return;
      const doc = await repository.getMedia(ref.id);
      if (doc) {
        setPhotoUrls((prev) => new Map(prev).set(ref.id, doc.thumb || doc.full));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaRefs.map((m) => m.id).join("|")]);

  if (tiles.length === 0) return null;

  const timeStr = format(new Date(entry.entryDate), "h:mm a");
  const visible = tiles.slice(0, 4);
  const extra = tiles.length - visible.length;

  const renderNonPhoto = (tile: CollageTile) => {
    if (tile.kind === "mood") {
      const labels = formatLabels(tile.mood.labels) || "Emotion";
      const impacts = formatLabels(tile.mood.impacts);
      return (
        <button
          key={tile.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onAttachmentClick) onAttachmentClick("mood", tile.mood);
          }}
          className={`w-full rounded-[16px] border p-3 flex items-center gap-3 text-left transition active:scale-[0.98] ${moodSurface(tile.mood.valence)}`}
        >
          <div className="shrink-0">
            <MoodFlowerGlyph valence={tile.mood.valence} size={42} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold leading-tight truncate">{labels}</div>
            {impacts ? <div className="text-[12px] opacity-75 truncate mt-0.5">{impacts}</div> : null}
          </div>
        </button>
      );
    }

    if (tile.kind === "song") {
      return (
        <button
          key={tile.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onAttachmentClick) {
              onAttachmentClick("song", tile.song);
            } else if (tile.song.url) {
              window.open(tile.song.url, "_blank", "noopener,noreferrer");
            }
          }}
          className="w-full rounded-[16px] p-3 flex items-center gap-3 bg-gradient-to-r from-[#1DB954]/20 to-[#14532D]/30 border border-white/10 text-left transition active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-app-text-primary truncate">{tile.song.title || "Song"}</div>
            <div className="text-[12px] text-app-text-secondary truncate mt-0.5">{tile.song.artist || tile.song.provider}</div>
          </div>
        </button>
      );
    }

    if (tile.kind === "location") {
      return (
        <button
          key={tile.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onAttachmentClick) onAttachmentClick("location", tile.location);
          }}
          className="w-full rounded-[16px] p-3 flex items-center gap-3 bg-app-card border border-app-card-border dark:bg-[#1C2632] dark:border-[#2A3A4A] text-left transition active:scale-[0.98] relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 20px),
                repeating-linear-gradient(90deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 20px)`,
            }}
          />
          <div className="w-10 h-10 rounded-full bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center shrink-0 relative z-10">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1 relative z-10">
            <div className="text-[14px] font-semibold text-app-text-primary truncate">{tile.location.name}</div>
            {tile.location.lat != null && (
              <div className="text-[12px] text-app-text-tertiary truncate mt-0.5 font-mono">
                {tile.location.lat.toFixed(3)}°, {tile.location.lng?.toFixed(3)}°
              </div>
            )}
          </div>
        </button>
      );
    }
    return null;
  };

  const renderPhoto = (tile: CollageTile, extraCount = 0) => {
    if (tile.kind !== "photo") return null;
    const url = photoUrls.get(tile.mediaId);
    return (
      <button
        key={tile.key}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPhotoClick?.(tile.photoIndex);
        }}
        className="relative h-full w-full overflow-hidden rounded-[16px] bg-black/10 transition active:scale-[0.98]"
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-black/10 dark:bg-white/10" />
        )}
        {extraCount > 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
            +{extraCount}
          </div>
        )}
      </button>
    );
  };

  const photos = tiles.filter((t) => t.kind === "photo");
  const nonPhotos = tiles.filter((t) => t.kind !== "photo");

  const renderPhotoGrid = () => {
    if (photos.length === 0) return null;
    const count = photos.length;
    const visible = photos.slice(0, 4);
    const extra = count - 4;
    const lastExtra = extra > 0 ? extra : 0;
    
    if (count === 1) {
      return <div className={`w-full ${compact ? "h-[160px]" : "h-[220px]"}`}>{renderPhoto(visible[0])}</div>;
    }
    if (count === 2) {
      return (
        <div className={`w-full grid grid-cols-2 gap-2 ${compact ? "h-[120px]" : "h-[160px]"}`}>
          {visible.map((t) => renderPhoto(t))}
        </div>
      );
    }
    if (count === 3) {
      return (
        <div className={`w-full grid grid-cols-2 grid-rows-2 gap-2 ${compact ? "h-[160px]" : "h-[220px]"}`}>
          <div className="col-span-1 row-span-2">{renderPhoto(visible[0])}</div>
          <div className="col-span-1 row-span-1">{renderPhoto(visible[1])}</div>
          <div className="col-span-1 row-span-1">{renderPhoto(visible[2])}</div>
        </div>
      );
    }
    return (
      <div className={`w-full grid grid-cols-2 grid-rows-2 gap-2 ${compact ? "h-[160px]" : "h-[220px]"}`}>
        {renderPhoto(visible[0])}
        {renderPhoto(visible[1])}
        {renderPhoto(visible[2])}
        {renderPhoto(visible[3], lastExtra)}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-2 mb-3">
      {nonPhotos.map(renderNonPhoto)}
      {renderPhotoGrid()}
    </div>
  );
};
