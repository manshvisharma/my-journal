import React, { useState, useMemo } from 'react';
import {
  Search,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  CheckSquare,
  Sparkles,
  Bookmark,
  Trash2,
  FolderOpen,
  Printer,
  RotateCcw,
  Flame,
  Quote,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

import type { Entry, Folder } from '../../types';
import { useJournalStore } from '../../store/useJournalStore';
import {
  useEntriesList,
  usePinnedEntries,
  useOnThisDayEntries,
  useFoldersList,
  useStats,
} from '../../store/selectors';
import { EntryCard } from './EntryCard';
import { OnThisDayCard } from './OnThisDayCard';
import { OrganiseUnsortedModal } from './OrganiseUnsortedModal';
import { ChooseJournalsModal } from '../folders/ChooseJournalsModal';
import { ShareSheet } from '../share/ShareSheet';
import { LinkActivityModal } from '../share/LinkActivityModal';
import { InsightsSheet } from '../insights/InsightsSheet';
import { Menu, type MenuItem } from '../../ui/Menu';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface EntryListViewProps {
  viewTitle: string;
  folderId?: string;
  smartView?: 'bookmarks' | 'unsorted' | 'trash' | 'all';
  onBack?: () => void;
  onOpenEntry: (id: string) => void;
  onNewEntry: () => void;
  onOpenSearch: () => void;
  onOpenInsights?: () => void;
  hideBack?: boolean;
  hideFab?: boolean;
  selectedDateFilter?: string | null;
  onClearDateFilter?: () => void;
}

export const EntryListView: React.FC<EntryListViewProps> = ({
  viewTitle,
  folderId,
  smartView,
  onBack,
  onOpenEntry,
  onNewEntry,
  onOpenSearch,
  onOpenInsights,
  hideFab = false,
  selectedDateFilter,
  onClearDateFilter,
}) => {
  const folders = useFoldersList();
  const foldersMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const stats = useStats();

  // Single-expanded and single-revealed entry state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [revealedEntryId, setRevealedEntryId] = useState<string | null>(null);
  const [showInsightsSheet, setShowInsightsSheet] = useState(false);

  // Zustand Store hooks & actions
  const isSelectMode = useJournalStore((state) => state.isSelectMode);
  const selectedEntryIds = useJournalStore((state) => state.selectedEntryIds);
  const setSelectMode = useJournalStore((state) => state.setSelectMode);
  const toggleSelectEntry = useJournalStore((state) => state.toggleSelectEntry);
  const selectAll = useJournalStore((state) => state.selectAll);
  const clearSelection = useJournalStore((state) => state.clearSelection);
  const bulkDelete = useJournalStore((state) => state.bulkDelete);
  const assignFolders = useJournalStore((state) => state.assignFolders);
  const toggleBookmark = useJournalStore((state) => state.toggleBookmark);
  const togglePin = useJournalStore((state) => state.togglePin);
  const softDeleteEntry = useJournalStore((state) => state.softDeleteEntry);
  const restoreEntry = useJournalStore((state) => state.restoreEntry);
  const deletePermanently = useJournalStore((state) => state.deleteEntryPermanently);
  const purgeTrash = useJournalStore((state) => state.purgeTrash);
  const updateSettings = useJournalStore((state) => state.updateSettings);
  const settings = useJournalStore((state) => state.settings);

  // Sorting state
  const [sortBy, setSortBy] = useState<'entryDate' | 'updatedAt' | 'title'>(settings.sortBy || 'entryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(settings.sortDir || 'desc');

  // Entries list
  const entries = useEntriesList(folderId, undefined, smartView, sortBy, sortDir);
  const pinnedEntries = usePinnedEntries();
  const onThisDayEntries = useOnThisDayEntries();

  // Modals & Sheets
  const [activeEntryForFolders, setActiveEntryForFolders] = useState<Entry | null>(null);
  const [showBulkFoldersModal, setShowBulkFoldersModal] = useState(false);
  const [showOrganiseModal, setShowOrganiseModal] = useState(false);
  const [shareEntry, setShareEntry] = useState<Entry | null>(null);
  const [activityShareId, setActivityShareId] = useState<string | null>(null);

  // Confirm Sheets state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {},
  });

  const isTrash = smartView === 'trash';
  const isMainView = !folderId && (smartView === 'all' || !smartView);

  const [dateFilter, setDateFilter] = useState<string | null>(selectedDateFilter || null);

  React.useEffect(() => {
    if (selectedDateFilter !== undefined) {
      setDateFilter(selectedDateFilter);
    }
  }, [selectedDateFilter]);

  const displayedEntries = useMemo(() => {
    if (!dateFilter) return entries;
    return entries.filter((entry) => {
      const d = new Date(entry.entryDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === dateFilter;
    });
  }, [entries, dateFilter]);

  // Group entries by date sections matching Apple Journal screenshots
  const currentYear = new Date().getFullYear();
  const groupedSections = useMemo(() => {
    const groups: Array<{ title: string; entries: Entry[] }> = [];
    const groupMap = new Map<string, Entry[]>();

    displayedEntries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      let title: string;

      if (isToday(d)) {
        title = 'Today';
      } else if (isYesterday(d)) {
        title = 'Yesterday';
      } else if (d.getFullYear() === currentYear) {
        // Current year: "September", "August"
        title = format(d, 'MMMM');
      } else {
        // Older year: "August 2025"
        title = format(d, 'MMMM yyyy');
      }

      if (!groupMap.has(title)) {
        groupMap.set(title, []);
      }
      groupMap.get(title)!.push(entry);
    });

    groupMap.forEach((entryList, title) => {
      groups.push({ title, entries: entryList });
    });

    return groups;
  }, [displayedEntries, currentYear]);

  // List "⋯" menu items
  const listMenuItems: MenuItem[] = isTrash
    ? [
        {
          id: 'recover-all',
          label: 'Recover All Entries',
          icon: <RotateCcw className="w-4 h-4 text-app-accent" />,
          onClick: () => {
            setConfirmConfig({
              isOpen: true,
              title: 'Recover All Entries?',
              description: 'All entries in Recently Deleted will be restored to their journals.',
              confirmLabel: 'Recover All',
              isDestructive: false,
              onConfirm: async () => {
                for (const e of entries) {
                  await restoreEntry(e.id);
                }
                toast.success('All entries recovered');
                setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
              },
            });
          },
        },
        {
          id: 'delete-all',
          label: 'Empty Recently Deleted',
          icon: <Trash2 className="w-4 h-4 text-red-500" />,
          destructive: true,
          dividerAbove: true,
          onClick: () => {
            setConfirmConfig({
              isOpen: true,
              title: 'Empty Recently Deleted?',
              description: 'All entries in trash will be permanently deleted. This cannot be undone.',
              confirmLabel: 'Empty Trash',
              isDestructive: true,
              onConfirm: async () => {
                await purgeTrash();
                toast.info('Recently Deleted emptied');
                setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
              },
            });
          },
        },
      ]
    : [
        {
          id: 'sort-date-desc',
          label: 'Sort: Newest First',
          checked: sortBy === 'entryDate' && sortDir === 'desc',
          onClick: () => {
            setSortBy('entryDate');
            setSortDir('desc');
            updateSettings({ sortBy: 'entryDate', sortDir: 'desc' });
          },
        },
        {
          id: 'sort-date-asc',
          label: 'Sort: Oldest First',
          checked: sortBy === 'entryDate' && sortDir === 'asc',
          onClick: () => {
            setSortBy('entryDate');
            setSortDir('asc');
            updateSettings({ sortBy: 'entryDate', sortDir: 'asc' });
          },
        },
        {
          id: 'sort-updated',
          label: 'Sort: Recently Modified',
          checked: sortBy === 'updatedAt',
          onClick: () => {
            setSortBy('updatedAt');
            setSortDir('desc');
            updateSettings({ sortBy: 'updatedAt', sortDir: 'desc' });
          },
        },
        {
          id: 'sort-title',
          label: 'Sort: Title (A-Z)',
          checked: sortBy === 'title',
          onClick: () => {
            setSortBy('title');
            setSortDir('asc');
            updateSettings({ sortBy: 'title', sortDir: 'asc' });
          },
        },
        {
          id: 'select-entries',
          label: 'Select Entries',
          icon: <CheckSquare className="w-4 h-4" />,
          dividerAbove: true,
          onClick: () => setSelectMode(true),
        },
        {
          id: 'print',
          label: 'Print List',
          icon: <Printer className="w-4 h-4" />,
          onClick: () => window.print(),
        },
      ];

  // Bulk actions
  const selectedList = useMemo(() => Array.from(selectedEntryIds), [selectedEntryIds]);

  const handleBulkBookmark = async () => {
    for (const id of selectedList) {
      await toggleBookmark(id);
    }
    toast.success('Bookmarks updated');
  };

  const handleBulkRecover = async () => {
    for (const id of selectedList) {
      await restoreEntry(id);
    }
    clearSelection();
    toast.success(`${selectedList.length} entries recovered`);
  };

  const handleBulkDelete = () => {
    if (isTrash) {
      setConfirmConfig({
        isOpen: true,
        title: `Delete ${selectedList.length} Entries Permanently?`,
        description: 'These entries will be permanently removed. This cannot be undone.',
        confirmLabel: 'Delete Permanently',
        isDestructive: true,
        onConfirm: async () => {
          for (const id of selectedList) {
            await deletePermanently(id);
          }
          clearSelection();
          toast.info(`${selectedList.length} entries permanently deleted`);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setConfirmConfig({
        isOpen: true,
        title: `Delete ${selectedList.length} Entries?`,
        description: 'They will be moved to Recently Deleted for 30 days.',
        confirmLabel: 'Delete Entries',
        isDestructive: true,
        onConfirm: async () => {
          await bulkDelete(selectedList);
          clearSelection();
          toast.info(`${selectedList.length} entries moved to Recently Deleted`);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  const handleDeleteSingle = (entryId: string) => {
    if (isTrash) {
      setConfirmConfig({
        isOpen: true,
        title: 'Delete Entry Permanently?',
        description: 'This action cannot be undone.',
        confirmLabel: 'Delete Permanently',
        isDestructive: true,
        onConfirm: async () => {
          await deletePermanently(entryId);
          toast.info('Permanently deleted');
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setConfirmConfig({
        isOpen: true,
        title: 'Delete Entry?',
        description: 'It will move to Recently Deleted for 30 days.',
        confirmLabel: 'Delete Entry',
        isDestructive: true,
        onConfirm: async () => {
          await softDeleteEntry(entryId);
          toast.info('Moved to Recently Deleted');
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-app-bg overflow-hidden select-none">
      {/* Top Header */}
      <header className="px-5 pt-safe shrink-0">
        <div className="h-14 flex items-center justify-between">
          {/* Back to Home Button - visible only on mobile */}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex md:hidden items-center gap-1 -ml-2 text-app-accent hover:opacity-80 active:opacity-60 transition"
              aria-label="Back to Journal"
            >
              <ChevronLeft className="w-6 h-6 -mr-1" />
              <span className="text-[17px] font-medium">Journal</span>
            </button>
          ) : (
            <div />
          )}

          {/* Spacer: push action buttons to the right on desktop */}
          <div className="hidden md:flex flex-1" />

          {/* Top Right Action Buttons: Circular Search & ••• */}
          {!isSelectMode ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onNewEntry}
                className="hidden md:flex circle-btn text-app-accent"
                aria-label="New entry"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onOpenSearch}
                className="circle-btn"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <Menu
                trigger={(isOpen) => (
                  <button
                    type="button"
                    className={`circle-btn ${isOpen ? 'ring-2 ring-app-accent/40' : ''}`}
                    aria-label="List options"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                )}
                items={listMenuItems}
                align="right"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectAll(entries.map((e) => e.id))}
                className="text-[14px] font-semibold text-app-accent px-3 py-1.5 rounded-full bg-app-card border border-app-card-border"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[14px] font-semibold text-app-text-secondary px-3 py-1.5 rounded-full bg-app-card border border-app-card-border"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Large Page Title "Journal" or Folder Name */}
        <div className="pt-2 pb-2">
          <h1 className="text-[34px] font-bold tracking-[-0.4px] text-app-text-primary capitalize leading-tight">
            {viewTitle}
          </h1>

          {/* Apple-style 3-Column Stats Row across all views (Tapping opens InsightsSheet) */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              if (onOpenInsights) {
                onOpenInsights();
              } else {
                setShowInsightsSheet(true);
              }
            }}
            className="w-full text-left mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-app-card/60 hover:bg-app-card border border-app-card-border/80 transition-all active:scale-[0.99] group cursor-pointer"
            title="View Insights"
          >
            <div className="grid grid-cols-3 divide-x divide-app-hairline">
              {/* Day Streak */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <div className="flex items-center gap-1">
                  <span className="text-orange-500 text-[15px]">🔥</span>
                  <span className="text-[17px] font-bold text-app-text-primary leading-tight">
                    {stats.currentStreak}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-app-text-tertiary leading-tight mt-0.5">
                  Day Streak
                </span>
              </div>

              {/* Words Written */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <div className="flex items-center gap-1">
                  <span className="text-rose-500 text-[15px] font-serif">❝</span>
                  <span className="text-[17px] font-bold text-app-text-primary leading-tight">
                    {stats.wordsAllTime > 9999 ? `${(stats.wordsAllTime / 1000).toFixed(1)}k` : stats.wordsAllTime.toLocaleString()}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-app-text-tertiary leading-tight mt-0.5">
                  Words Written
                </span>
              </div>

              {/* Days Journaled */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <div className="flex items-center gap-1">
                  <span className="text-indigo-500 text-[15px]">📅</span>
                  <span className="text-[17px] font-bold text-app-text-primary leading-tight">
                    {stats.daysJournaledAllTime}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-app-text-tertiary leading-tight mt-0.5">
                  Days Journaled
                </span>
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Main List Container */}
      <main
        onScroll={() => {
          if (revealedEntryId) setRevealedEntryId(null);
        }}
        className="flex-1 overflow-y-auto overscroll-contain overflow-x-hidden px-4 sm:px-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] max-w-2xl w-full mx-auto space-y-6"
      >
        {/* Date Filter Active Banner */}
        {dateFilter && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-app-accent-tint border border-app-accent/30 text-app-accent text-sm font-semibold">
            <span>Filtered by date: {format(new Date(dateFilter + 'T00:00:00'), 'EEEE, d MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setDateFilter(null);
                onClearDateFilter?.();
              }}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-app-accent"
              title="Clear date filter"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}
        {/* Unsorted View "Organise" Banner */}
        {smartView === 'unsorted' && entries.length > 0 && (
          <div className="p-4 rounded-[18px] bg-app-accent-tint border border-app-accent/20 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-app-text-primary">Organise Unsorted Entries</h3>
              <p className="text-xs text-app-text-secondary mt-0.5">
                Review and file your entries into journals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOrganiseModal(true)}
              className="px-4 py-2 rounded-xl bg-app-accent text-white text-xs font-semibold shadow transition active:scale-95"
            >
              Organise
            </button>
          </div>
        )}

        {/* On This Day Horizontal Section */}
        {!isTrash && onThisDayEntries.length > 0 && !folderId && (
          <OnThisDayCard entries={onThisDayEntries} onOpenEntry={onOpenEntry} />
        )}

        {/* Pinned Section */}
        {!isTrash && pinnedEntries.length > 0 && !folderId && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-app-accent px-1">
              PINNED
            </h2>
            {pinnedEntries.map((entry) => (
              <EntryCard
                key={`pinned-${entry.id}`}
                entry={entry}
                foldersMap={foldersMap}
                isSelected={selectedEntryIds.has(entry.id)}
                isSelectMode={isSelectMode}
                isTrashView={false}
                onSelectToggle={toggleSelectEntry}
                onEdit={(e) => onOpenEntry(e.id)}
                onToggleBookmark={toggleBookmark}
                onTogglePin={togglePin}
                onChooseJournals={(e) => setActiveEntryForFolders(e)}
                onDelete={handleDeleteSingle}
              />
            ))}
          </section>
        )}

        {/* Date-Grouped Entries (Headers: Today, Yesterday, September, August 2026) */}
        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-app-hairline">
              <Sparkles className="w-7 h-7 text-app-text-tertiary" />
            </div>
            <h3 className="text-lg font-bold text-app-text-primary mb-1">
              {isTrash ? 'Trash is Empty' : 'No entries yet'}
            </h3>
            <p className="text-sm text-app-text-secondary max-w-xs mx-auto mb-6 leading-relaxed">
              {isTrash
                ? 'Deleted entries are permanently purged after 30 days.'
                : 'Capture your thoughts, reflections, and moments.'}
            </p>
            {!isTrash && (
              <button
                type="button"
                onClick={onNewEntry}
                className="px-5 py-2.5 rounded-full bg-app-accent text-white text-sm font-semibold shadow-md active:scale-95 transition"
              >
                Write an Entry
              </button>
            )}
          </div>
        ) : (
          groupedSections.map((section) => (
            <section key={section.title} className="space-y-3">
              {/* 22px Semibold Section Header matching screenshots */}
              <h2 className="text-[22px] font-semibold text-app-text-primary px-1 tracking-tight">
                {section.title}
              </h2>
              {section.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  foldersMap={foldersMap}
                  isSelected={selectedEntryIds.has(entry.id)}
                  isSelectMode={isSelectMode}
                  isTrashView={isTrash}
                  isExpanded={expandedEntryId === entry.id}
                  onToggleExpand={() =>
                    setExpandedEntryId((prev) => (prev === entry.id ? null : entry.id))
                  }
                  isRevealed={revealedEntryId === entry.id}
                  onRevealedChange={(isRev) =>
                    setRevealedEntryId(isRev ? entry.id : null)
                  }
                  onSelectToggle={toggleSelectEntry}
                  onEdit={(e) => onOpenEntry(e.id)}
                  onToggleBookmark={toggleBookmark}
                  onTogglePin={togglePin}
                  onChooseJournals={(e) => setActiveEntryForFolders(e)}
                  onDelete={handleDeleteSingle}
                  onRecover={async (id) => {
                    await restoreEntry(id);
                    toast.success('Entry recovered');
                  }}
                  onShare={(e) => setShareEntry(e)}
                  onOpenActivity={(id) => setActivityShareId(id)}
                />
              ))}
            </section>
          ))
        )}
      </main>

      {/* Floating Circular (+) Button at Bottom Center (Matching screenshots 1..7) */}
      {!isSelectMode && !isTrash && !hideFab && (
        <div className="md:hidden absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] inset-x-0 flex justify-center pointer-events-none z-40">
          <button
            type="button"
            onClick={onNewEntry}
            className="w-14 h-14 rounded-full bg-white dark:bg-[#1E1C28] text-app-accent border border-black/10 dark:border-white/15 flex items-center justify-center shadow-xl shadow-black/15 active:scale-95 transition pointer-events-auto"
            aria-label="New entry"
          >
            <Plus className="w-7 h-7 stroke-[2.6]" />
          </button>
        </div>
      )}

      {/* Multi-Select Floating Action Bar */}
      {isSelectMode && (
        <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl bg-app-card/95 backdrop-blur-2xl border border-app-card-border shadow-2xl text-app-text-primary">
          <span className="text-xs font-semibold px-3 py-1 text-app-text-secondary">
            {selectedEntryIds.size} Selected
          </span>

          <div className="w-px h-6 bg-app-hairline my-auto" />

          {isTrash ? (
            <button
              type="button"
              disabled={selectedEntryIds.size === 0}
              onClick={handleBulkRecover}
              className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition text-app-accent"
              title="Recover"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={selectedEntryIds.size === 0}
                onClick={() => setShowBulkFoldersModal(true)}
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition"
                title="Choose Journals"
              >
                <FolderOpen className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={selectedEntryIds.size === 0}
                onClick={handleBulkBookmark}
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition"
                title="Bookmark"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            disabled={selectedEntryIds.size === 0}
            onClick={handleBulkDelete}
            className="p-2.5 rounded-xl hover:bg-red-500/10 text-app-destructive disabled:opacity-30 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Choose Journals Modal */}
      {activeEntryForFolders && (
        <ChooseJournalsModal
          isOpen={Boolean(activeEntryForFolders)}
          onClose={() => setActiveEntryForFolders(null)}
          selectedFolderIds={activeEntryForFolders.folderIds || []}
          onSave={async (fIds) => {
            await assignFolders([activeEntryForFolders.id], fIds);
            toast.success('Journals updated');
          }}
        />
      )}

      {/* Bulk Choose Journals Modal */}
      {showBulkFoldersModal && (
        <ChooseJournalsModal
          isOpen={showBulkFoldersModal}
          onClose={() => {
            setShowBulkFoldersModal(false);
            clearSelection();
          }}
          selectedFolderIds={[]}
          onSave={async (fIds) => {
            await assignFolders(selectedList, fIds);
            toast.success('Journals updated');
          }}
        />
      )}

      {/* Organise Unsorted Entries Modal */}
      <OrganiseUnsortedModal
        isOpen={showOrganiseModal}
        onClose={() => setShowOrganiseModal(false)}
        entries={entries}
      />

      {/* Share Entry Sheet */}
      {shareEntry && (
        <ShareSheet
          isOpen={Boolean(shareEntry)}
          onClose={() => setShareEntry(null)}
          entry={shareEntry}
          onOpenActivity={(sId) => {
            setShareEntry(null);
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

      {/* Global Confirmation Sheet */}
      <ConfirmSheet
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Apple-style Insights Bottom Sheet */}
      <InsightsSheet
        isOpen={showInsightsSheet}
        onClose={() => setShowInsightsSheet(false)}
        onSelectDateFilter={(d) => setDateFilter(d)}
      />
    </div>
  );
};
