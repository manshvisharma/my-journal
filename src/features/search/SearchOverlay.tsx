import React, { useEffect, useRef } from 'react';
import { Search, X, Image as ImageIcon, Music, Smile, Bookmark, Clock } from 'lucide-react';
import { format } from 'date-fns';

import { useSearchStore } from '../../store/useSearchStore';
import { useFoldersList } from '../../store/selectors';
import { Chip } from '../../ui/Chip';

interface SearchOverlayProps {
  onSelectEntry: (id: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ onSelectEntry }) => {
  const isOpen = useSearchStore((state) => state.isOpen);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const filters = useSearchStore((state) => state.filters);
  const setFilter = useSearchStore((state) => state.setFilter);
  const clearFilters = useSearchStore((state) => state.clearFilters);
  const results = useSearchStore((state) => state.results);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);

  const folders = useFoldersList();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
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

  const handleSelect = (id: string) => {
    if (query.trim()) {
      addRecentSearch(query);
    }
    closeSearch();
    onSelectEntry(id);
  };

  const handleRunRecent = (term: string) => {
    setQuery(term);
  };

  return (
    <div className="fixed inset-0 z-50 bg-app-bg/95 backdrop-blur-2xl flex flex-col text-app-text-primary select-none">
      {/* Search Header Bar */}
      <div className="p-4 sm:p-6 border-b border-app-hairline shrink-0 pt-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-app-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entries, thoughts, Hindi/Hinglish…"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-app-card border border-app-card-border text-[17px] text-app-text-primary placeholder-app-text-tertiary focus:outline-none focus:ring-2 focus:ring-app-accent transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-app-text-secondary hover:text-app-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={closeSearch}
            className="px-3 py-2 rounded-xl text-[15px] font-semibold text-app-accent hover:opacity-80 transition"
          >
            Cancel
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto pt-3.5 pb-1 scrollbar-none">
          <Chip
            label="Has photos"
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            selected={Boolean(filters.hasPhotos)}
            onClick={() => setFilter('hasPhotos', !filters.hasPhotos ? true : undefined)}
            size="sm"
          />
          <Chip
            label="Has mood"
            icon={<Smile className="w-3.5 h-3.5" />}
            selected={Boolean(filters.hasMood)}
            onClick={() => setFilter('hasMood', !filters.hasMood ? true : undefined)}
            size="sm"
          />
          <Chip
            label="Has song"
            icon={<Music className="w-3.5 h-3.5" />}
            selected={Boolean(filters.hasSong)}
            onClick={() => setFilter('hasSong', !filters.hasSong ? true : undefined)}
            size="sm"
          />
          <Chip
            label="Bookmarked"
            icon={<Bookmark className="w-3.5 h-3.5" />}
            selected={Boolean(filters.bookmarked)}
            onClick={() => setFilter('bookmarked', !filters.bookmarked ? true : undefined)}
            size="sm"
          />

          {/* Folder filter dropdown */}
          <select
            value={filters.folderId || ''}
            onChange={(e) => setFilter('folderId', e.target.value || undefined)}
            className="bg-app-card border border-app-card-border rounded-full px-3 py-1 text-xs text-app-text-secondary focus:outline-none"
          >
            <option value="" className="bg-app-card text-app-text-primary">
              All Journals
            </option>
            {folders.map((f) => (
              <option key={f.id} value={f.id} className="bg-app-card text-app-text-primary">
                {f.name}
              </option>
            ))}
          </select>

          {/* Reset Filters button if any active */}
          {Object.keys(filters).length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-app-accent hover:underline font-medium ml-1 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Search Body Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-safe">
        <div className="max-w-2xl mx-auto">
          {/* Recent Searches (when query is empty and no results requested yet) */}
          {!query.trim() && Object.keys(filters).length === 0 && (
            <div>
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Recent Searches</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-app-text-secondary hover:text-app-text-primary transition text-xs font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <Chip
                        key={term}
                        label={term}
                        onClick={() => handleRunRecent(term)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results List */}
          {(query.trim() || Object.keys(filters).length > 0) && (
            <div>
              <div className="text-xs font-semibold text-app-text-secondary mb-3">
                {results.length} {results.length === 1 ? 'match' : 'matches'} found
              </div>

              {results.length === 0 ? (
                <div className="text-center py-16 text-app-text-secondary">
                  <p className="text-base font-semibold text-app-text-primary mb-1">No matching entries</p>
                  <p className="text-sm">Try searching with other words, phonetics, or check spelling.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map(({ entry, score, matchHighlights }) => (
                    <div
                      key={entry.id}
                      onClick={() => handleSelect(entry.id)}
                      className="p-4 rounded-[18px] bg-app-card hover:bg-black/5 dark:hover:bg-white/10 border border-app-card-border cursor-pointer transition shadow-[var(--color-card-shadow)]"
                    >
                      <div className="flex items-center justify-between text-[13px] text-app-text-secondary mb-1">
                        <span>{format(new Date(entry.entryDate), 'EEEE, d MMM yyyy')}</span>
                        {score > 0 && (
                          <span className="text-[11px] text-app-text-tertiary">
                            Score: {score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-[17px] font-semibold text-app-text-primary mb-1 tracking-tight">
                        {entry.title || 'Untitled Entry'}
                      </h4>

                      {/* Snippet with highlighted search matches */}
                      <p
                        className="text-[14px] text-app-text-secondary leading-relaxed line-clamp-2"
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
    </div>
  );
};
