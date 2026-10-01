import { create } from 'zustand';
import type { SearchFilters, SearchResultItem } from '../search/searchEngine';
import { searchEngine } from '../search/searchEngine';
import { useJournalStore } from './useJournalStore';
import { CONFIG } from '../config';

interface SearchState {
  isOpen: boolean;
  query: string;
  filters: SearchFilters;
  results: SearchResultItem[];
  recentSearches: string[];
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (q: string) => void;
  setFilter: (key: keyof SearchFilters, value: unknown) => void;
  clearFilters: () => void;
  executeSearch: () => void;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

const RECENT_KEY = 'reverie_recent_searches';

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: '',
  filters: {},
  results: [],
  recentSearches: loadRecentSearches(),

  openSearch: () => {
    set({ isOpen: true });
    get().executeSearch();
  },

  closeSearch: () => {
    set({ isOpen: false });
  },

  setQuery: (query: string) => {
    set({ query });
    get().executeSearch();
  },

  setFilter: (key, value) => {
    const next = { ...get().filters };
    if (value === undefined || value === null || value === '') {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    set({ filters: next });
    get().executeSearch();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().executeSearch();
  },

  executeSearch: () => {
    const { query, filters } = get();
    const entries = useJournalStore.getState().entries;
    const results = searchEngine.search(query, entries, filters);
    set({ results });
  },

  addRecentSearch: (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const current = get().recentSearches.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...current].slice(0, CONFIG.recentSearchesLimit);
    set({ recentSearches: next });
    saveRecentSearches(next);
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    saveRecentSearches([]);
  },
}));
