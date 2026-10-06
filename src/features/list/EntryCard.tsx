import React, { useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Bookmark,
  Pin,
  MoreHorizontal,
  Check,
  ChevronDown,
  Share2,
  FolderOpen,
  Trash2,
  Edit3,
  Link2,
  Activity,
  Pencil,
} from "lucide-react";
import type { Entry, Folder } from "../../types";
import type { ShareDoc } from "../../types/share";
import { useAuthStore } from "../../store/useAuthStore";
import { shareRepository, subscribeSharesChanged } from "../share/shareRepository";
import { renderFolderIcon } from "../../ui/IconPicker";
import { Menu, type MenuItem } from "../../ui/Menu";
import { CardMediaCollage } from "./CardMediaCollage";
import { MediaGallery } from "../media/MediaGallery";
import { haptics } from "../../lib/haptics";
import { toast } from "../../ui/Toast";

interface EntryCardProps {
  entry: Entry;
  foldersMap: Map<string, Folder>;
  isSelected?: boolean;
  isSelectMode?: boolean;
  isTrashView?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  onSelectToggle?: (id: string) => void;
  onOpen?: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onToggleBookmark: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChooseJournals: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onRecover?: (id: string) => void;
  onShare?: (entry: Entry) => void;
  onOpenActivity?: (shareId: string) => void;
}

const FULL_BOOKMARK_THRESHOLD = 165;
const FULL_DELETE_THRESHOLD = 185;
const REVEAL_THRESHOLD = 36;

export const EntryCard: React.FC<EntryCardProps> = React.memo(
  ({
    entry,
    foldersMap,
    isSelected = false,
    isSelectMode = false,
    isTrashView = false,
    isExpanded: isExpandedProp,
    onToggleExpand: onToggleExpandProp,
    isRevealed: isRevealedProp,
    onRevealedChange,
    onSelectToggle,
    onEdit,
    onToggleBookmark,
    onTogglePin,
    onChooseJournals,
    onDelete,
    onRecover,
    onShare,
    onOpenActivity,
  }) => {
    const user = useAuthStore((state) => state.user);
    const ownerUid = user?.uid || "demo-local-user";
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = isExpandedProp !== undefined ? isExpandedProp : internalExpanded;
    const toggleExpand = () => {
      if (onToggleExpandProp) {
        onToggleExpandProp();
      } else {
        setInternalExpanded((prev) => !prev);
      }
    };
    const [activePhotoViewerIndex, setActivePhotoViewerIndex] = useState<number | null>(null);
    const [showPeek, setShowPeek] = useState(false);
    const [activeShareDoc, setActiveShareDoc] = useState<ShareDoc | null>(null);
    const longPressRef = useRef<number | null>(null);
    const movedRef = useRef(false);
    const [revealed, setRevealed] = useState<"left" | "right" | null>(null);
    const draggedRef = useRef(false);
    const crossedThresholdRef = useRef<string | null>(null);
    const x = useMotionValue(0);
    const bookmarkOpacity = useTransform(x, [8, 70], [0, 1]);
    const rightOpacity = useTransform(x, [-8, -70], [0, 1]);

    // Handle controlled snap-back if external revealed state changes to false
    React.useEffect(() => {
      if (isRevealedProp !== undefined && !isRevealedProp && revealed) {
        setRevealed(null);
        animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
      }
    }, [isRevealedProp, revealed, x]);

    // Subscribe to share changes in real-time
    React.useEffect(() => {
      let mounted = true;
      const loadShare = () => {
        shareRepository.getShareByEntryId(ownerUid, entry.id).then((s) => {
          if (!mounted) return;
          setActiveShareDoc(s && s.active ? s : null);
        });
      };
      loadShare();
      const unsub = subscribeSharesChanged(loadShare);
      return () => {
        mounted = false;
        unsub();
      };
    }, [ownerUid, entry.id, entry.updatedAt]);

    const activeFolders = useMemo(() => {
      return (entry.folderIds || [])
        .map((id) => foldersMap.get(id))
        .filter((f): f is Folder => Boolean(f))
        .slice(0, 3);
    }, [entry.folderIds, foldersMap]);

    const entryDateObj = new Date(entry.entryDate);
    const useShortWeekday = activeFolders.length >= 2;
    let dateStr = useShortWeekday ? format(entryDateObj, "EEE, d MMM") : format(entryDateObj, "EEEE, d MMM");
    if (isToday(entryDateObj)) dateStr = `Today, ${format(entryDateObj, "h:mm a")}`;
    else if (isYesterday(entryDateObj)) dateStr = `Yesterday, ${format(entryDateObj, "h:mm a")}`;

    const daysLeftInTrash = useMemo(() => {
      if (!entry.deletedAt) return null;
      const elapsedDays = Math.floor((Date.now() - entry.deletedAt) / (1000 * 60 * 60 * 24));
      return Math.max(1, 30 - elapsedDays);
    }, [entry.deletedAt]);

    const handleShare = async () => {
      const shareText = `${entry.title ? entry.title + "\n\n" : ""}${entry.plainText || ""}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: entry.title || "Journal Entry", text: shareText });
        } catch {
          /* cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareText);
          haptics.success();
          toast.success("Copied entry text to clipboard");
        } catch {
          toast.error("Could not copy text");
        }
      }
    };

    const menuItems: MenuItem[] = isTrashView
      ? [
          { id: "recover", label: "Recover Entry", onClick: () => onRecover?.(entry.id) },
          { id: "delete-perm", label: "Delete Permanently", destructive: true, onClick: () => onDelete(entry.id) },
        ]
      : [
          { id: "edit", label: "Edit", icon: <Edit3 className="w-4 h-4 text-app-accent" />, onClick: () => onEdit(entry) },
          { id: "share", label: "Share", icon: <Share2 className="w-4 h-4" />, onClick: () => (onShare ? onShare(entry) : handleShare()) },
          ...(activeShareDoc
            ? [
                {
                  id: "link-activity",
                  label: "Link Activity",
                  icon: <Activity className="w-4 h-4 text-app-accent" />,
                  onClick: () => onOpenActivity?.(activeShareDoc.id),
                },
              ]
            : []),
          {
            id: "bookmark",
            label: entry.bookmarked ? "Remove Bookmark" : "Add Bookmark",
            icon: <Bookmark className="w-4 h-4" />,
            onClick: () => onToggleBookmark(entry.id),
          },
          {
            id: "pin",
            label: entry.pinned ? "Unpin" : "Pin Entry",
            icon: <Pin className="w-4 h-4" />,
            onClick: () => onTogglePin(entry.id),
          },
          {
            id: "choose-journals",
            label: "Choose Journals",
            icon: <FolderOpen className="w-4 h-4" />,
            onClick: () => onChooseJournals(entry),
          },
          {
            id: "delete",
            label: "Delete",
            icon: <Trash2 className="w-4 h-4 text-red-500" />,
            destructive: true,
            dividerAbove: true,
            onClick: () => onDelete(entry.id),
          },
        ];

    const clearLongPress = () => {
      if (longPressRef.current) {
        window.clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    };

    const startLongPress = () => {
      if (isSelectMode || isTrashView) return;
      haptics.prime();
      movedRef.current = false;
      clearLongPress();
      longPressRef.current = window.setTimeout(() => {
        if (movedRef.current) return;
        haptics.heavy();
        setShowPeek(true);
      }, 380);
    };

    const snapBack = () => {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
    };

    const bodyText = useMemo(() => {
      const raw = entry.plainText || entry.snippet || "";
      // Strip redundant blank lines while preserving normal paragraph spacing
      return raw.replace(/(\r\n|\r|\n){3,}/g, "\n\n").trim();
    }, [entry.plainText, entry.snippet]);

    const cardInner = (
      <div
        className={`relative rounded-[20px] p-4 sm:p-5 border ${
          isSelected
            ? "bg-app-accent-tint border-app-accent"
            : "bg-app-card border-app-card-border shadow-[var(--color-card-shadow)]"
        }`}
      >
        {isSelectMode && (
          <div className="absolute top-4 right-4 z-10">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectToggle?.(entry.id);
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                isSelected ? "bg-app-accent border-app-accent text-white" : "border-app-hairline bg-app-bg"
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        )}

        <CardMediaCollage
          mood={entry.mood}
          mediaRefs={entry.media}
          songs={entry.songs}
          location={entry.location}
          attachmentOrder={entry.attachmentOrder}
          coverThumb={entry.coverThumb}
          entryDate={entry.entryDate}
          onPhotoClick={(idx) => setActivePhotoViewerIndex(idx)}
        />

        {entry.title ? (
          <h3 className="text-[17px] sm:text-[18px] font-semibold text-app-text-primary tracking-tight leading-snug mb-1.5">
            {entry.title}
          </h3>
        ) : null}

        <div className="relative">
          {isExpanded ? (
            <div className="text-[17.5px] sm:text-[18px] leading-[27px] sm:leading-[28px] text-app-text-primary selectable-text whitespace-pre-wrap py-1">
              {bodyText || <span className="text-app-text-tertiary italic">Empty entry</span>}
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <p className="text-[17.5px] sm:text-[18px] leading-[27px] sm:leading-[28px] text-app-text-primary line-clamp-8 whitespace-pre-wrap">
                {bodyText || <span className="text-app-text-tertiary italic">No additional text</span>}
              </p>
              {bodyText.length > 180 && (
                <div className="absolute right-0 bottom-0 pointer-events-none flex items-center justify-end pl-4 bg-gradient-to-l from-[var(--color-card-bg)] via-[var(--color-card-bg)] to-transparent">
                  <ChevronDown className="w-4 h-4 text-app-text-tertiary" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-px w-full bg-app-hairline my-3" />

        <div className="flex items-center justify-between text-[15px] text-app-text-secondary">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden pr-2">
            {activeFolders.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0">
                {activeFolders.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-[var(--color-card-bg)]"
                    style={{ backgroundColor: f.color }}
                  >
                    {renderFolderIcon(f.icon, "w-2.5 h-2.5 text-white")}
                  </div>
                ))}
              </div>
            )}
            <span className="font-normal text-app-text-tertiary truncate text-[15px]">{dateStr}</span>
            {isTrashView && daysLeftInTrash !== null && (
              <span className="text-xs text-amber-500 font-medium shrink-0 ml-1">· {daysLeftInTrash}d left</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeShareDoc && !isTrashView && (
              <span title="Public link active" className="text-app-accent">
                <Link2 className="w-3.5 h-3.5" />
              </span>
            )}
            {entry.bookmarked && !isTrashView && <Bookmark className="w-4 h-4 fill-current text-[#FF3B30]" />}
            {entry.pinned && !isTrashView && <Pin className="w-4 h-4 fill-current text-app-accent" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                haptics.selection();
                toggleExpand();
              }}
              className="p-1 text-app-text-tertiary"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180 text-app-accent" : ""}`} />
            </button>
            {!isSelectMode && (
              <div onClick={(e) => e.stopPropagation()}>
                <Menu
                  trigger={(isOpen) => (
                    <button
                      type="button"
                      className={`p-1.5 rounded-full text-app-text-tertiary ${isOpen ? "bg-black/5 dark:bg-white/10" : ""}`}
                      aria-label="Card options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                  items={menuItems}
                  align="right"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <>
        {/* Overflow-hidden prevents any swiping from extending the document width or creating horizontal scroll */}
        <div className="relative mb-3 overflow-hidden rounded-[20px]">
          {/* Swipe action buttons - behind the card */}
          <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
            <motion.div style={{ opacity: bookmarkOpacity }} className="absolute inset-y-0 left-3 flex items-center z-0 pointer-events-auto">
              <div className="w-12 h-12 rounded-full bg-[#E35D6A] text-white flex items-center justify-center shadow-lg">
                <Bookmark className={`w-5 h-5 ${entry.bookmarked ? "fill-current" : ""}`} />
              </div>
            </motion.div>
            <div className="absolute inset-y-0 right-3 flex items-center gap-3 z-0 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  setRevealed(null);
                  onRevealedChange?.(false);
                  snapBack();
                  onEdit(entry);
                }}
                className="w-12 h-12 rounded-full bg-[#5B7CFA] text-white flex items-center justify-center shadow-lg active:scale-90 transition"
                aria-label="Edit"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.warning();
                  setRevealed(null);
                  onRevealedChange?.(false);
                  snapBack();
                  onDelete(entry.id);
                }}
                className="w-12 h-12 rounded-full bg-[#E11D48] text-white flex items-center justify-center shadow-lg active:scale-90 transition"
                aria-label="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <motion.div
            style={{ x }}
            drag={isSelectMode || isTrashView || showPeek ? false : "x"}
            dragConstraints={{ left: -220, right: 180 }}
            dragElastic={0.12}
            whileTap={showPeek ? undefined : { scale: 0.995 }}
            onPointerDown={startLongPress}
            onPointerMove={(e) => {
              if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) {
                movedRef.current = true;
                draggedRef.current = true;
                clearLongPress();
              }
            }}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
            onDragStart={() => {
              haptics.prime();
              draggedRef.current = true;
              crossedThresholdRef.current = null;
              clearLongPress();
            }}
            onDrag={(_, info) => {
              const dx = info.offset.x;
              if (dx > FULL_BOOKMARK_THRESHOLD) {
                if (crossedThresholdRef.current !== "bookmark-full") {
                  haptics.medium();
                  crossedThresholdRef.current = "bookmark-full";
                }
              } else if (dx > REVEAL_THRESHOLD) {
                if (crossedThresholdRef.current !== "bookmark-reveal") {
                  haptics.light();
                  crossedThresholdRef.current = "bookmark-reveal";
                }
              } else if (dx < -FULL_DELETE_THRESHOLD) {
                if (crossedThresholdRef.current !== "delete-full") {
                  haptics.warning();
                  crossedThresholdRef.current = "delete-full";
                }
              } else if (dx < -REVEAL_THRESHOLD) {
                if (crossedThresholdRef.current !== "delete-reveal") {
                  haptics.light();
                  crossedThresholdRef.current = "delete-reveal";
                }
              } else {
                crossedThresholdRef.current = null;
              }
            }}
            onDragEnd={(_, info) => {
              crossedThresholdRef.current = null;
              const dx = info.offset.x;

              // 1. Full swipe to bookmark
              if (dx > FULL_BOOKMARK_THRESHOLD) {
                haptics.success();
                onToggleBookmark(entry.id);
                toast.success(entry.bookmarked ? "Bookmark removed" : "Bookmarked");
                setRevealed(null);
                onRevealedChange?.(false);
                snapBack();
                return;
              }

              // 2. Partial swipe right to reveal bookmark
              if (dx > REVEAL_THRESHOLD) {
                haptics.light();
                setRevealed("left");
                onRevealedChange?.(true);
                animate(x, 88, { type: "spring", stiffness: 420, damping: 36 });
                return;
              }

              // 3. Full swipe to delete
              if (dx < -FULL_DELETE_THRESHOLD) {
                haptics.warning();
                setRevealed(null);
                onRevealedChange?.(false);
                snapBack();
                onDelete(entry.id);
                return;
              }

              // 4. Partial swipe left to reveal edit and delete
              if (dx < -REVEAL_THRESHOLD) {
                haptics.light();
                setRevealed("right");
                onRevealedChange?.(true);
                animate(x, -136, { type: "spring", stiffness: 420, damping: 36 });
                return;
              }

              // Reset if let go within center zone
              setRevealed(null);
              onRevealedChange?.(false);
              snapBack();
            }}
            onClick={() => {
              if (showPeek) return;
              if (draggedRef.current) {
                draggedRef.current = false;
                return;
              }
              if (revealed) {
                setRevealed(null);
                onRevealedChange?.(false);
                snapBack();
                return;
              }
              if (isSelectMode) {
                onSelectToggle?.(entry.id);
                return;
              }
              haptics.light();
              toggleExpand();
            }}
            className="relative z-10 cursor-pointer select-none rounded-[20px] bg-app-bg"
          >
            {cardInner}
          </motion.div>
        </div>


        <AnimatePresence>
          {showPeek && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-5"
              onClick={() => setShowPeek(false)}
            >
              <div className="absolute inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-xl" />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 6 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="relative w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="scale-[1.015] shadow-2xl rounded-[20px] overflow-hidden">{cardInner}</div>
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.03 }}
                  className="mt-3.5 mx-auto w-[230px] rounded-[18px] overflow-hidden bg-app-card/95 backdrop-blur-2xl border border-app-card-border shadow-2xl"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-[16px] text-app-text-primary border-b border-app-hairline active:bg-black/5 dark:active:bg-white/5 transition"
                    onClick={() => {
                      haptics.light();
                      setShowPeek(false);
                      onEdit(entry);
                    }}
                  >
                    Edit <Edit3 className="w-4 h-4 text-app-accent" />
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-[16px] text-app-text-primary border-b border-app-hairline active:bg-black/5 dark:active:bg-white/5 transition"
                    onClick={() => {
                      haptics.success();
                      onToggleBookmark(entry.id);
                      setShowPeek(false);
                    }}
                  >
                    Bookmark <Bookmark className={`w-4 h-4 text-[#FF3B30] ${entry.bookmarked ? "fill-current" : ""}`} />
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-[16px] text-[#FF3B30] active:bg-black/5 dark:active:bg-white/5 transition"
                    onClick={() => {
                      haptics.warning();
                      setShowPeek(false);
                      onDelete(entry.id);
                    }}
                  >
                    Delete <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {activePhotoViewerIndex !== null && (
          <MediaGallery
            mediaRefs={entry.media || []}
            activeViewerIndex={activePhotoViewerIndex}
            onCloseViewer={() => setActivePhotoViewerIndex(null)}
            onIndexChange={setActivePhotoViewerIndex}
            entryDate={entry.entryDate}
            editable={false}
          />
        )}
      </>
    );
  },
);
