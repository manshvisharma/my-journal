import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Image as ImageIcon, Video, Bookmark, AudioLines, Navigation, AlignLeft, Mic } from 'lucide-react';
import { format } from 'date-fns';

import { useSearchStore } from '../../store/useSearchStore';
import type { SearchFilters } from '../../search/searchEngine';
import { haptics } from '../../lib/haptics';

interface SearchOverlayProps {
  onSelectEntry: (id: string) => void;
}

interface CategoryItem {
  id: string;
  label: string;
  filterKey: keyof SearchFilters;
  filterValue: unknown;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'bookmarked',
    label: 'Bookmarked',
    filterKey: 'bookmarked',
    filterValue: true,
    icon: <Bookmark className="w-5 h-5 stroke-[1.7]" />,
  },
  {
    id: 'photos',
    label: 'Photos',
    filterKey: 'hasPhotos',
    filterValue: true,
    icon: <ImageIcon className="w-5 h-5 stroke-[1.7]" />,
  },
  {
    id: 'videos',
    label: 'Videos',
    filterKey: 'hasVideos',
    filterValue: true,
    icon: <Video className="w-5 h-5 stroke-[1.7]" />,
  },
  {
    id: 'recorded_audio',
    label: 'Recorded Audio',
    filterKey: 'hasAudio',
    filterValue: true,
    icon: <AudioLines className="w-5 h-5 stroke-[1.7]" />,
  },
  {
    id: 'music_podcasts',
    label: 'Music & Podcasts',
    filterKey: 'hasSong',
    filterValue: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="7" height="16" rx="1.5" />
        <path d="M2 9h7M2 15h7" />
        <circle cx="5.5" cy="6.5" r="0.6" fill="currentColor" />
        <circle cx="5.5" cy="17.5" r="0.6" fill="currentColor" />
        <path d="M14 18V8l7-2v10" />
        <circle cx="12" cy="18" r="2" />
        <circle cx="19" cy="16" r="2" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    filterKey: 'hasActivity',
    filterValue: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="4.5" r="2" />
        <path d="M8 21l3-5 2.5 2 3.5 3" />
        <path d="M6 13l3.5-3.5L13 12l4-4" />
        <path d="M12 9.5l1.5 3.5-2.5 3" />
      </svg>
    ),
  },
  {
    id: 'reflections',
    label: 'Reflections',
    filterKey: 'hasReflections',
    filterValue: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21v-8" />
        <path d="M12 13c-3-3-3-7 0-9 3 2 3 6 0 9z" />
        <path d="M7 16c-2-1.5-2-4 0-5 2 1 2 3.5 0 5z" />
        <path d="M17 16c2-1.5 2-4 0-5-2 1-2 3.5 0 5z" />
        <path d="M5 21h14" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    id: 'places',
    label: 'Places',
    filterKey: 'hasLocation',
    filterValue: true,
    icon: <Navigation className="w-5 h-5 stroke-[1.7] rotate-45" />,
  },
  {
    id: 'state_of_mind',
    label: 'State of Mind',
    filterKey: 'hasMood',
    filterValue: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
        <circle cx="12" cy="3" r="1" fill="currentColor" />
        <circle cx="12" cy="21" r="1" fill="currentColor" />
        <circle cx="3" cy="12" r="1" fill="currentColor" />
        <circle cx="21" cy="12" r="1" fill="currentColor" />
        <path d="M6.3 6.3l2.2 2.2M15.5 15.5l2.2 2.2M6.3 17.7l2.2-2.2M15.5 8.5l2.2-2.2" />
        <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
        <circle cx="18.5" cy="18.5" r="1" fill="currentColor" />
        <circle cx="5.5" cy="18.5" r="1" fill="currentColor" />
        <circle cx="18.5" cy="5.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'text_only',
    label: 'Text Only',
    filterKey: 'textOnly',
    filterValue: true,
    icon: <AlignLeft className="w-5 h-5 stroke-[1.7]" />,
  },
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ onSelectEntry }) => {
  const isOpen = useSearchStore((state) => state.isOpen);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const clearFilters = useSearchStore((state) => state.clearFilters);
  const setFilter = useSearchStore((state) => state.setFilter);
  const results = useSearchStore((state) => state.results);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setActiveCategoryId(null);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd/Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          useSearchStore.getState().openSearch();
        }
      } else if (e.key === 'Escape' && isOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSearch]);

  if (!isOpen) return null;

  const handleClose = () => {
    haptics.selection();
    clearFilters();
    setActiveCategoryId(null);
    closeSearch();
  };

  const handleSelectEntry = (id: string) => {
    haptics.light();
    if (query.trim()) {
      addRecentSearch(query);
    }
    clearFilters();
    setActiveCategoryId(null);
    closeSearch();
    onSelectEntry(id);
  };

  const handleSelectRecent = (term: string) => {
    haptics.selection();
    setQuery(term);
  };

  const handleSelectCategory = (cat: CategoryItem) => {
    haptics.selection();
    if (activeCategoryId === cat.id) {
      // Toggle off
      setActiveCategoryId(null);
      clearFilters();
    } else {
      setActiveCategoryId(cat.id);
      clearFilters();
      setFilter(cat.filterKey, cat.filterValue);
    }
  };

  const handleClearCategory = () => {
    haptics.selection();
    setActiveCategoryId(null);
    clearFilters();
  };

  const handleVoiceSearch = () => {
    haptics.light();
    try {
      const windowObj = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
          start: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
          start: () => void;
        };
      };
      const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            setQuery(transcript);
            haptics.light();
          }
        };
        recognition.start();
      }
    } catch {
      // Ignore voice recognition errors
    }
  };

  const hasSearchOrFilter = Boolean(query.trim() || activeCategoryId);
  const activeCategory = CATEGORIES.find((c) => c.id === activeCategoryId);

  return (
    <div className="fixed inset-0 z-50 bg-[#FFFFFF] dark:bg-[#0B0813] text-black dark:text-white flex flex-col font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',system-ui,sans-serif] select-none">
      {/* Top Search Bar */}
      <div className="pt-safe px-4 pt-3 pb-3 border-b border-[#E5E5EA]/70 dark:border-[#221F2E] shrink-0">
        <div className="flex items-center gap-3">
          {/* Rounded Input Pill */}
          <div className="relative flex-1 flex items-center bg-[#E5E5EA]/70 dark:bg-[#1C1926] rounded-xl h-[38px] px-3 transition-colors">
            <Search className="w-4 h-4 text-[#8E8E93] mr-2 shrink-0 stroke-[2.2]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[17px] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none font-normal"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setQuery('');
                }}
                className="p-0.5 rounded-full bg-[#8E8E93]/60 text-white dark:text-black mr-1.5 active:opacity-70"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className="text-[#8E8E93] active:text-[#5E5CE6] transition-colors p-0.5"
              aria-label="Dictate search"
            >
              <Mic className="w-[18px] h-[18px] stroke-[1.8]" />
            </button>
          </div>

          {/* iOS Purple Cancel Button */}
          <button
            type="button"
            onClick={handleClose}
            className="text-[17px] font-normal text-[#5E5CE6] dark:text-[#7D7AFF] active:opacity-60 transition shrink-0"
          >
            Cancel
          </button>
        </div>

        {/* Active Category Filter Tag if selected */}
        {activeCategory && (
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E5E5EA]/50 dark:border-[#221F2E]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5E5CE6]/12 dark:bg-[#7D7AFF]/18 text-[#5E5CE6] dark:text-[#7D7AFF] text-[13px] font-medium">
              <span className="shrink-0">{activeCategory.icon}</span>
              <span>{activeCategory.label}</span>
              <button
                type="button"
                onClick={handleClearCategory}
                className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleClearCategory}
              className="text-[14px] text-[#5E5CE6] dark:text-[#7D7AFF] font-medium"
            >
              Clear Category
            </button>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
        {/* Default View: Recently Searched + Categories */}
        {!hasSearchOrFilter ? (
          <div className="px-4 py-2">
            {/* Section 1: Recently Searched */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between pt-3 pb-2">
                  <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight">
                    Recently Searched
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      clearRecentSearches();
                    }}
                    className="text-[17px] font-normal text-[#5E5CE6] dark:text-[#7D7AFF] active:opacity-60 transition"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex flex-col">
                  {recentSearches.slice(0, 5).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectRecent(term)}
                      className="w-full flex items-center py-3.5 border-b border-[#E5E5EA]/80 dark:border-[#221F2E] active:bg-black/5 dark:active:bg-white/5 transition-colors text-left"
                    >
                      <Search className="w-[18px] h-[18px] text-black dark:text-white mr-3.5 shrink-0 stroke-[2]" />
                      <span className="text-[17px] font-normal text-black dark:text-white">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Categories */}
            <div className="mb-8">
              <div className="pt-2 pb-2">
                <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight">
                  Categories
                </h2>
              </div>

              <div className="flex flex-col">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full flex items-center py-3.5 border-b border-[#E5E5EA]/80 dark:border-[#221F2E] active:bg-black/5 dark:active:bg-white/5 transition-colors text-left"
                  >
                    <span className="w-5 h-5 text-black dark:text-white mr-3.5 shrink-0 flex items-center justify-center">
                      {cat.icon}
                    </span>
                    <span className="text-[17px] font-normal text-black dark:text-white">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="px-4 py-4">
            <div className="flex items-center justify-between text-[14px] text-neutral-500 font-medium mb-3">
              <span>
                {results.length} {results.length === 1 ? 'entry' : 'entries'} found
              </span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-20 text-neutral-400">
                <p className="text-[18px] font-semibold text-black dark:text-white mb-1">
                  No matching entries
                </p>
                <p className="text-[15px]">
                  Try searching with different terms or clear active filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(({ entry, matchHighlights }) => (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectEntry(entry.id)}
                    className="p-4 rounded-[18px] bg-[#F7F7FA] dark:bg-[#171420] border border-[#E5E5EA]/80 dark:border-[#252233] cursor-pointer active:scale-[0.99] transition shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[13px] text-neutral-500 mb-1">
                      <span>{format(new Date(entry.entryDate), 'EEEE, d MMM yyyy')}</span>
                      {entry.bookmarked && (
                        <Bookmark className="w-3.5 h-3.5 fill-[#5E5CE6] text-[#5E5CE6] dark:fill-[#7D7AFF] dark:text-[#7D7AFF]" />
                      )}
                    </div>

                    <h4 className="text-[17px] font-semibold text-black dark:text-white mb-1 tracking-tight">
                      {entry.title || 'Untitled Entry'}
                    </h4>

                    {/* Snippet preview */}
                    <p
                      className="text-[14px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html: matchHighlights || entry.snippet || 'No text preview',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
