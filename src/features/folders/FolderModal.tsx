import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Folder } from '../../types';
import { useJournalStore } from '../../store/useJournalStore';
import { useFoldersList } from '../../store/selectors';
import { ColorPicker } from '../../ui/ColorPicker';
import { IconPicker, renderFolderIcon } from '../../ui/IconPicker';
import { Sheet } from '../../ui/Sheet';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: Folder | null;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folderToEdit,
}) => {
  const saveFolder = useJournalStore((state) => state.saveFolder);
  const deleteFolder = useJournalStore((state) => state.deleteFolder);
  const folders = useFoldersList();

  const [name, setName] = useState(folderToEdit?.name || '');
  const [color, setColor] = useState(folderToEdit?.color || '#5856D6');
  const [icon, setIcon] = useState(folderToEdit?.icon || 'book-open');
  const [parentId, setParentId] = useState<string | null>(folderToEdit?.parentId || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state if folderToEdit changes
  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setColor(folderToEdit.color);
      setIcon(folderToEdit.icon);
      setParentId(folderToEdit.parentId);
    } else {
      setName('');
      setColor('#5856D6');
      setIcon('book-open');
      setParentId(null);
    }
  }, [folderToEdit, isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a journal name');
      return;
    }

    try {
      haptics.success();
      await saveFolder({
        id: folderToEdit?.id,
        name: trimmed,
        color,
        icon,
        parentId,
      });
      toast.success(folderToEdit ? 'Journal updated' : 'Journal created');
      onClose();
    } catch {
      toast.error('Failed to save journal');
    }
  };

  const handleDelete = () => {
    if (!folderToEdit) return;
    if (folderToEdit.isDefault) {
      toast.error('Default Journal cannot be deleted');
      return;
    }
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
        <div className="flex flex-col gap-5 text-app-text-primary select-none">
          {/* Top bar: ✕ (left), Title (center), ✓ (right, indigo) */}
          <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary hover:text-app-text-primary transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold text-app-text-primary">
              {folderToEdit ? 'Edit Journal' : 'New Journal'}
            </h3>

            <button
              type="button"
              onClick={handleSave}
              className="w-8 h-8 rounded-full bg-app-accent hover:bg-app-accent-light text-white flex items-center justify-center shadow-md transition active:scale-95"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Big circular icon preview */}
          <div className="flex flex-col items-center justify-center my-1">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-md transition-all duration-200"
              style={{ backgroundColor: color }}
            >
              {renderFolderIcon(icon, 'w-10 h-10 text-white')}
            </div>
          </div>

          {/* Centered name field */}
          <div className="flex justify-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Journal Name"
              maxLength={40}
              className="w-full max-w-sm text-center text-xl font-bold bg-app-card border border-app-card-border rounded-2xl py-3 px-4 text-app-text-primary placeholder-app-text-tertiary focus:outline-none focus:ring-2 focus:ring-app-accent"
              autoFocus
            />
          </div>

          {/* Parent Folder Picker */}
          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-1.5 block">
              Parent Journal (Optional)
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full bg-app-card border border-app-card-border rounded-xl px-3 py-2.5 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-app-accent"
            >
              <option value="" className="bg-app-card text-app-text-primary">
                None (Root Level)
              </option>
              {folders
                .filter((f) => f.id !== folderToEdit?.id)
                .map((f) => (
                  <option key={f.id} value={f.id} className="bg-app-card text-app-text-primary">
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Color swatches */}
          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-2 block">
              Colour
            </label>
            <ColorPicker selectedColor={color} onChange={setColor} />
          </div>

          {/* Icon picker grid */}
          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-2 block">
              Icon
            </label>
            <IconPicker selectedIcon={icon} onSelect={setIcon} accentColor={color} />
          </div>

          {/* Delete option if editing existing and not default */}
          {folderToEdit && !folderToEdit.isDefault && (
            <div className="pt-3 border-t border-app-hairline flex justify-center">
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm font-semibold text-app-destructive hover:opacity-80 py-2 px-4 rounded-xl hover:bg-red-500/10 transition"
              >
                Delete Journal
              </button>
            </div>
          )}
        </div>
      </Sheet>

      {/* Delete Folder Confirm Sheet */}
      {folderToEdit && (
        <ConfirmSheet
          isOpen={showDeleteConfirm}
          title={`Delete "${folderToEdit.name}"?`}
          description="Entries in this journal will NOT be deleted; they will remain in All Entries."
          confirmLabel="Delete Journal"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            try {
              await deleteFolder(folderToEdit.id);
              toast.info('Journal deleted');
              setShowDeleteConfirm(false);
              onClose();
            } catch {
              toast.error('Failed to delete journal');
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
};
