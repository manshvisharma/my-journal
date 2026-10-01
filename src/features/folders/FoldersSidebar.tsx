import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  Bookmark,
  Inbox,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { Folder } from '../../types';
import {
  useFoldersTree,
  useTotalCounts,
  type FolderNode,
} from '../../store/selectors';
import { renderFolderIcon } from '../../ui/IconPicker';
import { FolderModal } from './FolderModal';

interface FoldersSidebarProps {
  activeView: string;
  onSelectView: (view: string, title: string) => void;
  onOpenSearch: () => void;
}

export const FoldersSidebar: React.FC<FoldersSidebarProps> = ({
  activeView,
  onSelectView,
  onOpenSearch,
}) => {
  const foldersTree = useFoldersTree();
  const { allCount, bookmarksCount, unsortedCount, trashCount } = useTotalCounts();

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedFolderIds);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolderIds(next);
  };

  const renderFolderItem = (node: FolderNode, level = 0) => {
    const isExpanded = expandedFolderIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = activeView === node.id;

    return (
      <React.Fragment key={node.id}>
        <div
          onClick={() => onSelectView(node.id, node.name)}
          style={{ paddingLeft: `${16 + level * 18}px` }}
          className={`group flex items-center justify-between py-2.5 pr-4 rounded-2xl cursor-pointer transition ${
            isSelected
              ? 'bg-app-accent-tint text-app-text-primary font-semibold'
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-primary'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 -ml-1 text-app-text-secondary hover:text-app-text-primary"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: node.color }}
            >
              {renderFolderIcon(node.icon, 'w-4 h-4 text-white')}
            </div>

            <span className="text-sm truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-app-text-secondary">{node.entryCount}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFolderToEdit(node);
                setShowFolderModal(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-app-text-secondary hover:text-app-text-primary transition"
              title="Edit Journal"
            >
              ⋯
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderFolderItem(child, level + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-app-card border-r border-app-card-border select-none text-app-text-primary">
      {/* Top Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">
          <span>Journals</span>
        </h1>

        <div className="flex items-center gap-1.5">
          {/* Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="circle-btn w-9 h-9"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* New Journal Button */}
          <button
            type="button"
            onClick={() => {
              setFolderToEdit(null);
              setShowFolderModal(true);
            }}
            className="circle-btn w-9 h-9"
            title="New Journal"
            aria-label="New Journal"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Folders List Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-4">
        {/* Main Smart Views */}
        <div className="space-y-1">
          {/* All Entries */}
          <div
            onClick={() => onSelectView('all', 'All Entries')}
            className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition ${
              activeView === 'all'
                ? 'bg-app-accent-tint text-app-text-primary font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5856D6] flex items-center justify-center text-white shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">All Entries</span>
            </div>
            <span className="text-xs font-semibold text-app-text-secondary">{allCount}</span>
          </div>

          {/* Bookmarks */}
          <div
            onClick={() => onSelectView('bookmarks', 'Bookmarks')}
            className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition ${
              activeView === 'bookmarks'
                ? 'bg-app-accent-tint text-app-text-primary font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-primary'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF9500] flex items-center justify-center text-white shadow-sm">
                <Bookmark className="w-4 h-4 fill-current" />
              </div>
              <span className="text-sm font-medium">Bookmarks</span>
            </div>
            <span className="text-xs font-semibold text-app-text-secondary">{bookmarksCount}</span>
          </div>

          {/* Unsorted */}
          {unsortedCount > 0 && (
            <div
              onClick={() => onSelectView('unsorted', 'Unsorted')}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition ${
                activeView === 'unsorted'
                  ? 'bg-app-accent-tint text-app-text-primary font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#8E8E93] flex items-center justify-center text-white shadow-sm">
                  <Inbox className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Unsorted</span>
              </div>
              <span className="text-xs font-semibold text-app-text-secondary">{unsortedCount}</span>
            </div>
          )}
        </div>

        {/* User Folders Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-4 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
              My Journals
            </span>
            <button
              type="button"
              onClick={() => {
                setFolderToEdit(null);
                setShowFolderModal(true);
              }}
              className="text-xs text-app-accent hover:opacity-80 flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-0.5">
            {foldersTree.map((folderNode) => renderFolderItem(folderNode))}
          </div>
        </div>

        {/* Trash / Recently Deleted */}
        <div className="pt-2">
          <div
            onClick={() => onSelectView('trash', 'Recently Deleted')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl cursor-pointer transition ${
              activeView === 'trash'
                ? 'bg-red-500/15 text-app-text-primary font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-secondary'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-app-text-secondary">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Recently Deleted</span>
            </div>
            <span className="text-xs font-semibold text-app-text-secondary">{trashCount}</span>
          </div>
        </div>
      </div>

      {/* Folder Create/Edit Modal */}
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        folderToEdit={folderToEdit}
      />
    </div>
  );
};
