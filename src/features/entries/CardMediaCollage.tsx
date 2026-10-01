import React from 'react';
import { format } from 'date-fns';
import { Music, Play } from 'lucide-react';
import type { MoodData, SongAttachment, MediaRef, MediaDoc } from '../../types';
import { MoodGlyph, getMoodTheme } from './MoodGlyph';
import { useMediaDocs } from './useMediaDocs';

interface CardMediaCollageProps {
  entryDate: number;
  mood: MoodData | null;
  mediaRefs: MediaRef[];
  songs: SongAttachment[];
  onOpenPhoto?: (photoIndex: number) => void;
}

export const CardMediaCollage: React.FC<CardMediaCollageProps> = ({
  entryDate,
  mood,
  mediaRefs = [],
  songs = [],
  onOpenPhoto,
}) => {
  const { docs: photoDocs } = useMediaDocs(mediaRefs);

  const hasMood = Boolean(mood);
  const totalMediaItems = photoDocs.length + songs.length;

  if (!hasMood && totalMediaItems === 0) {
    return null;
  }

  // Format labels: "Anxious, Sad and more"
  const formatList = (items?: string[]): string => {
    if (!items || items.length === 0) return '';
    if (items.length <= 2) return items.join(', ');
    return `${items.slice(0, 2).join(', ')} and more`;
  };

  const moodLabels = formatList(mood?.labels);
  const moodImpacts = formatList(mood?.impacts);
  const timeFormatted = format(new Date(entryDate), 'h:mm a');
  const moodTheme = mood ? getMoodTheme(mood.valence) : null;

  // 1. MOOD-ONLY ENTRY (Wide rounded banner)
  if (hasMood && totalMediaItems === 0 && moodTheme) {
    return (
      <div
        className="w-full rounded-[14px] p-3.5 sm:p-4 mb-3 flex items-center gap-3.5 transition-all select-none border"
        style={{
          background: 'var(--color-mood-banner-bg, var(--color-card-bg))',
          borderColor: 'var(--color-mood-border, var(--color-card-border))',
        }}
      >
        <div
          className="rounded-xl p-2 shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(255, 255, 255, 0.08)' }}
        >
          <MoodGlyph valence={mood!.valence} size={44} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-app-text-primary tracking-tight truncate">
            {moodLabels || moodTheme.name}
          </div>
          {moodImpacts && (
            <div className="text-[13px] text-app-text-secondary truncate mt-0.5">
              {moodImpacts}
            </div>
          )}
          <div className="text-[12px] text-app-text-tertiary mt-1">
            Emotion · {timeFormatted}
          </div>
        </div>
      </div>
    );
  }

  // Helper for rendering a photo item
  const renderPhotoTile = (photo: MediaDoc, index: number, isLast = false, extraCount = 0) => {
    return (
      <div
        key={photo.id || index}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenPhoto) onOpenPhoto(index);
        }}
        className="relative w-full h-full rounded-[12px] overflow-hidden bg-black/10 cursor-pointer group active:opacity-90 transition-opacity"
      >
        <img
          src={photo.thumb || photo.full}
          alt="Photo attachment"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {isLast && extraCount > 0 && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-lg select-none">
            +{extraCount}
          </div>
        )}
      </div>
    );
  };

  // Helper for rendering a song tile
  const renderSongTile = (song: SongAttachment, index: number) => {
    return (
      <div
        key={`song-${index}`}
        onClick={(e) => {
          e.stopPropagation();
          if (song.url) window.open(song.url, '_blank', 'noopener,noreferrer');
        }}
        className="relative w-full h-full rounded-[12px] overflow-hidden p-3 flex flex-col justify-between cursor-pointer select-none bg-gradient-to-br from-[#1DB954]/20 via-black/40 to-black/60 border border-white/10 active:opacity-90"
      >
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/80">
            <Play className="w-3 h-3 fill-current" />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white truncate leading-tight">
            {song.title || 'Song Attachment'}
          </p>
          <p className="text-[11px] text-white/70 truncate mt-0.5">
            {song.artist || song.provider}
          </p>
        </div>
      </div>
    );
  };

  // Combine photos and songs for the media grid
  const allMediaTiles: Array<{ type: 'photo' | 'song'; data: MediaDoc | SongAttachment; originalPhotoIndex: number }> = [];
  photoDocs.forEach((doc, idx) => {
    allMediaTiles.push({ type: 'photo', data: doc, originalPhotoIndex: idx });
  });
  songs.forEach((s) => {
    allMediaTiles.push({ type: 'song', data: s, originalPhotoIndex: -1 });
  });

  // 2. MOOD + OTHER MEDIA (Tile grid: Mood tile left, media items right)
  if (hasMood && totalMediaItems > 0 && moodTheme) {
    const rightTiles = allMediaTiles.slice(0, 3);
    const extraCount = allMediaTiles.length - 3;

    return (
      <div className="w-full mb-3 select-none">
        <div className="grid grid-cols-2 gap-1.5 aspect-[1.5/1] max-h-[220px]">
          {/* Left Column: Mood Tile (tall, labels top, glyph center, impacts bottom) */}
          <div
            className="rounded-[12px] p-3 flex flex-col items-center justify-between text-center overflow-hidden border"
            style={{
              background: 'var(--color-mood-banner-bg, var(--color-card-bg))',
              borderColor: 'var(--color-mood-border, var(--color-card-border))',
            }}
          >
            <div className="w-full truncate text-[13px] font-semibold text-app-text-primary">
              {moodLabels || moodTheme.name}
            </div>

            <div className="my-auto py-1">
              <MoodGlyph valence={mood!.valence} size={52} />
            </div>

            <div className="w-full">
              {moodImpacts ? (
                <div className="truncate text-[11px] text-app-text-secondary">
                  {moodImpacts}
                </div>
              ) : (
                <div className="truncate text-[11px] text-app-text-tertiary">
                  Emotion · {timeFormatted}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 1, 2, or 3+ media items */}
          <div className="w-full h-full overflow-hidden">
            {rightTiles.length === 1 && (
              <div className="w-full h-full">
                {rightTiles[0].type === 'photo'
                  ? renderPhotoTile(rightTiles[0].data as MediaDoc, rightTiles[0].originalPhotoIndex)
                  : renderSongTile(rightTiles[0].data as SongAttachment, 0)}
              </div>
            )}

            {rightTiles.length === 2 && (
              <div className="grid grid-rows-2 gap-1.5 h-full">
                {rightTiles.map((item, idx) => (
                  <div key={idx} className="w-full h-full overflow-hidden">
                    {item.type === 'photo'
                      ? renderPhotoTile(item.data as MediaDoc, item.originalPhotoIndex)
                      : renderSongTile(item.data as SongAttachment, idx)}
                  </div>
                ))}
              </div>
            )}

            {rightTiles.length >= 3 && (
              <div className="grid grid-rows-2 gap-1.5 h-full">
                {/* Top: 1 wide */}
                <div className="w-full h-full overflow-hidden">
                  {rightTiles[0].type === 'photo'
                    ? renderPhotoTile(rightTiles[0].data as MediaDoc, rightTiles[0].originalPhotoIndex)
                    : renderSongTile(rightTiles[0].data as SongAttachment, 0)}
                </div>
                {/* Bottom: 2 small side-by-side */}
                <div className="grid grid-cols-2 gap-1.5 h-full">
                  <div className="w-full h-full overflow-hidden">
                    {rightTiles[1].type === 'photo'
                      ? renderPhotoTile(rightTiles[1].data as MediaDoc, rightTiles[1].originalPhotoIndex)
                      : renderSongTile(rightTiles[1].data as SongAttachment, 1)}
                  </div>
                  <div className="w-full h-full overflow-hidden">
                    {rightTiles[2].type === 'photo'
                      ? renderPhotoTile(
                          rightTiles[2].data as MediaDoc,
                          rightTiles[2].originalPhotoIndex,
                          extraCount > 0,
                          extraCount
                        )
                      : renderSongTile(rightTiles[2].data as SongAttachment, 2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. PHOTOS / SONGS ONLY (No Mood)
  if (totalMediaItems === 1) {
    // 1 item: full-width image (max height ~210px, cover, radius 12)
    return (
      <div className="w-full mb-3 select-none">
        <div className="w-full max-h-[210px] h-[180px] sm:h-[210px] rounded-[12px] overflow-hidden">
          {allMediaTiles[0].type === 'photo'
            ? renderPhotoTile(allMediaTiles[0].data as MediaDoc, allMediaTiles[0].originalPhotoIndex)
            : renderSongTile(allMediaTiles[0].data as SongAttachment, 0)}
        </div>
      </div>
    );
  }

  if (totalMediaItems === 2) {
    // 2 items: side-by-side
    return (
      <div className="w-full mb-3 select-none">
        <div className="grid grid-cols-2 gap-1.5 h-[160px] sm:h-[180px]">
          {allMediaTiles.map((item, idx) => (
            <div key={idx} className="w-full h-full overflow-hidden">
              {item.type === 'photo'
                ? renderPhotoTile(item.data as MediaDoc, item.originalPhotoIndex)
                : renderSongTile(item.data as SongAttachment, idx)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3+ items: 1-wide on top, 2 small below
  const firstThree = allMediaTiles.slice(0, 3);
  const extraCount = allMediaTiles.length - 3;

  return (
    <div className="w-full mb-3 select-none">
      <div className="grid grid-rows-2 gap-1.5 h-[200px] sm:h-[220px]">
        {/* Top: 1 wide */}
        <div className="w-full h-full overflow-hidden">
          {firstThree[0].type === 'photo'
            ? renderPhotoTile(firstThree[0].data as MediaDoc, firstThree[0].originalPhotoIndex)
            : renderSongTile(firstThree[0].data as SongAttachment, 0)}
        </div>
        {/* Bottom: 2 small side-by-side */}
        <div className="grid grid-cols-2 gap-1.5 h-full">
          <div className="w-full h-full overflow-hidden">
            {firstThree[1].type === 'photo'
              ? renderPhotoTile(firstThree[1].data as MediaDoc, firstThree[1].originalPhotoIndex)
              : renderSongTile(firstThree[1].data as SongAttachment, 1)}
          </div>
          <div className="w-full h-full overflow-hidden">
            {firstThree[2].type === 'photo'
              ? renderPhotoTile(
                  firstThree[2].data as MediaDoc,
                  firstThree[2].originalPhotoIndex,
                  extraCount > 0,
                  extraCount
                )
              : renderSongTile(firstThree[2].data as SongAttachment, 2)}
          </div>
        </div>
      </div>
    </div>
  );
};
