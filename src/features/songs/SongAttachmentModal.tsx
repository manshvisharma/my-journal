import React, { useState } from 'react';
import { X, Music } from 'lucide-react';
import type { SongAttachment } from '../../types';
import { Sheet } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';

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
      <div className="flex flex-col gap-4 text-white select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Music className="w-4 h-4 text-[#8F97FF]" />
            <span>Add Song Link</span>
          </h3>
          <button
            type="button"
            onClick={handleAdd}
            className="text-sm font-bold text-[#8F97FF] hover:text-white transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold uppercase text-white/50 tracking-wider mb-1.5 block">
              Music URL (Spotify, YouTube, Apple Music)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://open.spotify.com/track/..."
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-white/50 tracking-wider mb-1.5 block">
              Song Title {isLoadingMeta && '(Fetching...)'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Iktara, Bohemian Rhapsody"
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-white/50 tracking-wider mb-1.5 block">
              Artist (Optional)
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Amit Trivedi, Queen"
              className="w-full bg-white/6 hover:bg-white/10 focus:bg-white/12 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6B74F5]"
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
};
