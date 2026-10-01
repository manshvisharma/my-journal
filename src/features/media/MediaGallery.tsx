import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { MediaRef } from '../../types';
import { repository } from '../../data/repository';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { haptics } from '../../lib/haptics';

export interface MediaGalleryProps {
  mediaRefs: MediaRef[];
  editable?: boolean;
  activeViewerIndex?: number | null;
  onCloseViewer?: () => void;
  onRemovePhoto?: (mediaId: string) => void;
  onIndexChange?: (index: number) => void;
  entryDate?: number;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaRefs,
  editable = false,
  activeViewerIndex: propViewerIndex = null,
  onCloseViewer,
  onRemovePhoto,
  onIndexChange,
  entryDate,
}) => {
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [internalViewerIndex, setInternalViewerIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Swipe & touch gesture tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeIndex = propViewerIndex !== null ? propViewerIndex : internalViewerIndex;

  useEffect(() => {
    if (!mediaRefs || mediaRefs.length === 0) return;
    mediaRefs.forEach(async (ref) => {
      if (!photoUrls.has(ref.id)) {
        const doc = await repository.getMedia(ref.id);
        if (doc) {
          setPhotoUrls((prev) => new Map(prev).set(ref.id, doc.full || doc.thumb));
        }
      }
    });
  }, [mediaRefs]);

  if (!mediaRefs || mediaRefs.length === 0) return null;

  const handleClose = () => {
    haptics.light();
    setZoomScale(1);
    setDragOffset({ x: 0, y: 0 });
    if (onCloseViewer) {
      onCloseViewer();
    } else {
      setInternalViewerIndex(null);
    }
  };

  const handleNext = () => {
    if (activeIndex !== null && activeIndex < mediaRefs.length - 1) {
      haptics.selection();
      setZoomScale(1);
      const next = activeIndex + 1;
      if (onIndexChange) onIndexChange(next);
      else setInternalViewerIndex(next);
    }
  };

  const handlePrev = () => {
    if (activeIndex !== null && activeIndex > 0) {
      haptics.selection();
      setZoomScale(1);
      const prev = activeIndex - 1;
      if (onIndexChange) onIndexChange(prev);
      else setInternalViewerIndex(prev);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Track vertical drag for swipe-down dismiss if not zoomed
    if (zoomScale === 1 && Math.abs(diffY) > Math.abs(diffX) && diffY > 0) {
      setDragOffset({ x: 0, y: diffY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - (touchStartYRef.current || 0);

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Swipe down to dismiss threshold
    if (dragOffset.y > 100) {
      handleClose();
      return;
    }
    setDragOffset({ x: 0, y: 0 });

    // Horizontal swipe between photos
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 60) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleDoubleTapZoom = () => {
    haptics.selection();
    setZoomScale((prev) => (prev > 1 ? 1 : 2.2));
  };

  const currentRef = activeIndex !== null ? mediaRefs[activeIndex] : null;
  const currentUrl = currentRef ? photoUrls.get(currentRef.id) : null;
  const photoDateStr = entryDate
    ? format(new Date(entryDate), 'EEEE, d MMMM \'at\' h:mm a')
    : 'Sunday, 6 September at 12:38 AM';

  return (
    <>
      {/* If in edit mode inside entry editor, show thumbnail grid */}
      {editable && (
        <div
          className={`grid gap-2 my-3.5 ${
            mediaRefs.length === 1
              ? 'grid-cols-1'
              : mediaRefs.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {mediaRefs.map((ref, idx) => {
            const url = photoUrls.get(ref.id);
            return (
              <div
                key={ref.id}
                className="relative group rounded-2xl overflow-hidden bg-black/20 aspect-4/3 cursor-pointer shadow-md"
                onClick={() => setInternalViewerIndex(idx)}
              >
                {url ? (
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-white/10" />
                )}

                {onRemovePhoto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(ref.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:text-red-400 hover:bg-black/80 transition backdrop-blur-md"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Full-Screen Photo Viewer (MATCHES USER SCREENSHOT 8 EXACTLY)         */}
      {/* -------------------------------------------------------------------- */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-[#000000] flex flex-col justify-between select-none pt-safe pb-safe"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Navigation Bar: "Close" (left) and Trash (right) */}
            <header className="h-14 flex items-center justify-between px-5 z-20 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="text-[17px] font-semibold text-app-accent hover:opacity-80 active:opacity-60 transition"
              >
                Close
              </button>

              {editable && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full text-app-accent hover:opacity-80 active:opacity-60 transition"
                aria-label="Delete photo"
              >
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </button>
              )}
            </header>

            {/* Centered Full-Width Image Container */}
            <div
              className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-2 sm:px-4"
              onDoubleClick={handleDoubleTapZoom}
              style={{
                transform: `translateY(${dragOffset.y}px)`,
                transition: dragOffset.y === 0 ? 'transform 0.2s ease-out' : 'none',
              }}
            >
              <div className="relative flex items-center justify-center max-w-full max-h-full">
                {currentUrl ? (
                  <motion.img
                    key={currentRef?.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: zoomScale }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    src={currentUrl}
                    alt="Journal Photo"
                    className="max-h-[65vh] sm:max-h-[72vh] max-w-full object-contain rounded-lg shadow-sm"
                    draggable={false}
                  />
                ) : (
                  <div className="w-64 h-64 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse flex items-center justify-center text-xs text-app-text-tertiary">
                    Loading…
                  </div>
                )}
                {activeIndex !== null && activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {activeIndex !== null && activeIndex < mediaRefs.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Photo Date Label Centered Below Image in Grey */}
              <div className="mt-4 sm:mt-6 text-center text-[13px] font-normal text-app-text-tertiary">
                {photoDateStr}
              </div>
            </div>

            {/* Bottom Translucent Page Dots Pill */}
            <footer className="pb-6 pt-2 flex items-center justify-center shrink-0 z-20">
              {mediaRefs.length > 1 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/10 dark:bg-white/15 backdrop-blur-md">
                  {mediaRefs.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-200 ${
                        i === activeIndex
                          ? 'w-2 bg-[#1C1C1E] dark:bg-white'
                          : 'w-2 bg-[#8E8E93]/60 dark:bg-[#8E8E93]/60'
                      }`}
                    />
                  ))}
                </div>
              )}
            </footer>

            {/* Delete Photo Confirmation Sheet */}
            <ConfirmSheet
              isOpen={showDeleteConfirm}
              title="Delete Photo?"
              description="This will permanently remove the photo from this entry."
              confirmLabel="Delete Photo"
              cancelLabel="Cancel"
              isDestructive={true}
              onConfirm={async () => {
                if (currentRef && onRemovePhoto) {
                  onRemovePhoto(currentRef.id);
                  handleClose();
                } else if (currentRef) {
                  await repository.deleteMedia(currentRef.id);
                  handleClose();
                }
                setShowDeleteConfirm(false);
              }}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
