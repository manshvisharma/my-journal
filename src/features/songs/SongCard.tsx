import React from 'react';
import { Music, ExternalLink, Trash2 } from 'lucide-react';
import type { SongAttachment } from '../../types';

interface SongCardProps {
  song: SongAttachment;
  editable?: boolean;
  onRemove?: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, editable = false, onRemove }) => {
  const getProviderColor = () => {
    switch (song.provider) {
      case 'spotify':
        return '#1DB954';
      case 'youtube':
        return '#FF0000';
      case 'apple-music':
        return '#FA2D48';
      default:
        return '#6B74F5';
    }
  };

  const getProviderName = () => {
    switch (song.provider) {
      case 'spotify':
        return 'Spotify';
      case 'youtube':
        return 'YouTube';
      case 'apple-music':
        return 'Apple Music';
      default:
        return 'Music';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/6 hover:bg-white/10 border border-white/10 my-2 transition group">
      <a
        href={song.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow"
          style={{ backgroundColor: `${getProviderColor()}25`, color: getProviderColor() }}
        >
          <Music className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider font-bold" style={{ color: getProviderColor() }}>
              {getProviderName()}
            </span>
            <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/80 transition" />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {song.title || song.url}
          </span>
          {song.artist && (
            <span className="text-xs text-white/60 truncate">{song.artist}</span>
          )}
        </div>
      </a>

      {editable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-xl transition ml-2"
          aria-label="Remove song"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
