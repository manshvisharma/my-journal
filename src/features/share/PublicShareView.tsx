import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Sparkles,
  AlertCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Music2,
  BookOpen,
  Type,
  Sun,
  Moon,
  Coffee,
  Share2,
} from 'lucide-react';
import type { ShareDoc, ShareMediaDoc } from '../../types/share';
import { shareRepository } from './shareRepository';
import { startViewerTracking, type ViewerTrackerHandle } from './tracking';
import { MoodFlowerGlyph } from '../list/MoodFlowerGlyph';

interface PublicShareViewProps {
  shareId: string;
}

type ReaderTheme = 'system' | 'sepia' | 'midnight';
type ReaderFont = 'sans' | 'serif';

export const PublicShareView: React.FC<PublicShareViewProps> = ({ shareId }) => {
  const [share, setShare] = useState<ShareDoc | null>(null);
  const [mediaList, setMediaList] = useState<ShareMediaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);

  // Reading Experience Customizations
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('system');
  const [readerFont, setReaderFont] = useState<ReaderFont>('sans');
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(1); // 0: compact, 1: standard, 2: large
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Optional friendly reader name prompt
  const [readerName, setReaderName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [trackerHandle, setTrackerHandle] = useState<ViewerTrackerHandle | null>(null);

  // Scroll Progress Listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const readingTime = useMemo(() => {
    if (!share) return 1;
    const words = share.wordCount || share.plainText?.split(/\s+/).length || 100;
    return Math.max(1, Math.ceil(words / 190));
  }, [share]);

  // Reader typography sizes
  const fontSizeClass = useMemo(() => {
    switch (fontSizeLevel) {
      case 0:
        return 'text-[16px] leading-[1.7]';
      case 2:
        return 'text-[20px] leading-[1.8]';
      case 1:
      default:
        return 'text-[18px] leading-[1.75]';
    }
  }, [fontSizeLevel]);

  // Reader theme colors
  const themeClasses = useMemo(() => {
    switch (readerTheme) {
      case 'sepia':
        return {
          wrapper: 'bg-[#FBF0D9] text-[#2C2416]',
          card: 'bg-[#F3E5C8] border-[#E8D4B0] text-[#2C2416]',
          secondaryText: 'text-[#6E5D43]',
          hairline: 'border-[#E8D4B0]',
          accent: '#A06E28',
          headerBg: 'bg-[#FBF0D9]/90',
        };
      case 'midnight':
        return {
          wrapper: 'bg-[#08080C] text-[#E4E4EB]',
          card: 'bg-[#15151F] border-[#222230] text-[#E4E4EB]',
          secondaryText: 'text-[#8E8EA0]',
          hairline: 'border-[#222230]',
          accent: '#8277FA',
          headerBg: 'bg-[#08080C]/90',
        };
      case 'system':
      default:
        return {
          wrapper: 'bg-[#F8F9FA] dark:bg-[#0C0B12] text-[#1C1C1E] dark:text-[#E8E8ED]',
          card: 'bg-white dark:bg-[#181724] border-black/[0.06] dark:border-white/[0.08] text-[#1C1C1E] dark:text-[#E8E8ED]',
          secondaryText: 'text-[#6E6E73] dark:text-[#98989F]',
          hairline: 'border-black/[0.08] dark:border-white/[0.08]',
          accent: '#7066F2',
          headerBg: 'bg-[#F8F9FA]/90 dark:bg-[#0C0B12]/90',
        };
    }
  }, [readerTheme]);

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-[#0C0B12] text-[#1C1C1E] dark:text-[#E8E8ED] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[680px] space-y-5 animate-pulse">
          <div className="h-4 w-36 bg-black/10 dark:bg-white/10 rounded-full" />
          <div className="h-9 w-3/4 bg-black/10 dark:bg-white/10 rounded-2xl" />
          <div className="h-48 w-full bg-black/10 dark:bg-white/10 rounded-3xl" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="h-4 w-11/12 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="h-4 w-4/5 bg-black/10 dark:bg-white/10 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Expired State
  if (isExpired) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-[#0C0B12] text-[#1C1C1E] dark:text-[#E8E8ED] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 stroke-[1.8]" />
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
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-[#0C0B12] text-[#1C1C1E] dark:text-[#E8E8ED] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 text-gray-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 stroke-[1.8]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">This link is not available</h1>
        <p className="text-sm opacity-60 max-w-sm leading-relaxed">
          The author has turned off sharing or the link has been removed.
        </p>
      </div>
    );
  }

  const dateStr = format(new Date(share.entryDate), 'EEEE, d MMMM yyyy');

  return (
    <div
      className={`min-h-screen w-full ${themeClasses.wrapper} transition-colors duration-200 flex flex-col`}
      style={{
        fontFamily:
          readerFont === 'serif'
            ? 'Charter, "New York", Georgia, Cambria, "Times New Roman", Times, serif'
            : '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
      }}
    >
      {/* Top Scroll Reading Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full bg-indigo-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Reading Navigation & Tools Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b ${themeClasses.hairline} ${themeClasses.headerBg} transition-colors duration-200`}
      >
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold font-mono">
              R
            </span>
            <span className="text-xs font-semibold tracking-wide uppercase opacity-75">
              Reverie Journal
            </span>
          </div>

          {/* Reader Preferences (Theme, Font, Font Size) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Font Serif / Sans Toggle */}
            <button
              type="button"
              onClick={() => setReaderFont((f) => (f === 'sans' ? 'serif' : 'sans'))}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium flex items-center gap-1 transition opacity-80 hover:opacity-100"
              title="Toggle Serif / Sans font"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{readerFont === 'sans' ? 'Serif' : 'Sans'}</span>
            </button>

            {/* Font Size Control */}
            <button
              type="button"
              onClick={() => setFontSizeLevel((l) => (l + 1) % 3)}
              className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold transition opacity-80 hover:opacity-100"
              title="Adjust text size"
            >
              {fontSizeLevel === 0 ? 'A' : fontSizeLevel === 1 ? 'A+' : 'A++'}
            </button>

            {/* Reading Theme Picker */}
            <div className="flex items-center bg-black/5 dark:bg-white/10 p-0.5 rounded-lg ml-1">
              <button
                type="button"
                onClick={() => setReaderTheme('system')}
                className={`p-1 rounded-md transition ${readerTheme === 'system' ? 'bg-white dark:bg-black/40 shadow-xs' : 'opacity-60'}`}
                title="Default Theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('sepia')}
                className={`p-1 rounded-md transition ${readerTheme === 'sepia' ? 'bg-[#F3E5C8] text-[#2C2416] shadow-xs' : 'opacity-60'}`}
                title="Warm Book Sepia"
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('midnight')}
                className={`p-1 rounded-md transition ${readerTheme === 'midnight' ? 'bg-[#15151F] text-indigo-400 shadow-xs' : 'opacity-60'}`}
                title="Midnight Dark"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Reader Name Prompt Banner (if enabled) */}
      {showNameInput && (
        <div className={`border-b ${themeClasses.hairline} px-4 py-2.5 flex items-center justify-between text-xs`}>
          <span className={themeClasses.secondaryText}>Enjoying this journal? Leave your name (optional):</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              placeholder="Your name"
              className="bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-lg text-xs outline-none w-32"
            />
            <button
              type="button"
              onClick={handleSaveReaderName}
              className="text-indigo-500 font-semibold px-2 py-1 hover:underline"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNameInput(false)}
              className="text-gray-400 hover:text-gray-600 px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Reading Article Container */}
      <main className="flex-1 w-full max-w-[720px] mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-20">
        {/* Entry Meta: Date & Reading Duration */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className={`text-[13px] font-semibold tracking-wider uppercase ${themeClasses.secondaryText}`}>
            {dateStr}
          </span>
          <span className={`text-[12px] font-medium flex items-center gap-1.5 ${themeClasses.secondaryText}`}>
            <BookOpen className="w-3.5 h-3.5" />
            <span>{readingTime} min read</span>
          </span>
        </div>

        {/* Title */}
        {share.title ? (
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.2] mb-6">
            {share.title}
          </h1>
        ) : null}

        {/* Attachment Chips: Mood, Location, Songs */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          {/* Mood Badge */}
          {share.mood && (
            <div className={`p-3 rounded-2xl border ${themeClasses.card} flex items-center gap-3 shadow-xs`}>
              <MoodFlowerGlyph valence={share.mood.valence} size={40} />
              <div>
                <div className="text-xs font-semibold">
                  {share.mood.labels.length > 0 ? share.mood.labels.join(', ') : 'State of Mind'}
                </div>
                {share.mood.impacts && share.mood.impacts.length > 0 && (
                  <div className={`text-[11px] ${themeClasses.secondaryText} mt-0.5`}>
                    {share.mood.impacts.join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Chip */}
          {share.location && share.location.name && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(share.location.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-3 rounded-2xl border ${themeClasses.card} flex items-center gap-2.5 shadow-xs hover:opacity-85 transition`}
              title="Open location in Maps"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold truncate max-w-[200px]">
                  {share.location.name}
                </div>
                <div className={`text-[10px] ${themeClasses.secondaryText}`}>View in Maps</div>
              </div>
            </a>
          )}

          {/* Songs Chip */}
          {share.songs && share.songs.length > 0 && (
            <div className={`p-3 rounded-2xl border ${themeClasses.card} flex items-center gap-2.5 shadow-xs`}>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                <Music2 className="w-4 h-4" />
              </div>
              <div className="max-w-[220px]">
                <div className="text-xs font-semibold truncate">
                  {share.songs[0].title || 'Soundtrack'}
                </div>
                <div className={`text-[10px] ${themeClasses.secondaryText} truncate`}>
                  {share.songs[0].artist || 'Attached song'}
                </div>
              </div>
              {share.songs[0].url && (
                <a
                  href={share.songs[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-indigo-500 hover:underline ml-1"
                >
                  Play
                </a>
              )}
            </div>
          )}
        </div>

        {/* Photos Gallery */}
        {mediaList.length > 0 && (
          <div
            className={`grid gap-3 mb-10 ${
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
                className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer shadow-sm group aspect-[4/3] border border-black/5 dark:border-white/10"
              >
                <img
                  src={m.thumb || m.full}
                  alt={`Journal photograph ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Elegant Editorial Divider */}
        <div className={`h-px w-full ${themeClasses.hairline} mb-10`} />

        {/* Journal Body Content with Clean Typography */}
        <article
          className={`prose prose-neutral dark:prose-invert max-w-none ${fontSizeClass} transition-all duration-150 font-normal`}
          dangerouslySetInnerHTML={{ __html: share.bodyHtml }}
        />

        {/* Flourish ending */}
        <div className="text-center py-12 text-sm opacity-40 select-none tracking-[0.5em]">
          ✦ ✦ ✦
        </div>
      </main>

      {/* Reader Footer */}
      <footer className={`py-8 text-center text-xs ${themeClasses.secondaryText} border-t ${themeClasses.hairline} mt-auto`}>
        <div className="flex items-center justify-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Written & Shared privately via Reverie</span>
        </div>
      </footer>

      {/* Immersive Photo Lightbox Modal */}
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
              type="button"
              onClick={() => setActivePhotoIdx(null)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition"
              aria-label="Close photo preview"
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
                type="button"
                onClick={() => setActivePhotoIdx(activePhotoIdx - 1)}
                className="absolute left-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={mediaList[activePhotoIdx].full || mediaList[activePhotoIdx].thumb}
              alt="Photo preview"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {activePhotoIdx < mediaList.length - 1 && (
              <button
                type="button"
                onClick={() => setActivePhotoIdx(activePhotoIdx + 1)}
                className="absolute right-2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="py-2 text-center text-xs text-white/40">
            Swipe or tap outside to close
          </div>
        </div>
      )}
    </div>
  );
};
