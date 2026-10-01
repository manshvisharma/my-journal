import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Undo2,
  Redo2,
  Check,
  MoreHorizontal,
  Plus,
  Bookmark,
  Pin,
  Image as ImageIcon,
  Music,
  Smile,
  Calendar,
  FolderOpen,
  Info,
  Trash2,
  Share2,
  Activity,
  MapPin,
} from 'lucide-react';

import type { AttachmentItem, Entry, LocationAttachment, MoodData, SongAttachment, MediaRef } from '../types';
import type { ShareDoc, ShareMediaDoc } from '../types/share';
import { useJournalStore } from '../store/useJournalStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFoldersList } from '../store/selectors';
import { draftBuffer } from '../data/draftBuffer';
import { processImageFile } from '../data/mediaPipeline';
import { repository } from '../data/repository';
import { shareRepository } from '../features/share/shareRepository';
import { tiptapJsonToHtml } from '../features/share/sanitize';
import { CONFIG } from '../config';
import { AaPopover } from './AaPopover';
import { MoodSheet } from '../features/mood/MoodSheet';
import { ChooseJournalsModal } from '../features/folders/ChooseJournalsModal';
import { SongAttachmentModal } from '../features/songs/SongAttachmentModal';
import { ShareSheet } from '../features/share/ShareSheet';
import { LinkActivityModal } from '../features/share/LinkActivityModal';
import { MediaGallery } from '../features/media/MediaGallery';
import { SongCard } from '../features/songs/SongCard';
import { LocationSheet } from '../features/location/LocationSheet';
import { AttachmentCollage } from '../features/entries/AttachmentCollage';
import { IOSDateTimePicker } from '../ui/IOSDateTimePicker';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { toast } from '../ui/Toast';
import { haptics } from '../lib/haptics';
import { appendAttachment, deriveAttachmentOrder, removeAttachment } from '@/lib/attachments';

interface EntryEditorViewProps {
  entry: Entry;
  initialEditMode?: boolean;
  onBack: () => void;
  onEntryUpdated?: (updated: Entry) => void;
}

export const EntryEditorView: React.FC<EntryEditorViewProps> = ({
  entry,
  initialEditMode = false,
  onBack,
  onEntryUpdated,
}) => {
  const saveEntryStore = useJournalStore((state) => state.saveEntry);
  const softDeleteEntry = useJournalStore((state) => state.softDeleteEntry);
  const deleteEntryPermanently = useJournalStore((state) => state.deleteEntryPermanently);
  const toggleBookmark = useJournalStore((state) => state.toggleBookmark);
  const togglePin = useJournalStore((state) => state.togglePin);
  const folders = useFoldersList();

  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [title, setTitle] = useState(entry.title || '');
  const [entryDate, setEntryDate] = useState<number>(entry.entryDate || Date.now());
  const [mediaRefs, setMediaRefs] = useState<MediaRef[]>(entry.media || []);
  const [songs, setSongs] = useState<SongAttachment[]>(entry.songs || []);
  const [mood, setMood] = useState<MoodData | null>(entry.mood || null);
  const [location, setLocation] = useState<LocationAttachment | null>(entry.location || null);
  const [attachmentOrder, setAttachmentOrder] = useState<AttachmentItem[]>(() => deriveAttachmentOrder(entry));
  const [folderIds, setFolderIds] = useState<string[]>(entry.folderIds || [CONFIG.defaultFolderId]);
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(entry.bookmarked);
  const [isPinned, setIsPinned] = useState<boolean>(entry.pinned);

  // Overlays state
  const [showAaPopover, setShowAaPopover] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMoodSheet, setShowMoodSheet] = useState(false);
  const [showJournalsModal, setShowJournalsModal] = useState(false);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [editorPhotoIndex, setEditorPhotoIndex] = useState<number | null>(null);
  const [activityShareId, setActivityShareId] = useState<string | null>(null);
  const [activeShareDoc, setActiveShareDoc] = useState<ShareDoc | null>(null);

  const user = useAuthStore((state) => state.user);
  const ownerUid = user?.uid || 'demo-local-user';

  const shareDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if share is active for this entry
  useEffect(() => {
    let mounted = true;
    shareRepository.getShareByEntryId(ownerUid, entry.id).then((s) => {
      if (mounted && s && s.active) {
        setActiveShareDoc(s);
      } else if (mounted) {
        setActiveShareDoc(null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [ownerUid, entry.id, entry.updatedAt]);

  // Sync collision detection
  const [remoteConflict, setRemoteConflict] = useState<Entry | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const viewportBottomOffsetRef = useRef(0);
  const [viewportBottomOffset, setViewportBottomOffset] = useState(0);

  // Visual viewport handling for iOS keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
        const bottomOffset = Math.max(0, offset);
        viewportBottomOffsetRef.current = bottomOffset;
        setViewportBottomOffset(bottomOffset);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  // Check draft buffer on mount
  useEffect(() => {
    const draft = draftBuffer.getDraft(entry.id);
    if (draft && draft.updatedAt > entry.updatedAt) {
      setTitle(draft.title);
      toast.info('Recovered unsaved text');
    }
  }, [entry.id, entry.updatedAt]);

  // Listen to remote changes to the same entry
  const currentEntryInStore = useJournalStore((state) => state.entries.get(entry.id));
  useEffect(() => {
    if (
      currentEntryInStore &&
      currentEntryInStore.updatedAt > entry.updatedAt &&
      currentEntryInStore.id === entry.id
    ) {
      if (!isEditing && !isDirtyRef.current) {
        setTitle(currentEntryInStore.title);
        setEntryDate(currentEntryInStore.entryDate);
        setMediaRefs(currentEntryInStore.media || []);
        setSongs(currentEntryInStore.songs || []);
        setMood(currentEntryInStore.mood);
        setLocation(currentEntryInStore.location || null);
        setAttachmentOrder(deriveAttachmentOrder(currentEntryInStore));
        setFolderIds(currentEntryInStore.folderIds);
        setTags(currentEntryInStore.tags);
        setIsBookmarked(currentEntryInStore.bookmarked);
        setIsPinned(currentEntryInStore.pinned);
      } else {
        setRemoteConflict(currentEntryInStore);
      }
    }
  }, [currentEntryInStore, entry.id, entry.updatedAt, isEditing]);

  // Initial content parsing for Tiptap
  let initialContent: unknown = '';
  try {
    if (entry.bodyJson) {
      initialContent = JSON.parse(entry.bodyJson);
    }
  } catch {
    initialContent = entry.plainText || '';
  }

  // Tiptap instance
  const editor = useEditor({
    immediatelyRender: false,
    editable: isEditing,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    content: initialContent as string | Record<string, unknown>,
    onUpdate: () => {
      isDirtyRef.current = true;
      scheduleAutosave();

      // Synchronously mirror to draft buffer
      if (editor) {
        const json = JSON.stringify(editor.getJSON());
        const text = editor.getText();
        draftBuffer.saveDraft(entry.id, title, json, text);
      }
    },
  });

  // Keep editor editable state in sync
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  // Debounced 3s auto-update of active share when editing
  useEffect(() => {
    if (!activeShareDoc || !activeShareDoc.active) return;

    if (shareDebounceRef.current) clearTimeout(shareDebounceRef.current);
    shareDebounceRef.current = setTimeout(async () => {
      try {
        const bodyJson = JSON.stringify(editor?.getJSON() || {});
        const plainText = editor?.getText() || '';
        const bodyHtml = tiptapJsonToHtml(bodyJson, plainText);
        const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
        const snippet = plainText.slice(0, 160).replace(/\n/g, ' ');

        const mediaDocs: ShareMediaDoc[] = [];
        if (activeShareDoc.includePhotos && mediaRefs.length > 0) {
          for (let i = 0; i < Math.min(12, mediaRefs.length); i++) {
            const ref = mediaRefs[i];
            const mDoc = await repository.getMedia(ref.id);
            if (mDoc) {
              mediaDocs.push({
                id: `media-${i}`,
                shareId: activeShareDoc.id,
                index: i,
                full: mDoc.full,
                thumb: mDoc.thumb,
                w: mDoc.w,
                h: mDoc.h,
                createdAt: Date.now(),
              });
            }
          }
        }

        await shareRepository.saveShare(
          {
            ...activeShareDoc,
            title: title.trim() || 'Untitled Entry',
            bodyHtml,
            snippet,
            wordCount,
            entryDate,
            mood: activeShareDoc.mood ? mood : null,
            updatedAt: Date.now(),
          },
          mediaDocs
        );
      } catch (e) {
        console.warn('Auto-updating share link error:', e);
      }
    }, 3000);

    return () => {
      if (shareDebounceRef.current) clearTimeout(shareDebounceRef.current);
    };
  }, [title, entryDate, mood, mediaRefs, editor?.getText(), activeShareDoc]);

  // Save entry function
  const saveCurrentState = useCallback(
    async (isExiting = false) => {
      if (!editor) return;

      const currentTitle = title.trim();
      const bodyJson = JSON.stringify(editor.getJSON());
      const plainText = editor.getText().trim();
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      const snippet = plainText.slice(0, 160).replace(/\n/g, ' ');

      // Requirement #7: An empty new entry backed out of must be silently discarded (hard-delete, not sent to trash)
      const isEmpty = !currentTitle && !plainText && mediaRefs.length === 0 && songs.length === 0 && !mood && !location;
      if (isEmpty) {
        if (isExiting) {
          draftBuffer.clearDraft(entry.id);
          await deleteEntryPermanently(entry.id);
        }
        return;
      }

      let coverThumb: string | null = null;
      if (mediaRefs.length > 0) {
        const firstMedia = await repository.getMedia(mediaRefs[0].id);
        if (firstMedia) {
          coverThumb = firstMedia.thumb;
        }
      }

      const updatedEntry: Entry = {
        ...entry,
        title: currentTitle,
        bodyJson,
        plainText,
        snippet,
        wordCount,
        entryDate,
        updatedAt: Date.now(),
        folderIds: folderIds.length > 0 ? folderIds : [CONFIG.defaultFolderId],
        tags,
        bookmarked: isBookmarked,
        pinned: isPinned,
        pinnedAt: isPinned ? entry.pinnedAt || Date.now() : null,
        mood,
        media: mediaRefs,
        coverThumb,
        songs,
        location,
        attachmentOrder,
        deletedAt: null,
      };

      await saveEntryStore(updatedEntry);
      isDirtyRef.current = false;
      draftBuffer.clearDraft(entry.id);
      if (onEntryUpdated) onEntryUpdated(updatedEntry);
    },
    [
      editor,
      title,
      entryDate,
      folderIds,
      tags,
      isBookmarked,
      isPinned,
      mood,
      mediaRefs,
      songs,
      location,
      attachmentOrder,
      entry,
      saveEntryStore,
      deleteEntryPermanently,
      onEntryUpdated,
    ]
  );

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      saveCurrentState();
    }, CONFIG.autosaveDebounceMs);
  }, [saveCurrentState]);

  // Immediate flush on blur, visibilitychange, beforeunload
  useEffect(() => {
    const handleFlush = () => {
      if (isDirtyRef.current) {
        saveCurrentState();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        saveCurrentState();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('blur', handleFlush);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    });

    return () => {
      window.removeEventListener('blur', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [saveCurrentState]);

  const handleDone = async () => {
    haptics.success();
    await saveCurrentState(true);
    setIsEditing(false);
  };

  const handleBackClick = async () => {
    haptics.light();
    await saveCurrentState(true);
    onBack();
  };

  // Photo upload handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaRefs.length + files.length > CONFIG.maxPhotosPerEntry) {
      toast.error(`Maximum ${CONFIG.maxPhotosPerEntry} photos allowed per entry`);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const newMediaRefs: MediaRef[] = [...mediaRefs];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processImageFile(file);
        const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        await repository.saveMedia({
          id: mediaId,
          entryId: entry.id,
          full: processed.fullDataUrl,
          thumb: processed.thumbDataUrl,
          w: processed.width,
          h: processed.height,
          createdAt: Date.now(),
        });

        newMediaRefs.push({
          id: mediaId,
          w: processed.width,
          h: processed.height,
        });
        setAttachmentOrder((prev) => appendAttachment(prev, { type: "photo", mediaId }));
      }

      setMediaRefs(newMediaRefs);
      isDirtyRef.current = true;
      scheduleAutosave();
      toast.success('Photo added');
    } catch (err) {
      toast.error('Could not process photo');
      console.warn(err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (mediaId: string) => {
    setMediaRefs((prev) => prev.filter((m) => m.id !== mediaId));
    setAttachmentOrder((prev) => removeAttachment(prev, (item) => item.type === "photo" && item.mediaId === mediaId));
    await repository.deleteMedia(mediaId);
    isDirtyRef.current = true;
    scheduleAutosave();
  };

  const handleAddSong = (newSong: SongAttachment) => {
    setSongs((prev) => {
      const next = [...prev, newSong];
      setAttachmentOrder((order) => appendAttachment(order, { type: "song", index: next.length - 1 }));
      return next;
    });
    isDirtyRef.current = true;
    scheduleAutosave();
  };

  const handleRemoveSong = (idx: number) => {
    setSongs((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentOrder((prev) => removeAttachment(prev, (item) => item.type === "song" && item.index === idx));
    isDirtyRef.current = true;
    scheduleAutosave();
  };

  const handleSaveMood = (newMood: MoodData) => {
    setMood(newMood);
    setAttachmentOrder((prev) => appendAttachment(prev, { type: "mood" }));
    isDirtyRef.current = true;
    scheduleAutosave();
  };

  const handleClearMood = () => {
    setMood(null);
    setAttachmentOrder((prev) => removeAttachment(prev, (item) => item.type === "mood"));
    isDirtyRef.current = true;
    scheduleAutosave();
  };

  const formattedDate = format(new Date(entryDate), 'EEEE, d MMM yyyy · h:mm a');
  const formattedDateShort = format(new Date(entryDate), 'EEE, d MMM');

  return (
    <div className="relative flex flex-col h-full w-full bg-app-bg overflow-hidden select-none">
      {/* Top Header Bar with iOS Safe Area Clearance */}
      <header className="px-4 sm:px-8 pt-safe border-b border-app-hairline shrink-0 backdrop-blur-md z-30">
        <div className="h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center gap-1.5 p-2 -ml-2 rounded-full text-app-accent hover:opacity-80 transition"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Journals</span>
          </button>

        {/* Date Centered (Tapping opens IOSDateTimePicker) */}
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShowDatePicker(true);
          }}
          className="text-xs font-semibold uppercase tracking-wider text-app-text-secondary hover:text-app-text-primary px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          {/* Mobile: short date without time; Desktop: full date */}
          <span className="sm:hidden">{formattedDateShort}</span>
          <span className="hidden sm:inline">{formattedDate}</span>
        </button>

        {/* Right action: Edit or Done */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              {/* Share icon — only show on desktop; on mobile it's in the ••• menu */}
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setShowShareSheet(true);
                }}
                className="hidden sm:flex p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
                aria-label="Share entry"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setShowMoreMenu(true);
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
                aria-label="Entry actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setIsEditing(true);
                  setTimeout(() => titleInputRef.current?.focus(), 50);
                }}
                className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-app-text-primary text-sm font-semibold border border-app-hairline transition active:scale-95"
              >
                Edit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDone}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-app-accent hover:bg-app-accent-light text-white text-sm font-bold shadow-md transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </header>


      {/* Multi-device collision warning banner */}
      {remoteConflict && (
        <div className="bg-amber-600/90 text-white px-4 py-2 text-xs flex items-center justify-between shrink-0 shadow z-30">
          <span>Updated on another device. Load latest version?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle(remoteConflict.title);
                if (editor) {
                  try {
                    editor.commands.setContent(JSON.parse(remoteConflict.bodyJson));
                  } catch {
                    editor.commands.setContent(remoteConflict.plainText);
                  }
                }
                setRemoteConflict(null);
              }}
              className="underline font-bold"
            >
              Load
            </button>
            <button
              type="button"
              onClick={() => setRemoteConflict(null)}
              className="text-white/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 pb-40 max-w-3xl w-full mx-auto text-app-text-primary">
        <AttachmentCollage
          entry={{
            mood,
            media: mediaRefs,
            songs,
            location,
            attachmentOrder,
            entryDate,
          }}
          onPhotoClick={(idx) => setEditorPhotoIndex(idx)}
          onAttachmentClick={(kind, data) => {
            if (!isEditing) {
              if (kind === "song" && data.url) window.open(data.url, "_blank", "noopener,noreferrer");
              return;
            }
            // In edit mode, allow deleting the attachment
            haptics.warning();
            if (window.confirm(`Remove this ${kind}?`)) {
              if (kind === "mood") setMood(null);
              if (kind === "location") setLocation(null);
              if (kind === "song") setSongs(songs.filter(s => s.url !== data.url));
              isDirtyRef.current = true;
            }
          }}
        />

        {/* Folder Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {folderIds.map((fId) => {
            const f = folders.find((item) => item.id === fId);
            if (!f) return null;
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-app-card border border-app-card-border text-app-text-secondary"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                <span>{f.name}</span>
              </span>
            );
          })}
        </div>

        {/* Title Input */}
        {isEditing ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              isDirtyRef.current = true;
              scheduleAutosave();
              draftBuffer.saveDraft(
                entry.id,
                e.target.value,
                JSON.stringify(editor?.getJSON() || {}),
                editor?.getText() || ''
              );
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor?.commands.focus();
              }
            }}
            placeholder="Title"
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none text-app-text-primary placeholder-app-text-tertiary focus:outline-none mb-3"
          />
        ) : (
          <h1 className="text-2xl sm:text-3xl font-bold text-app-text-primary mb-3 break-words selectable-text">
            {title || <span className="text-app-text-tertiary italic">Untitled Entry</span>}
          </h1>
        )}

        {/* Hairline Divider */}
        <div className="h-px w-full bg-app-hairline mb-5" />

        {/* Tiptap Rich Text Content */}
        <div className="selectable-text text-app-text-primary text-lg leading-relaxed min-h-[300px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Hidden File Input for Photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Floating Toolbar in Edit Mode (Positioned above home bar or iOS keyboard) */}
      {isEditing && (
        <div
          style={{
            bottom:
              viewportBottomOffset > 10
                ? `${viewportBottomOffset + 12}px`
                : 'calc(1rem + env(safe-area-inset-bottom, 12px))',
          }}
          className="fixed sm:absolute left-1/2 -translate-x-1/2 z-50 transition-all duration-100"
        >
          <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-app-card/95 backdrop-blur-2xl border border-app-card-border shadow-2xl text-app-text-primary">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                editor?.chain().focus().undo().run();
              }}
              disabled={!editor?.can().undo()}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary disabled:opacity-30 transition"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.light();
                editor?.chain().focus().redo().run();
              }}
              disabled={!editor?.can().redo()}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary disabled:opacity-30 transition"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-app-hairline my-auto mx-0.5" />

            {/* Aa Formatting pill button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setShowAaPopover((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  showAaPopover ? 'bg-app-accent text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
                }`}
              >
                Aa
              </button>
              <AaPopover
                editor={editor}
                isOpen={showAaPopover}
                onClose={() => setShowAaPopover(false)}
              />
            </div>

            {/* Insert (+) button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setShowInsertMenu((prev) => !prev);
                }}
                className={`p-2.5 rounded-full transition ${
                  showInsertMenu ? 'bg-app-accent text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
                }`}
                title="Insert media"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Insert Popover */}
              {showInsertMenu && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-52 bg-app-card/95 backdrop-blur-2xl border border-app-card-border rounded-2xl shadow-2xl p-1.5 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInsertMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition"
                  >
                    <ImageIcon className="w-4 h-4 text-app-accent" />
                    <span>Photos ({mediaRefs.length}/12)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInsertMenu(false);
                      setShowSongModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition"
                  >
                    <Music className="w-4 h-4 text-app-accent" />
                    <span>Song Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInsertMenu(false);
                      setShowMoodSheet(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition"
                  >
                    <Smile className="w-4 h-4 text-app-accent" />
                    <span>{mood ? "Edit Mood" : "Mood"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInsertMenu(false);
                      setShowLocationSheet(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition"
                  >
                    <MapPin className="w-4 h-4 text-app-accent" />
                    <span>{location ? "Edit Place" : "Location"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-app-hairline my-auto mx-0.5" />

            {/* ⋯ More button */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setShowMoreMenu(true);
              }}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary transition"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* More Menu Sheet */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-4"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-app-card border border-app-card-border shadow-2xl p-3 flex flex-col gap-1 text-app-text-primary select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-app-hairline flex justify-between items-center text-xs font-semibold text-app-text-tertiary uppercase tracking-wider">
              <span>Entry Options</span>
              <span>{formattedDateShort}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                setShowShareSheet(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium transition"
            >
              <Share2 className="w-5 h-5 text-app-accent" />
              <span>Share Entry</span>
            </button>

            {activeShareDoc && (
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setActivityShareId(activeShareDoc.id);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium transition"
              >
                <Activity className="w-5 h-5 text-app-accent" />
                <span>Link Activity</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                setShowDatePicker(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium transition"
            >
              <Calendar className="w-5 h-5 text-app-accent" />
              <span>Change Date & Time</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                setShowInfoSheet(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-sm font-medium transition"
            >
              <Info className="w-5 h-5 text-app-text-secondary" />
              <span>Entry Info</span>
            </button>

            <div className="h-px bg-app-hairline my-1" />

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-500/10 text-red-500 text-sm font-semibold transition"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete Entry</span>
            </button>
          </div>
        </div>
      )}

      {/* Entry Info Sheet */}
      {showInfoSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
          onClick={() => setShowInfoSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-app-card border border-app-card-border shadow-2xl p-6 text-app-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Entry Information</h3>
            <div className="space-y-3 text-sm text-app-text-secondary">
              <div className="flex justify-between py-1.5 border-b border-app-hairline">
                <span>Words</span>
                <span className="font-semibold text-app-text-primary">{entry.wordCount || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-app-hairline">
                <span>Created</span>
                <span>{format(new Date(entry.createdAt || entry.entryDate), 'PPp')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-app-hairline">
                <span>Last Modified</span>
                <span>{format(new Date(entry.updatedAt || entry.entryDate), 'PPp')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-app-hairline">
                <span>Photos Attached</span>
                <span>{mediaRefs.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Songs Attached</span>
                <span>{songs.length}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoSheet(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-app-text-primary font-semibold text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Native iOS Date & Time Picker */}
      <IOSDateTimePicker
        isOpen={showDatePicker}
        value={entryDate}
        onChange={(newTs) => {
          setEntryDate(newTs);
          isDirtyRef.current = true;
          scheduleAutosave();
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Mood Sheet */}
      <MoodSheet
        isOpen={showMoodSheet}
        onClose={() => setShowMoodSheet(false)}
        initialMood={mood}
        onSaveMood={handleSaveMood}
        onClearMood={handleClearMood}
      />

      <LocationSheet
        isOpen={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
        initial={location}
        onSave={(next) => {
          setLocation(next);
          setAttachmentOrder((prev) =>
            next ? appendAttachment(prev, { type: "location" }) : removeAttachment(prev, (item) => item.type === "location"),
          );
          isDirtyRef.current = true;
          scheduleAutosave();
        }}
      />

      {editorPhotoIndex !== null && (
        <MediaGallery
          mediaRefs={mediaRefs}
          editable={isEditing}
          activeViewerIndex={editorPhotoIndex}
          onCloseViewer={() => setEditorPhotoIndex(null)}
          onIndexChange={setEditorPhotoIndex}
          onRemovePhoto={handleRemovePhoto}
          entryDate={entryDate}
        />
      )}

      {/* Choose Journals Modal */}
      <ChooseJournalsModal
        isOpen={showJournalsModal}
        onClose={() => setShowJournalsModal(false)}
        selectedFolderIds={folderIds}
        onSave={(fIds) => {
          setFolderIds(fIds);
          isDirtyRef.current = true;
          scheduleAutosave();
        }}
      />

      {/* Song Attachment Modal */}
      <SongAttachmentModal
        isOpen={showSongModal}
        onClose={() => setShowSongModal(false)}
        onAddSong={handleAddSong}
      />

      {/* Share Entry Sheet */}
      {showShareSheet && (
        <ShareSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          entry={entry}
          onOpenActivity={(sId) => {
            setShowShareSheet(false);
            setActivityShareId(sId);
          }}
        />
      )}

      {/* Link Activity Modal */}
      {activityShareId && (
        <LinkActivityModal
          isOpen={Boolean(activityShareId)}
          onClose={() => setActivityShareId(null)}
          shareId={activityShareId}
        />
      )}

      {/* Confirm Delete Sheet */}
      <ConfirmSheet
        isOpen={showDeleteConfirm}
        title="Delete Entry?"
        description="It will move to Recently Deleted for 30 days."
        confirmLabel="Delete Entry"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={async () => {
          await softDeleteEntry(entry.id);
          toast.info('Moved to Recently Deleted');
          setShowDeleteConfirm(false);
          onBack();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
