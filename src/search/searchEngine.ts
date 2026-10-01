import MiniSearch from 'minisearch';
import type { Entry } from '../types';
import { normaliseTerm, unicodeTokenizer } from './normalise';

export interface SearchDoc {
  id: string;
  title: string;
  plainText: string;
  tags: string;
  folderNames: string;
}

export interface SearchFilters {
  folderId?: string;
  tag?: string;
  bookmarked?: boolean;
  bookmarkedOnly?: boolean;
  pinnedOnly?: boolean;
  hasPhotos?: boolean;
  hasPhotosOnly?: boolean;
  hasMood?: boolean;
  hasSong?: boolean;
  moodValence?: number; // 0..6
  dateRange?: { start?: number; end?: number };
  dateStart?: number;
  dateEnd?: number;
}

export interface SearchResultItem {
  id: string;
  entry: Entry;
  score: number;
  matchSnippet: string;
  matchHighlights?: string;
  matchInTitle: boolean;
}

class SearchEngine {
  private miniSearch: MiniSearch<SearchDoc>;
  private docMap = new Map<string, SearchDoc>();

  constructor() {
    this.miniSearch = new MiniSearch<SearchDoc>({
      fields: ['title', 'tags', 'folderNames', 'plainText'],
      storeFields: ['id', 'title', 'plainText'],
      tokenize: (text) => unicodeTokenizer(text),
      processTerm: (term) => normaliseTerm(term),
      searchOptions: {
        boost: { title: 3, tags: 2, folderNames: 1.5, plainText: 1 },
        prefix: true,
        fuzzy: (term) => (term.length > 3 ? 0.2 : false),
        combineWith: 'AND',
      },
    });
  }

  public indexEntry(entry: Entry, folderNames: string = ''): void {
    if (entry.deletedAt) {
      this.removeEntry(entry.id);
      return;
    }

    const doc: SearchDoc = {
      id: entry.id,
      title: entry.title || '',
      plainText: entry.plainText || '',
      tags: (entry.tags || []).join(' '),
      folderNames: folderNames || '',
    };

    if (this.docMap.has(entry.id)) {
      this.miniSearch.discard(entry.id);
    }

    this.miniSearch.add(doc);
    this.docMap.set(entry.id, doc);
  }

  public updateEntry(entry: Entry, folderNames: string = ''): void {
    this.indexEntry(entry, folderNames);
  }

  public removeEntry(id: string): void {
    if (this.docMap.has(id)) {
      try {
        this.miniSearch.discard(id);
      } catch {
        // ignore if not present
      }
      this.docMap.delete(id);
    }
  }

  public clear(): void {
    this.miniSearch.removeAll();
    this.docMap.clear();
  }

  public search(
    query: string,
    entriesMap: Map<string, Entry>,
    filters?: SearchFilters
  ): SearchResultItem[] {
    const trimmedQuery = query.trim();

    // If query is empty, apply filters only to all non-deleted entries
    if (!trimmedQuery) {
      const results: SearchResultItem[] = [];
      entriesMap.forEach((entry) => {
        if (entry.deletedAt) return;
        if (this.matchesFilters(entry, filters)) {
          results.push({
            id: entry.id,
            entry,
            score: 1,
            matchSnippet: entry.snippet || '',
            matchHighlights: entry.snippet || '',
            matchInTitle: false,
          });
        }
      });
      return results;
    }

    let searchResults: Array<{ id: string; score: number; match: Record<string, string[]> }>;
    try {
      searchResults = this.miniSearch.search(trimmedQuery) as Array<{
        id: string;
        score: number;
        match: Record<string, string[]>;
      }>;
    } catch {
      searchResults = [];
    }

    const matchedItems: SearchResultItem[] = [];

    for (const res of searchResults) {
      const entry = entriesMap.get(res.id);
      if (!entry || entry.deletedAt) continue;

      if (!this.matchesFilters(entry, filters)) continue;

      const doc = this.docMap.get(res.id);
      const titleLower = (doc?.title || '').toLowerCase();
      const queryLower = trimmedQuery.toLowerCase();
      const matchInTitle = titleLower.includes(queryLower);

      // Centered snippet around matched term
      const snippet = this.createCenteredSnippet(doc?.plainText || '', trimmedQuery);

      // Highlight match in snippet using <mark>
      let matchHighlights = snippet;
      if (trimmedQuery.length > 0) {
        const regex = new RegExp(`(${trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        matchHighlights = snippet.replace(regex, '<mark class="bg-indigo-500/30 text-indigo-200 rounded px-0.5">$1</mark>');
      }

      matchedItems.push({
        id: res.id,
        entry,
        score: res.score,
        matchSnippet: snippet,
        matchHighlights,
        matchInTitle,
      });
    }

    return matchedItems;
  }

  private matchesFilters(entry: Entry, filters?: SearchFilters): boolean {
    if (!filters) return true;

    if (filters.folderId && !entry.folderIds.includes(filters.folderId)) {
      return false;
    }
    if (filters.tag && !entry.tags.includes(filters.tag.toLowerCase())) {
      return false;
    }
    if ((filters.bookmarked || filters.bookmarkedOnly) && !entry.bookmarked) {
      return false;
    }
    if (filters.pinnedOnly && !entry.pinned) {
      return false;
    }
    if ((filters.hasPhotos || filters.hasPhotosOnly) && (!entry.media || entry.media.length === 0)) {
      return false;
    }
    if (filters.hasMood && !entry.mood) {
      return false;
    }
    if (filters.hasSong && (!entry.songs || entry.songs.length === 0)) {
      return false;
    }
    if (filters.moodValence !== undefined && entry.mood?.valence !== filters.moodValence) {
      return false;
    }
    if (filters.dateRange?.start && entry.entryDate < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange?.end && entry.entryDate > filters.dateRange.end) {
      return false;
    }
    if (filters.dateStart && entry.entryDate < filters.dateStart) {
      return false;
    }
    if (filters.dateEnd && entry.entryDate > filters.dateEnd) {
      return false;
    }

    return true;
  }

  private createCenteredSnippet(plainText: string, query: string, maxLength: number = 110): string {
    if (!plainText) return '';
    const normText = plainText.toLowerCase();
    const normQuery = query.toLowerCase();

    const idx = normText.indexOf(normQuery);
    if (idx === -1) {
      return plainText.length > maxLength ? plainText.slice(0, maxLength) + '…' : plainText;
    }

    const start = Math.max(0, idx - 40);
    const end = Math.min(plainText.length, idx + query.length + 60);

    let snippet = plainText.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < plainText.length) snippet = snippet + '…';

    return snippet;
  }
}

export const searchEngine = new SearchEngine();
