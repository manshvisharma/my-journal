import { useState, useEffect } from 'react';
import type { MediaRef, MediaDoc } from '../../types';
import { repository } from '../../data/repository';

const mediaMemoryCache = new Map<string, MediaDoc>();

export function useMediaDocs(refs: MediaRef[] = []): { docs: MediaDoc[]; loading: boolean } {
  const [docs, setDocs] = useState<MediaDoc[]>(() => {
    return refs
      .map((r) => mediaMemoryCache.get(r.id))
      .filter((d): d is MediaDoc => Boolean(d));
  });
  const [loading, setLoading] = useState(docs.length < refs.length);

  useEffect(() => {
    let isMounted = true;
    const missing = refs.filter((r) => !mediaMemoryCache.has(r.id));

    if (missing.length === 0) {
      setDocs(
        refs.map((r) => mediaMemoryCache.get(r.id)).filter((d): d is MediaDoc => Boolean(d))
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(missing.map((r) => repository.getMedia(r.id))).then((results) => {
      if (!isMounted) return;
      results.forEach((doc) => {
        if (doc) {
          mediaMemoryCache.set(doc.id, doc);
        }
      });
      setDocs(
        refs.map((r) => mediaMemoryCache.get(r.id)).filter((d): d is MediaDoc => Boolean(d))
      );
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [refs]);

  return { docs, loading };
}
