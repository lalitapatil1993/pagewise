import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_SIZE, searchBooks } from '../api.js';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const unique = (list) => {
  const seen = new Set();
  return list.filter((b) => !seen.has(b.id) && seen.add(b.id));
};

// Live, paginated catalog search. Falls back to `offline: true` when the service can't be reached.
export function useBooks({ query, category, sort }) {
  const q = useDebounced(query, 350);
  const [data, setData] = useState({ books: [], total: 0, page: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offline, setOffline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const c = new AbortController();
    generation.current += 1;
    setLoading(true);
    setLoadingMore(false);
    setData({ books: [], total: 0, page: 0 });
    searchBooks({ query: q, category, sort, page: 1 }, c.signal)
      .then(({ books, total }) => {
        setData({ books: unique(books), total, page: 1 });
        setOffline(false);
      })
      .catch(() => { if (!c.signal.aborted) setOffline(true); })
      .finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [q, category, sort === 'rating' || sort === 'new' ? sort : '', reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolves to false if the request failed
  const loadMore = useCallback(async () => {
    const g = generation.current;
    setLoadingMore(true);
    try {
      const { books, total } = await searchBooks({ query: q, category, sort, page: data.page + 1 });
      if (g !== generation.current) return true; // filters changed meanwhile
      setData((d) => ({ books: unique([...d.books, ...books]), total, page: d.page + 1 }));
      return true;
    } catch {
      return false;
    } finally {
      if (g === generation.current) setLoadingMore(false);
    }
  }, [q, category, sort, data.page]);

  return {
    books: data.books,
    total: data.total,
    loading,
    loadingMore,
    offline,
    canLoadMore: !offline && data.page * PAGE_SIZE < data.total,
    loadMore,
    reload: () => setReloadKey((k) => k + 1)
  };
}
