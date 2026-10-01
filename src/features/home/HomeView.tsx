import React, { useState } from 'react';
import {
  Search,
  MoreHorizontal,
  Plus,
  BookOpen,
  Bookmark,
  Inbox,
  ChevronRight,
  ChevronDown,
  Trash2,
  FolderPlus,
  ArrowUpDown,
  CheckSquare,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useFoldersTree, useTotalCounts, type FolderNode } from '../../store/selectors';
import { useJournalStore } from '../../store/useJournalStore';
import { renderFolderIcon } from '../../ui/IconPicker';
import { Menu, type MenuItem } from '../../ui/Menu';
import { HomeInsightsCard } from './HomeInsightsCard';
import { FolderModal } from '../folders/FolderModal';
import type { Folder } from '../../types';
import { haptics } from '../../lib/haptics';

interface HomeViewProps {
  onSelectView: (view: string, title: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onNewEntry: () => void;
  onSelectEntries: () => void;
  onOpenInsights: () => void;
  hideFab?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectView,
  onOpenSearch,
  onOpenSettings,
  onNewEntry,
  onSelectEntries,
  onOpenInsights,
  hideFab = false,
}) => {
  const foldersTree = useFoldersTree();
  const { allCount, bookmarksCount, unsortedCount } = useTotalCounts();
  const settings = useJournalStore((state) => state.settings);
  const updateSettings = useJournalStore((state) => state.updateSettings);

  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: newTheme });
  };

  const menuItems: MenuItem[] = [
    {
      id: 'new-journal',
      label: 'New Journal',
      icon: <FolderPlus className="w-4 h-4" />,
      onClick: () => {
        setFolderToEdit(null);
        setShowFolderModal(true);
      },
    },
    {
      id: 'trash',
      label: 'Recently Deleted',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => onSelectView('trash', 'Recently Deleted'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-4 h-4" />,
      dividerAbove: true,
      onClick: onOpenSettings,
    },
  ];

  // Theme segmented header control in the menu
  const themeHeader = (
    <div className="flex flex-col gap-1.5 px-1 py-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-app-text-secondary">
        Appearance
      </span>
      <div className="grid grid-cols-3 gap-1 bg-app-bg/80 p-1 rounded-xl border border-app-hairline">
        <button
          type="button"
          onClick={() => handleThemeChange('light')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            settings.theme === 'light'
              ? 'bg-app-card text-app-text-primary shadow-sm'
              : 'text-app-text-secondary hover:text-app-text-primary'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => handleThemeChange('dark')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            settings.theme === 'dark'
              ? 'bg-app-card text-app-text-primary shadow-sm'
              : 'text-app-text-secondary hover:text-app-text-primary'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => handleThemeChange('system')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            settings.theme === 'system'
              ? 'bg-app-card text-app-text-primary shadow-sm'
              : 'text-app-text-secondary hover:text-app-text-primary'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Auto</span>
        </button>
      </div>
    </div>
  );

  const renderFolderRow = (node: FolderNode, isSubfolder = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.id);

    return (
      <React.Fragment key={node.id}>
        <div
          onClick={() => {
            haptics.selection();
            onSelectView(node.id, node.name);
          }}
          className={`group flex items-center justify-between py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors ${
            isSubfolder ? 'pl-14 pr-4' : 'px-4'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {hasChildren && !isSubfolder ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 -ml-1 text-app-text-secondary hover:text-app-text-primary transition"
                aria-label="Toggle subfolders"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : null}

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: node.color || '#5856D6' }}
            >
              {renderFolderIcon(node.icon, 'w-4 h-4 text-white')}
            </div>

            <span className="text-[17px] text-app-text-primary font-normal truncate">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[17px] text-app-text-secondary font-normal">
              {node.entryCount}
            </span>
            <ChevronRight className="w-4 h-4 text-app-text-tertiary" />
          </div>
        </div>

        {/* Child Subfolders (one level of nesting) */}
        {hasChildren && (isExpanded || true) && (
          <div className="border-t border-app-hairline">
            {node.children.map((child, idx) => (
              <React.Fragment key={child.id}>
                {idx > 0 && <div className="h-px bg-app-hairline ml-14" />}
                {renderFolderRow(child, true)}
              </React.Fragment>
            ))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div
      onScroll={(e) => {
        const scrolled = e.currentTarget.scrollTop > 24;
        if (scrolled !== isScrolled) setIsScrolled(scrolled);
      }}
      className="relative flex flex-col h-full w-full overflow-y-auto overscroll-contain select-none"
    >
      {/* Sticky Top Navigation Bar with Blur and Transitioning Title */}
      <header
        className={`sticky top-0 z-30 px-5 pt-safe transition-all duration-200 ${
          isScrolled
            ? 'bg-app-bg/85 backdrop-blur-xl border-b border-app-hairline shadow-xs'
            : 'bg-transparent'
        }`}
      >
        <div className="h-14 flex items-center justify-between max-w-2xl mx-auto w-full">
          {/* Scrolled Small Inline Title */}
          <div className="flex items-center">
            <h1
              className={`text-[17px] font-semibold text-app-text-primary transition-opacity duration-200 ${
                isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              Journal
            </h1>
          </div>

          {/* Top Right Action Buttons: Circular Search & ••• */}
          <div className="flex items-center gap-3">
            {/* Circular Search Button */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="circle-btn"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Circular ••• Button with iOS Popover Menu */}
            <Menu
              trigger={(isOpen) => (
                <button
                  type="button"
                  className={`circle-btn ${isOpen ? 'ring-2 ring-app-accent/40' : ''}`}
                  aria-label="Options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              )}
              items={menuItems}
              headerContent={themeHeader}
              align="right"
            />
          </div>
        </div>
      </header>

      {/* Main Home Scrollable Body */}
      <main className="flex-1 px-5 pb-28 max-w-2xl w-full mx-auto space-y-7">
        {/* Large Page Title "Journal" */}
        <div className="pt-2 pb-1">
          <h1 className="text-[34px] font-bold tracking-[-0.4px] text-app-text-primary leading-tight">
            Journal
          </h1>
        </div>

        {/* 1. Insights summary card */}
        <HomeInsightsCard onOpen={onOpenInsights} />

        {/* 2. Journals Section (Grouped List) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[22px] font-semibold text-app-text-primary tracking-tight">
              Journals
            </h2>
            <button
              type="button"
              onClick={() => {
                setFolderToEdit(null);
                setShowFolderModal(true);
              }}
              className="text-[15px] font-medium text-app-accent hover:opacity-80 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {/* iOS Grouped Inset Card */}
          <div className="rounded-[18px] overflow-hidden bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)] divide-y divide-app-hairline">
            {/* All Entries */}
            <div
              onClick={() => onSelectView('all', 'All Entries')}
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#5856D6] flex items-center justify-center text-white shadow-sm">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-[17px] text-app-text-primary font-normal">
                  All Entries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[17px] text-app-text-secondary font-normal">{allCount}</span>
                <ChevronRight className="w-4 h-4 text-app-text-tertiary" />
              </div>
            </div>

            {/* Bookmarks */}
            <div
              onClick={() => onSelectView('bookmarks', 'Bookmarks')}
              className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-[#FF9500] flex items-center justify-center text-white shadow-sm">
                  <Bookmark className="w-4 h-4 fill-current" />
                </div>
                <span className="text-[17px] text-app-text-primary font-normal">
                  Bookmarks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[17px] text-app-text-secondary font-normal">
                  {bookmarksCount}
                </span>
                <ChevronRight className="w-4 h-4 text-app-text-tertiary" />
              </div>
            </div>

            {/* Custom Folders / Journals (one level of nesting) */}
            {foldersTree.map((folderNode) => renderFolderRow(folderNode))}

            {/* Unsorted (only if unsortedCount > 0) */}
            {unsortedCount > 0 && (
              <div
                onClick={() => onSelectView('unsorted', 'Unsorted')}
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#8E8E93] flex items-center justify-center text-white shadow-sm">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <span className="text-[17px] text-app-text-primary font-normal">
                    Unsorted
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] text-app-text-secondary font-normal">
                    {unsortedCount}
                  </span>
                  <ChevronRight className="w-4 h-4 text-app-text-tertiary" />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {!hideFab && (
      <button
        type="button"
        onClick={onNewEntry}
        className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-5 w-[52px] h-[52px] rounded-full bg-app-accent hover:bg-app-accent-light active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 z-40 transition-transform"
        aria-label="New Entry"
      >
        <Plus className="w-[22px] h-[22px] stroke-[2.5]" />
      </button>
      )}

      {/* Folder Create/Edit Modal */}
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        folderToEdit={folderToEdit}
      />
    </div>
  );
};
