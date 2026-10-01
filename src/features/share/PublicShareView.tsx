import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Sparkles, AlertCircle, Clock, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ShareDoc, ShareMediaDoc } from '../../types/share';
import { shareRepository } from './shareRepository';
import { startViewerTracking, type ViewerTrackerHandle } from './tracking';
import { MoodFlowerGlyph } from '../list/MoodFlowerGlyph';

interface PublicShareViewProps {
  shareId: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ shareId }) => {
  const [share, setShare] = useState<ShareDoc | null>(null);
  const [mediaList, setMediaList] = useState<ShareMediaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);

  // Optional friendly reader name prompt
  const [readerName, setReaderName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [trackerHandle, setTrackerHandle] = useState<ViewerTrackerHandle | null>(null);

  // Check if viewing user is the signed-in owner
  const isOwnerViewing = false;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const shareData = await shareRepository.getShare(shareId);

      if (!active) return;

      if (!shareData || !shareData.active) {
        setIsUnavailable(true);
        setLoading(false);
        return;
      }

      // Check expiration
      if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
        setIsExpired(true);
        setLoading(false);
        return;
      }

      setShare(shareData);

      // Load media if included
      if (shareData.includePhotos) {
        const media = await shareRepository.getShareMediaList(shareId);
        if (active) setMediaList(media);
      }

      setLoading(false);

      // Get optional recipient code from URL search param ?r=code
      const searchParams = new URLSearchParams(window.location.search);
      const recipientCode = searchParams.get('r');

      // Start silent viewer tracking
      const tracker = await startViewerTracking(shareData, recipientCode);
      if (active) {
        setTrackerHandle(tracker);
        if (shareData.allowNamePrompt && !recipientCode) {
          setShowNameInput(true);
        }
      }
    }

    load();

    return () => {
      active = false;
      if (trackerHandle) trackerHandle.stop();
    };
  }, [shareId]);

  const handleSaveReaderName = async () => {
    if (readerName.trim() && trackerHandle) {
      await trackerHandle.updateLabel(readerName.trim());
      setShowNameInput(false);
    }
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F2F2F7] dark:bg-[#0A0A0E] text-[#1C1C1E] dark:text-[#E2E8F0] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[640px] space-y-4 animate-pulse">
          <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded-full" />
          <div className="h-8 w-3/4 bg-black/10 dark:bg-white/10 rounded-xl" />
          <div className="h-44 w-full bg-black/10 dark:bg-white/10 rounded-2xl" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="h-4 w-5/6 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="h-4 w-4/6 bg-black/10 dark:bg-white/10 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Expired State
  if (isExpired) {
    return (
      <div className="min-h-screen w-full bg-[#F2F2F7] dark:bg-[#0A0A0E] text-[#1C1C1E] dark:text-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">This link has expired</h1>
        <p className="text-sm opacity-60 max-w-sm leading-relaxed">
          The shared journal entry is no longer available because the link expiration time has passed.
        </p>
      </div>
    );
  }

  // 3. Unavailable / Inactive State
  if (isUnavailable || !share) {
    return (
      <div className="min-h-screen w-full bg-[#F2F2F7] dark:bg-[#0A0A0E] text-[#1C1C1E] dark:text-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 text-gray-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">This link is no longer available</h1>
        <p className="text-sm opacity-60 max-w-sm leading-relaxed">
          The author has turned off sharing or the link has been removed.
        </p>
      </div>
    );
  }

  const dateStr = format(new Date(share.entryDate), 'EEEE, d MMMM yyyy');

  return (
    <div className="min-h-screen w-full bg-[#F9F9FB] dark:bg-[#0C0B12] text-[#1C1C1E] dark:text-[#EDEDF2] font-sans antialiased flex flex-col">
      {/* Top Banner (Owner Preview or Name Prompt) */}
      {isOwnerViewing && (
        <div className="bg-indigo-600 text-white text-xs font-semibold py-2 px-4 text-center sticky top-0 z-30 shadow-sm flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Owner Preview · Your views are not counted</span>
        </div>
      )}

      {/* Optional Reader Name Prompt */}
      {showNameInput && (
        <div className="bg-app-card/95 dark:bg-[#1E1C28]/95 border-b border-app-hairline px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <span className="text-app-text-secondary">Who is reading? (optional)</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              placeholder="Your name"
              className="bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-lg text-xs outline-none w-28"
            />
            <button
              type="button"
              onClick={handleSaveReaderName}
              className="text-app-accent font-semibold px-2 py-1 hover:underline"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNameInput(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Article (Max 680px) */}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
        {/* Date */}
        <div className="text-[14px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
          {dateStr}
        </div>

        {/* Title */}
        {share.title ? (
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-6 text-[#1C1C1E] dark:text-[#FFFFFF]">
            {share.title}
          </h1>
        ) : null}

        {/* Optional Mood Banner */}
        {share.mood && (
          <div className="mb-6 p-4 rounded-2xl bg-black/4 dark:bg-white/6 border border-black/6 dark:border-white/10 flex items-center gap-4">
            <MoodFlowerGlyph valence={share.mood.valence} size={48} />
            <div>
              <div className="text-sm font-semibold">
                {share.mood.labels.length > 0 ? share.mood.labels.join(', ') : 'State of Mind'}
              </div>
              {share.mood.impacts.length > 0 && (
                <div className="text-xs opacity-70 mt-0.5">{share.mood.impacts.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Photos Gallery */}
        {mediaList.length > 0 && (
          <div
            className={`grid gap-3 mb-8 ${
              mediaList.length === 1
                ? 'grid-cols-1'
                : mediaList.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {mediaList.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => setActivePhotoIdx(idx)}
                className="relative rounded-2xl overflow-hidden bg-black/10 cursor-pointer shadow-sm group aspect-[4/3]"
              >
                <img
                  src={m.thumb || m.full}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Hairline Divider */}
        <div className="h-px w-full bg-black/10 dark:bg-white/10 mb-8" />

        {/* Body Text */}
        <div
          className="text-[17px] leading-[1.65] text-[#2C2C2E] dark:text-[#D1D1D6] font-normal selection:bg-indigo-500/20"
          dangerouslySetInnerHTML={{ __html: share.bodyHtml }}
        />
      </main>

      {/* Public Page Footer */}
      <footer className="py-8 text-center text-xs text-[#8E8E93] border-t border-black/6 dark:border-white/6 mt-auto">
        <div className="flex items-center justify-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Shared from Reverie · Views on this page are counted</span>
        </div>
      </footer>

      {/* Full-Screen Photo Viewer for public viewers */}
      {activePhotoIdx !== null && mediaList[activePhotoIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-2xl select-none"
          onClick={() => setActivePhotoIdx(null)}
        >
          <div className="flex justify-between items-center text-white/80 py-2">
            <span className="text-sm font-semibold">
              {activePhotoIdx + 1} of {mediaList.length}
            </span>
            <button
              onClick={() => setActivePhotoIdx(null)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {activePhotoIdx > 0 && (
              <button
                onClick={() => setActivePhotoIdx(activePhotoIdx - 1)}
                className="absolute left-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={mediaList[activePhotoIdx].full || mediaList[activePhotoIdx].thumb}
              alt="Photo preview"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            {activePhotoIdx < mediaList.length - 1 && (
              <button
                onClick={() => setActivePhotoIdx(activePhotoIdx + 1)}
                className="absolute right-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="py-2 text-center text-xs text-white/40">
            Tap outside to close
          </div>
        </div>
      )}
    </div>
  );
};
