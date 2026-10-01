export interface DraftContent {
  entryId: string;
  title: string;
  bodyJson: string;
  plainText: string;
  updatedAt: number;
}

const DRAFT_PREFIX = 'reverie_draft_';

export const draftBuffer = {
  saveDraft(entryId: string, title: string, bodyJson: string, plainText: string): void {
    if (!entryId) return;
    try {
      const draft: DraftContent = {
        entryId,
        title,
        bodyJson,
        plainText,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`${DRAFT_PREFIX}${entryId}`, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to mirror draft to local storage:', e);
    }
  },

  getDraft(entryId: string): DraftContent | null {
    try {
      const item = localStorage.getItem(`${DRAFT_PREFIX}${entryId}`);
      if (!item) return null;
      return JSON.parse(item) as DraftContent;
    } catch {
      return null;
    }
  },

  clearDraft(entryId: string): void {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${entryId}`);
    } catch {
      // ignore
    }
  },

  getAllDrafts(): DraftContent[] {
    const drafts: DraftContent[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            drafts.push(JSON.parse(item));
          }
        }
      }
    } catch {
      // ignore
    }
    return drafts;
  },
};
