import React, { useState } from 'react';
import { X, Music } from 'lucide-react';
import type { SongAttachment } from '../../types';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';
import { haptics } from '../../lib/haptics';

interface SongAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: SongAttachment) => void;
}

export const SongAttachmentModal: React.FC<SongAttachmentModalProps> = ({
  isOpen,
  onClose,
  onAddSong,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  const detectProvider = (link: string): 'spotify' | 'youtube' | 'apple-music' | 'other' => {
    const l = link.toLowerCase();
    if (l.includes('spotify.com')) return 'spotify';
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
    if (l.includes('music.apple.com')) return 'apple-music';
    return 'other';
  };

  const handleUrlBlur = async () => {
    if (!url.trim()) return;
    const provider = detectProvider(url);

    // Best-effort oEmbed title lookup (never blocking UI)
    if (provider === 'youtube' && !title) {
      try {
        setIsLoadingMeta(true);
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title && !title) {
            setTitle(data.title);
          }
          if (data.author_name && !artist) {
            setArtist(data.author_name);
          }
        }
      } catch {
        // Fall back gracefully to manual fields
      } finally {
        setIsLoadingMeta(false);
      }
    }
  };

  const handleAdd = () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      toast.error('Please enter a song or music link');
      return;
    }

    haptics.selection();
    const provider = detectProvider(cleanUrl);
    onAddSong({
      url: cleanUrl,
      provider,
      title: title.trim() || undefined,
      artist: artist.trim() || undefined,
    });

    setUrl('');
    setTitle('');
    setArtist('');
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col gap-4 text-app-text-primary select-none">
        <div className="flex items-center justify-between pb-3 border-b border-app-hairline">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-app-text-secondary hover:text-app-text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold flex items-center gap-2 text-app-text-primary">
            <Music className="w-4 h-4 text-app-accent" />
            <span>Add Song Link</span>
          </h3>
          <button
            type="button"
            onClick={handleAdd}
            className="text-sm font-bold text-app-accent hover:opacity-80 transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-1.5 block">
              Music URL (Spotify, YouTube, Apple Music)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://open.spotify.com/track/..."
              className="w-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 focus:bg-transparent border border-app-card-border rounded-xl px-3 py-2.5 text-sm text-app-text-primary placeholder-app-text-tertiary focus:outline-none focus:ring-2 focus:ring-app-accent transition"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-1.5 block">
              Song Title {isLoadingMeta && '(Fetching...)'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Iktara, Bohemian Rhapsody"
              className="w-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 focus:bg-transparent border border-app-card-border rounded-xl px-3 py-2.5 text-sm text-app-text-primary placeholder-app-text-tertiary focus:outline-none focus:ring-2 focus:ring-app-accent transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-app-text-secondary tracking-wider mb-1.5 block">
              Artist (Optional)
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Amit Trivedi, Queen"
              className="w-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 focus:bg-transparent border border-app-card-border rounded-xl px-3 py-2.5 text-sm text-app-text-primary placeholder-app-text-tertiary focus:outline-none focus:ring-2 focus:ring-app-accent transition"
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
};
