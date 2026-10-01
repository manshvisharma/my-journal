import React, { useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import type { Entry } from '../../types';
import { useJournalStore } from '../../store/useJournalStore';
import { useFoldersList } from '../../store/selectors';
import { renderFolderIcon } from '../../ui/IconPicker';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';

interface OrganiseUnsortedModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
}

export const OrganiseUnsortedModal: React.FC<OrganiseUnsortedModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  const folders = useFoldersList();
  const assignFolders = useJournalStore((state) => state.assignFolders);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  const currentEntry: Entry | undefined = entries[currentIndex];

  React.useEffect(() => {
    if (currentEntry) {
      setSelectedFolderIds(currentEntry.folderIds || []);
    }
  }, [currentEntry]);

  if (!currentEntry) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
        <div className="text-center py-8 text-app-text-primary select-none">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <h3 className="text-lg font-bold">All Organised!</h3>
          <p className="text-sm text-app-text-secondary mt-1 mb-6">
            There are no unsorted entries remaining.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-app-accent text-white text-sm font-semibold shadow-sm"
          >
            Done
          </button>
        </div>
      </Sheet>
    );
  }

  const toggleFolder = (folderId: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const handleSaveAndNext = async () => {
    try {
      if (selectedFolderIds.length > 0) {
        await assignFolders([currentEntry.id], selectedFolderIds);
      }
      toast.success('Entry organized');

      if (currentIndex < entries.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    } catch {
      toast.error('Failed to organize entry');
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-4 text-app-text-primary select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-xs uppercase tracking-wider text-app-text-secondary font-semibold">
            Organising {currentIndex + 1} of {entries.length}
          </span>

          <button
            type="button"
            onClick={handleSaveAndNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-app-accent text-white text-sm font-bold shadow hover:opacity-90 transition"
          >
            <span>{currentIndex < entries.length - 1 ? 'Next' : 'Done'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Entry Preview */}
        <div className="p-4 rounded-[18px] bg-app-card border border-app-card-border shadow-[var(--color-card-shadow)]">
          <h4 className="text-base font-bold text-app-text-primary mb-1.5 line-clamp-1">
            {currentEntry.title || 'Untitled Entry'}
          </h4>
          <p className="text-xs text-app-text-secondary line-clamp-3 leading-relaxed">
            {currentEntry.plainText || currentEntry.snippet || 'No text preview available.'}
          </p>
        </div>

        {/* Folder Chips */}
        <div>
          <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-2 block">
            Assign Journals
          </label>
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => {
              const isSelected = selectedFolderIds.includes(folder.id);
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  style={{
                    backgroundColor: isSelected ? folder.color : undefined,
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    isSelected
                      ? 'text-white shadow-md border-transparent'
                      : 'bg-app-card text-app-text-primary border-app-card-border hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {renderFolderIcon(folder.icon, 'w-3.5 h-3.5')}
                  <span>{folder.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
};
