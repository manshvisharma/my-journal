import React, { useRef, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link,
  RemoveFormatting,
} from 'lucide-react';
import { haptics } from '../lib/haptics';

interface AaPopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AaPopover: React.FC<AaPopoverProps> = ({ editor, isOpen, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  // Force re-render whenever selection or editor state changes so active states update immediately
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };
    editor.on('transaction', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
      editor.off('transaction', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !editor) return null;

  const setLink = () => {
    haptics.selection();
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter link URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-14 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 w-72 bg-app-card/95 backdrop-blur-2xl border border-app-card-border rounded-2xl shadow-2xl p-3 z-50 select-none text-app-text-primary"
    >
      {/* Hierarchy selection: Title, Heading, Subheading, Body */}
      <div className="flex items-center justify-between border-b border-app-hairline pb-2 mb-2 text-xs font-semibold text-app-text-secondary">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          }}
          className={`px-2.5 py-1.5 rounded-lg transition font-medium ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
        >
          Title
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
          className={`px-2.5 py-1.5 rounded-lg transition font-medium ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
        >
          Heading
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className={`px-2.5 py-1.5 rounded-lg transition font-medium ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
        >
          Subheading
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().setParagraph().run();
          }}
          className={`px-2.5 py-1.5 rounded-lg transition font-medium ${
            editor.isActive('paragraph')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
        >
          Body
        </button>
      </div>

      {/* Inline styles: Bold, Italic, Underline, Strikethrough */}
      <div className="grid grid-cols-4 gap-1 border-b border-app-hairline pb-2 mb-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleBold().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('bold')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleItalic().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('italic')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('underline')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleStrike().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('strike')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Lists & Blocks: bullets, numbers, checklist, quote, link, clear */}
      <div className="grid grid-cols-6 gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('bulletList')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('orderedList')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleTaskList().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('taskList')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().toggleBlockquote().run();
          }}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('blockquote')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={setLink}
          className={`p-2 rounded-xl flex items-center justify-center transition ${
            editor.isActive('link')
              ? 'bg-app-accent text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-app-text-primary'
          }`}
          title="Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            haptics.selection();
            editor.chain().focus().unsetAllMarks().clearNodes().run();
          }}
          className="p-2 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-app-text-secondary transition"
          title="Clear formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
