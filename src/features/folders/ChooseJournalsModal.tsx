import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useFoldersList } from '../../store/selectors';
import { renderFolderIcon } from '../../ui/IconPicker';
import { Sheet } from '../../ui/Sheet';
import { CONFIG } from '../../config';

interface ChooseJournalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFolderIds: string[];
  onSave: (folderIds: string[]) => void;
}

export const ChooseJournalsModal: React.FC<ChooseJournalsModalProps> = ({
  isOpen,
  onClose,
  selectedFolderIds,
  onSave,
}) => {
  const folders = useFoldersList();
  const [selected, setSelected] = useState<string[]>(selectedFolderIds);

  React.useEffect(() => {
    setSelected(selectedFolderIds.length > 0 ? selectedFolderIds : [CONFIG.defaultFolderId]);
  }, [selectedFolderIds, isOpen]);

  const toggleFolder = (folderId: string) => {
    setSelected((prev) => {
      if (prev.includes(folderId)) {
        const next = prev.filter((id) => id !== folderId);
        return next.length > 0 ? next : [CONFIG.defaultFolderId];
      } else {
        return [...prev, folderId];
      }
    });
  };

  const handleDone = () => {
    onSave(selected);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-4 text-app-text-primary select-none">
        <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold">Choose Journals</h3>
          <button
            type="button"
            onClick={handleDone}
            className="text-sm font-bold text-app-accent hover:opacity-80 transition"
          >
            Done
          </button>
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {folders.map((folder) => {
            const isChecked = selected.includes(folder.id);
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => toggleFolder(folder.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition ${
                  isChecked
                    ? 'bg-app-accent-tint text-app-text-primary'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-app-text-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: folder.color }}
                  >
                    {renderFolderIcon(folder.icon, 'w-4 h-4 text-white')}
                  </div>
                  <span className="font-medium text-[15px]">{folder.name}</span>
                </div>
                {isChecked && (
                  <div className="w-6 h-6 rounded-full bg-app-accent flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
};
