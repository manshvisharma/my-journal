import React, { useState } from 'react';
import { X, Plus, Hash } from 'lucide-react';
import { useTagsWithCounts } from '../../store/selectors';
import { Sheet } from '../../ui/Sheet';
import { Chip } from '../../ui/Chip';

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
  onSave: (tags: string[]) => void;
}

export const TagEditModal: React.FC<TagEditModalProps> = ({
  isOpen,
  onClose,
  tags,
  onSave,
}) => {
  const [currentTags, setCurrentTags] = useState<string[]>(tags);
  const [inputVal, setInputVal] = useState('');
  const allExistingTags = useTagsWithCounts();

  React.useEffect(() => {
    setCurrentTags(tags);
    setInputVal('');
  }, [tags, isOpen]);

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd || inputVal;
    const clean = raw.trim().toLowerCase().replace(/^#/, '');
    if (clean && !currentTags.includes(clean)) {
      setCurrentTags([...currentTags, clean]);
      setInputVal('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter((t) => t !== tagToRemove));
  };

  const handleDone = () => {
    onSave(currentTags);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-4 text-white select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold">Edit Tags</h3>
          <button
            type="button"
            onClick={handleDone}
            className="text-sm font-bold text-[#8F97FF] hover:text-white transition"
          >
            Done
          </button>
        </div>

        {/* Input field */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag..."
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddTag()}
            className="p-2.5 rounded-xl bg-[#6B74F5] hover:bg-[#7B84FF] text-white flex items-center justify-center transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Current entry tags */}
        <div>
          <label className="text-xs font-semibold uppercase text-white/50 tracking-wider mb-2 block">
            Current Tags ({currentTags.length})
          </label>
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl bg-white/4 border border-white/8">
            {currentTags.length === 0 ? (
              <span className="text-xs text-white/40 py-1">No tags assigned yet.</span>
            ) : (
              currentTags.map((tag) => (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  onRemove={() => handleRemoveTag(tag)}
                  selected
                />
              ))
            )}
          </div>
        </div>

        {/* Suggested existing tags */}
        {allExistingTags.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase text-white/50 tracking-wider mb-2 block">
              Suggested Tags
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {allExistingTags
                .filter(({ tag }) => !currentTags.includes(tag))
                .slice(0, 20)
                .map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    label={`#${tag} (${count})`}
                    onClick={() => handleAddTag(tag)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
